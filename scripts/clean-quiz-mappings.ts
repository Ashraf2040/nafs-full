import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createObjectCsvWriter } from "csv-writer";
import { config } from "dotenv";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const outputDir = path.resolve("outputs", "quiz-cleanup");
const shouldApply = process.argv.includes("--apply");

const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "between", "by", "for", "from", "his", "her",
  "how", "in", "into", "is", "it", "its", "of", "on", "or", "that", "the", "their", "them",
  "this", "to", "using", "which", "with", "within", "grade", "math", "science", "english", "quiz",
  "set", "understanding", "identifying", "distinguishing", "describing", "explaining", "determining",
]);

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .toLowerCase()
    .replace(/\b\d+(?:[.-]\d+){2,}\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(token: string): string {
  if (token.length > 6 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 6 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 5 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function tokenSet(value: unknown): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .map(stem)
      .filter((token) => token.length > 1 && !stopWords.has(token) && !/^\d+$/.test(token)),
  );
}

function similarity(query: unknown, target: unknown): number {
  const left = tokenSet(query);
  const right = tokenSet(target);
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  const queryCoverage = overlap / left.size;
  const targetCoverage = overlap / right.size;
  const cosine = overlap / Math.sqrt(left.size * right.size);
  return queryCoverage * 0.55 + cosine * 0.3 + targetCoverage * 0.15;
}

function titleCore(title: string): string {
  return title
    .replace(/^\s*(English|Math|Science)\s+G\d+\s*:\s*/i, "")
    .replace(/\s+-\s+(English|Math|Science)\s*\(Grade\s*\d+\).*$/i, "")
    .replace(/\s+-\s*Set\s*\d+.*$/i, "")
    .replace(/\s+T\d+$/i, "")
    .trim();
}

function cleanCsvValue(value: unknown): string {
  return String(value ?? "").trim();
}

function optionValues(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(cleanCsvValue).filter(Boolean);
}

function outcomeKey(subject: string, grade: number, outcomeText: string): string {
  return `${normalize(subject)}|||${grade}|||${normalize(outcomeText)}`;
}

async function main() {
  const [outcomes, quizzes] = await Promise.all([
    prisma.learningOutcome.findMany({
      orderBy: [{ subject: "asc" }, { grade: "asc" }, { outcomeText: "asc" }, { indicatorText: "asc" }],
    }),
    prisma.quiz.findMany({
      orderBy: [{ subject: { name: "asc" } }, { grade: { level: "asc" } }, { title: "asc" }],
      include: {
        subject: { select: { name: true } },
        grade: { select: { level: true } },
        questions: { orderBy: { createdAt: "asc" } },
      },
    }),
  ]);

  await mkdir(outputDir, { recursive: true });
  const backupPath = path.join(outputDir, "database-backup-before-cleanup.json");
  try {
    await access(backupPath);
  } catch {
    await writeFile(
      backupPath,
      JSON.stringify({ generatedAt: new Date().toISOString(), outcomes, quizzes }, null, 2),
      "utf8",
    );
  }

  const duplicateKeys = new Map<string, string[]>();
  for (const outcome of outcomes) {
    const key = `${outcomeKey(outcome.subject, outcome.grade, outcome.outcomeText)}|||${normalize(outcome.indicatorText)}`;
    duplicateKeys.set(key, [...(duplicateKeys.get(key) ?? []), outcome.id]);
  }
  const exactDuplicates = [...duplicateKeys.values()].filter((ids) => ids.length > 1);
  if (exactDuplicates.length > 0) {
    throw new Error(`Found ${exactDuplicates.length} exact duplicate indicator groups. Cleanup stopped before database changes.`);
  }

  const outcomesByScope = new Map<string, typeof outcomes>();
  for (const outcome of outcomes) {
    const key = `${normalize(outcome.subject)}|||${outcome.grade}`;
    outcomesByScope.set(key, [...(outcomesByScope.get(key) ?? []), outcome]);
  }

  const mappings = quizzes.map((quiz) => {
    const scopeKey = `${normalize(quiz.subject.name)}|||${quiz.grade.level}`;
    const scoped = outcomesByScope.get(scopeKey) ?? [];
    if (scoped.length === 0) throw new Error(`No indicators for ${quiz.subject.name} Grade ${quiz.grade.level}`);

    const groups = new Map<string, typeof outcomes>();
    for (const outcome of scoped) {
      const key = outcomeKey(outcome.subject, outcome.grade, outcome.outcomeText);
      groups.set(key, [...(groups.get(key) ?? []), outcome]);
    }

    const core = titleCore(quiz.title);
    const questionCorpus = quiz.questions
      .map((question) => `${question.questionText} ${question.correctAnswer} ${question.explanation ?? ""}`)
      .join(" ");
    const rankedGroups = [...groups.values()]
      .map((group) => {
        const representative = group[0];
        const indicatorCorpus = group.map((item) => item.indicatorText).join(" ");
        const titleScore = similarity(core, `${representative.outcomeText} ${indicatorCorpus}`);
        const contentScore = similarity(questionCorpus, `${representative.outcomeText} ${indicatorCorpus}`);
        return { group, score: titleScore * 0.82 + contentScore * 0.18, titleScore, contentScore };
      })
      .sort((a, b) => b.score - a.score);

    const selectedGroup = rankedGroups[0];
    if (!selectedGroup) throw new Error(`Unable to map quiz ${quiz.title}`);
    const groupMargin = selectedGroup.score - (rankedGroups[1]?.score ?? 0);

    const titleIndicatorRanking = selectedGroup.group
      .map((indicator) => ({ indicator, score: similarity(core, `${indicator.outcomeText} ${indicator.indicatorText}`) }))
      .sort((a, b) => b.score - a.score);
    const titleIndicator = titleIndicatorRanking[0]!.indicator;

    const questionMappings = quiz.questions.map((question) => {
      const options = optionValues(question.options);
      const corpus = [question.questionText, question.correctAnswer, question.explanation, ...options].filter(Boolean).join(" ");
      const ranked = selectedGroup.group
        .map((indicator) => ({ indicator, score: similarity(corpus, `${indicator.outcomeText} ${indicator.indicatorText}`) }))
        .sort((a, b) => b.score - a.score);
      const best = ranked[0]!;
      const margin = best.score - (ranked[1]?.score ?? 0);
      const globalRanked = scoped
        .map((indicator) => ({ indicator, score: similarity(corpus, `${indicator.outcomeText} ${indicator.indicatorText}`) }))
        .sort((a, b) => b.score - a.score);
      const globalBest = globalRanked[0]!;
      const baseSelected = best.score >= 0.12 && margin >= 0.015
          ? best.indicator
          : titleIndicator;
      const baseScore = baseSelected.id === best.indicator.id ? best.score : similarity(corpus, `${baseSelected.outcomeText} ${baseSelected.indicatorText}`);
      const isStrongGlobalMatch =
        globalBest.indicator.id !== baseSelected.id &&
        globalBest.score >= 0.2 &&
        globalBest.score - baseScore >= 0.06;
      const selected = isStrongGlobalMatch ? globalBest.indicator : baseSelected;
      const selectedScore = isStrongGlobalMatch ? globalBest.score : baseScore;
      return {
        question,
        selected,
        score: selectedScore,
        margin: isStrongGlobalMatch
          ? globalBest.score - (globalRanked[1]?.score ?? 0)
          : selected.id === best.indicator.id ? margin : titleIndicatorRanking[0]!.score - (titleIndicatorRanking[1]?.score ?? 0),
        selectionSource: isStrongGlobalMatch ? "GLOBAL_CONTENT" : selected.id === best.indicator.id ? "QUESTION_CONTENT" : "QUIZ_TITLE",
      };
    });

    const counts = new Map<string, number>();
    for (const mapping of questionMappings) counts.set(mapping.selected.id, (counts.get(mapping.selected.id) ?? 0) + 1);
    const primaryId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? titleIndicator.id;
    const primary = selectedGroup.group.find((indicator) => indicator.id === primaryId) ?? titleIndicator;

    return {
      quiz,
      primary,
      questionMappings,
      groupScore: selectedGroup.score,
      groupMargin,
      priorOutcomeId: quiz.outcomeId,
    };
  });

  const indicatorsCsv = createObjectCsvWriter({
    path: path.join(outputDir, "cleaned-indicators.csv"),
    header: [
      { id: "grade", title: "Grade" },
      { id: "subject", title: "Subject" },
      { id: "subDomain", title: "Sub-Domain" },
      { id: "outcomeText", title: "Learning Outcome" },
      { id: "indicatorText", title: "Indicator" },
    ],
    alwaysQuote: true,
  });
  await indicatorsCsv.writeRecords(outcomes.map((item) => ({
    grade: item.grade,
    subject: item.subject.trim(),
    subDomain: item.subDomain?.trim() ?? "",
    outcomeText: item.outcomeText.trim(),
    indicatorText: item.indicatorText.trim(),
  })));

  const quizRows = mappings.flatMap((mapping) => mapping.questionMappings.map(({ question, selected }) => {
    const options = optionValues(question.options);
    return {
      quiz_title: mapping.quiz.title,
      subject: mapping.quiz.subject.name,
      grade: mapping.quiz.grade.level,
      description: mapping.quiz.description ?? "",
      is_published: mapping.quiz.isPublished,
      due_date: mapping.quiz.dueDate?.toISOString() ?? "",
      outcome_text: selected.outcomeText,
      indicator_text: selected.indicatorText,
      question: question.questionText,
      option_1: options[0] ?? "",
      option_2: options[1] ?? "",
      option_3: options[2] ?? "",
      option_4: options[3] ?? "",
      answer: question.correctAnswer,
      explanation: question.explanation ?? "",
      image_url: question.imageUrl ?? "",
      bloom_level: question.bloomLevel ?? "",
      difficulty: question.difficulty ?? "",
    };
  }));

  const quizzesCsv = createObjectCsvWriter({
    path: path.join(outputDir, "cleaned-quizzes.csv"),
    header: [
      "quiz_title", "subject", "grade", "description", "is_published", "due_date", "outcome_text",
      "indicator_text", "question", "option_1", "option_2", "option_3", "option_4", "answer",
      "explanation", "image_url", "bloom_level", "difficulty",
    ].map((id) => ({ id, title: id })),
    alwaysQuote: true,
  });
  await quizzesCsv.writeRecords(quizRows);

  if (shouldApply) {
    const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
    const quizValues = mappings.map((mapping) => `(${quote(mapping.quiz.id)}, ${quote(mapping.primary.id)})`).join(",");
    await prisma.$executeRawUnsafe(
      `UPDATE "Quiz" AS target SET "outcomeId" = source.outcome_id FROM (VALUES ${quizValues}) AS source(id, outcome_id) WHERE target.id = source.id`,
    );
    const questionValues = mappings.flatMap((mapping) =>
      mapping.questionMappings.map(({ question, selected }) => ({ id: question.id, outcomeId: selected.id })),
    );
    for (let index = 0; index < questionValues.length; index += 500) {
      const values = questionValues.slice(index, index + 500)
        .map((item) => `(${quote(item.id)}, ${quote(item.outcomeId)})`).join(",");
      await prisma.$executeRawUnsafe(
        `UPDATE "Question" AS target SET "learningOutcomeId" = source.outcome_id FROM (VALUES ${values}) AS source(id, outcome_id) WHERE target.id = source.id`,
      );
    }
  }

  const verification = shouldApply
    ? await prisma.quiz.findMany({
        select: {
          id: true,
          outcomeId: true,
          subject: { select: { name: true } },
          grade: { select: { level: true } },
          outcome: { select: { subject: true, grade: true, outcomeText: true } },
          questions: { select: { learningOutcomeId: true, learningOutcome: { select: { subject: true, grade: true, outcomeText: true } } } },
        },
      })
    : [];

  const invalidQuizzes = verification.filter((quiz) =>
    !quiz.outcomeId || !quiz.outcome || quiz.outcome.subject !== quiz.subject.name || quiz.outcome.grade !== quiz.grade.level,
  );
  const invalidQuestions = verification.flatMap((quiz) => quiz.questions.filter((question) =>
    !question.learningOutcomeId || !question.learningOutcome ||
    question.learningOutcome.subject !== quiz.subject.name || question.learningOutcome.grade !== quiz.grade.level,
  ));

  const diagnostics = {
    generatedAt: new Date().toISOString(),
    applied: shouldApply,
    indicatorCount: outcomes.length,
    quizCount: mappings.length,
    questionCount: quizRows.length,
    remappedQuizCount: mappings.filter((item) => item.priorOutcomeId !== item.primary.id).length,
    questionContentMappingCount: mappings.flatMap((item) => item.questionMappings).filter((item) => item.selectionSource === "QUESTION_CONTENT").length,
    quizTitleFallbackCount: mappings.flatMap((item) => item.questionMappings).filter((item) => item.selectionSource === "QUIZ_TITLE").length,
    lowConfidenceOutcomeCount: mappings.filter((item) => item.groupScore < 0.35 || item.groupMargin < 0.04).length,
    exactDuplicateIndicatorGroups: exactDuplicates.length,
    invalidQuizMappingsAfterApply: invalidQuizzes.length,
    invalidQuestionMappingsAfterApply: invalidQuestions.length,
    outcomeFilterGroups: new Set(mappings.map((item) => outcomeKey(item.primary.subject, item.primary.grade, item.primary.outcomeText))).size,
    indicatorFilterValues: new Set(mappings.flatMap((item) => item.questionMappings.map((question) => question.selected.id))).size,
    quizMappings: mappings.map((item) => ({
      quizId: item.quiz.id,
      title: item.quiz.title,
      subject: item.quiz.subject.name,
      grade: item.quiz.grade.level,
      priorOutcomeId: item.priorOutcomeId,
      mappedOutcomeId: item.primary.id,
      mappedOutcomeText: item.primary.outcomeText,
      primaryIndicatorText: item.primary.indicatorText,
      outcomeScore: Number(item.groupScore.toFixed(4)),
      outcomeMargin: Number(item.groupMargin.toFixed(4)),
      distinctQuestionIndicators: new Set(item.questionMappings.map((question) => question.selected.id)).size,
    })),
  };
  await writeFile(path.join(outputDir, "cleanup-verification.json"), JSON.stringify(diagnostics, null, 2), "utf8");
  console.log(JSON.stringify({ ...diagnostics, quizMappings: undefined }, null, 2));

  if (shouldApply && (invalidQuizzes.length > 0 || invalidQuestions.length > 0)) {
    throw new Error("Post-cleanup verification found invalid mappings.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
