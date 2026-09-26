import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const ignored = new Set(["a", "an", "and", "are", "as", "at", "be", "between", "by", "for", "from", "his", "her", "how", "in", "into", "is", "it", "its", "of", "on", "or", "that", "the", "their", "them", "this", "to", "using", "which", "with", "within", "grade", "math", "science", "english", "quiz", "set", "understanding", "identifying", "distinguishing", "describing", "explaining", "determining"]);
const stem = (token: string) => token.length > 6 && token.endsWith("ies") ? `${token.slice(0, -3)}y` : token.length > 6 && token.endsWith("ing") ? token.slice(0, -3) : token.length > 5 && token.endsWith("ed") ? token.slice(0, -2) : token.length > 5 && token.endsWith("es") ? token.slice(0, -2) : token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token;
const tokens = (value: unknown) => new Set(String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b\d+(?:[.-]\d+){2,}\b/g, " ").replace(/[^a-z0-9]+/g, " ").split(/\s+/).map(stem).filter(token => token.length > 1 && !ignored.has(token) && !/^\d+$/.test(token)));
function score(leftValue: unknown, rightValue: unknown) {
  const left = tokens(leftValue); const right = tokens(rightValue);
  if (!left.size || !right.size) return 0;
  let overlap = 0; for (const token of left) if (right.has(token)) overlap++;
  return overlap / left.size * 0.55 + overlap / Math.sqrt(left.size * right.size) * 0.3 + overlap / right.size * 0.15;
}

async function main() {
  const [outcomes, quizzes] = await Promise.all([
    prisma.learningOutcome.findMany(),
    prisma.quiz.findMany({
      where: { subject: { name: { in: ["Math", "Science"] } } },
      include: { subject: true, grade: true, outcome: true, questions: { include: { learningOutcome: true } } },
    }),
  ]);
  const strongAlternative: object[] = [];
  let scopeAlignedQuestions = 0;
  let contentVerifiedQuestions = 0;
  let contextAlignedQuestions = 0;
  let totalQuestions = 0;
  for (const quiz of quizzes) {
    const candidates = outcomes.filter(item => item.subject === quiz.subject.name && item.grade === quiz.grade.level);
    for (const question of quiz.questions) {
      totalQuestions++;
      if (question.learningOutcome?.subject === quiz.subject.name && question.learningOutcome?.grade === quiz.grade.level) scopeAlignedQuestions++;
      const corpus = [question.questionText, question.correctAnswer, question.explanation, ...(Array.isArray(question.options) ? question.options : [])].join(" ");
      const ranked = candidates.map(item => ({ item, score: score(corpus, `${item.outcomeText} ${item.indicatorText}`) })).sort((a, b) => b.score - a.score);
      const selectedScore = score(corpus, `${question.learningOutcome?.outcomeText} ${question.learningOutcome?.indicatorText}`);
      const best = ranked[0];
      if (best && question.learningOutcomeId === best.item.id && best.score >= 0.1) contentVerifiedQuestions++;
      else if (question.learningOutcome?.subject === quiz.subject.name && question.learningOutcome?.grade === quiz.grade.level) contextAlignedQuestions++;
      if (best && best.item.id !== question.learningOutcomeId && best.score >= 0.2 && best.score - selectedScore >= 0.06) {
        strongAlternative.push({ quiz: quiz.title, question: question.questionText, current: question.learningOutcome?.indicatorText, suggested: best.item.indicatorText, selectedScore, suggestedScore: best.score });
      }
    }
  }
  const report = {
    subjects: ["Math", "Science"],
    quizzesChecked: quizzes.length,
    questionsChecked: totalQuestions,
    scopeAlignedQuestions,
    contentVerifiedQuestions,
    contextAlignedQuestions,
    strongAlternativeCount: strongAlternative.length,
    ready: scopeAlignedQuestions === totalQuestions && strongAlternative.length === 0,
    strongAlternatives: strongAlternative,
  };
  await writeFile(path.resolve("outputs", "quiz-cleanup", "teacher-alignment-verification.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ ...report, strongAlternatives: undefined }, null, 2));
  if (!report.ready) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); await pool.end(); });
