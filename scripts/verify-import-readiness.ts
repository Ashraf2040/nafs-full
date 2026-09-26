import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import { Pool } from "pg";

config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const clean = (value: unknown) => String(value ?? "").trim();
const key = (grade: unknown, subject: unknown, outcome: unknown, indicator: unknown) =>
  [grade, subject, outcome, indicator].map(value => clean(value).toLowerCase()).join("|||");

async function main() {
  const dir = path.resolve("outputs", "quiz-cleanup");
  const indicatorCsv = await readFile(path.join(dir, "cleaned-indicators.csv"), "utf8");
  const quizCsvPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(dir, "cleaned-quizzes.csv");
  const quizCsv = await readFile(quizCsvPath, "utf8");
  const indicatorParsed = Papa.parse<Record<string, string>>(indicatorCsv, { header: true, skipEmptyLines: true });
  const quizParsed = Papa.parse<Record<string, string>>(quizCsv, { header: true, skipEmptyLines: true });
  if (indicatorParsed.errors.length || quizParsed.errors.length) throw new Error("CSV parser reported errors.");

  const indicatorHeaders = ["Grade", "Subject", "Sub-Domain", "Learning Outcome", "Indicator"];
  const quizHeaders = ["quiz_title", "subject", "grade", "description", "is_published", "due_date", "outcome_text", "indicator_text", "question", "option_1", "option_2", "option_3", "option_4", "answer", "explanation", "image_url", "bloom_level", "difficulty"];
  if (JSON.stringify(indicatorParsed.meta.fields) !== JSON.stringify(indicatorHeaders)) throw new Error("Indicator CSV headers are not import-compatible.");
  const actualQuizHeaders = quizParsed.meta.fields ?? [];
  const headersWithoutOptionalId = actualQuizHeaders[0] === "id" ? actualQuizHeaders.slice(1) : actualQuizHeaders;
  if (JSON.stringify(headersWithoutOptionalId) !== JSON.stringify(quizHeaders)) throw new Error("Quiz CSV headers are not import-compatible.");
  if (actualQuizHeaders[0] === "id") {
    const ids = quizParsed.data.map(row => clean(row.id));
    if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error("Question IDs are missing or duplicated.");
  }

  const indicatorKeys = new Set<string>();
  for (const row of indicatorParsed.data) {
    if (!clean(row.Grade) || !clean(row.Subject) || !clean(row["Learning Outcome"]) || !clean(row.Indicator)) throw new Error("Indicator CSV has missing required data.");
    const rowKey = key(row.Grade, row.Subject, row["Learning Outcome"], row.Indicator);
    if (indicatorKeys.has(rowKey)) throw new Error("Indicator CSV has an exact duplicate.");
    indicatorKeys.add(rowKey);
  }

  const invalidQuizRows: number[] = [];
  quizParsed.data.forEach((row, index) => {
    if (!["quiz_title", "subject", "grade", "outcome_text", "indicator_text", "question", "answer"].every(field => clean(row[field]))) invalidQuizRows.push(index + 2);
    if (!indicatorKeys.has(key(row.grade, row.subject, row.outcome_text, row.indicator_text))) invalidQuizRows.push(index + 2);
  });
  if (invalidQuizRows.length) throw new Error(`Quiz CSV has ${new Set(invalidQuizRows).size} unresolved rows.`);

  const [outcomes, quizzes] = await Promise.all([
    prisma.learningOutcome.findMany({ select: { id: true, grade: true, subject: true, outcomeText: true, indicatorText: true } }),
    prisma.quiz.findMany({
      select: {
        id: true,
        subject: { select: { name: true } },
        grade: { select: { level: true } },
        outcomeId: true,
        outcome: { select: { subject: true, grade: true, outcomeText: true } },
        questions: { select: { learningOutcomeId: true, learningOutcome: { select: { subject: true, grade: true, outcomeText: true } } } },
      },
    }),
  ]);
  const databaseKeys = new Set(outcomes.map(item => key(item.grade, item.subject, item.outcomeText, item.indicatorText)));
  const missingFromDatabase = [...indicatorKeys].filter(item => !databaseKeys.has(item));
  if (missingFromDatabase.length) throw new Error(`${missingFromDatabase.length} CSV indicators do not resolve exactly in the database.`);

  const invalidDatabaseQuizzes = quizzes.filter(quiz =>
    !quiz.outcomeId || !quiz.outcome || quiz.outcome.subject !== quiz.subject.name || quiz.outcome.grade !== quiz.grade.level ||
    quiz.questions.some(question => !question.learningOutcomeId || !question.learningOutcome || question.learningOutcome.subject !== quiz.subject.name || question.learningOutcome.grade !== quiz.grade.level),
  );
  if (invalidDatabaseQuizzes.length) throw new Error(`${invalidDatabaseQuizzes.length} database quizzes still have invalid mappings.`);

  const usedIndicatorIds = new Set(quizzes.flatMap(quiz => quiz.questions.map(question => question.learningOutcomeId!)));
  const indicatorFilterFailures: string[] = [];
  const indicatorIds = [...usedIndicatorIds];
  for (let index = 0; index < indicatorIds.length; index += 30) {
    const results = await Promise.all(indicatorIds.slice(index, index + 30).map(async indicatorId => ({
      indicatorId,
      count: await prisma.quiz.count({
        where: { OR: [{ outcomeId: indicatorId }, { questions: { some: { learningOutcomeId: indicatorId } } }] },
      }),
    })));
    indicatorFilterFailures.push(...results.filter(item => item.count === 0).map(item => item.indicatorId));
  }
  if (indicatorFilterFailures.length) throw new Error("Indicator filter simulation failed.");

  const usedOutcomeGroups = new Map<string, typeof outcomes>();
  for (const outcome of outcomes.filter(item => usedIndicatorIds.has(item.id))) {
    const groupKey = [outcome.subject, outcome.grade, outcome.outcomeText].map(value => clean(value).toLowerCase()).join("|||");
    usedOutcomeGroups.set(groupKey, outcomes.filter(candidate =>
      candidate.subject === outcome.subject && candidate.grade === outcome.grade && candidate.outcomeText === outcome.outcomeText,
    ));
  }
  const outcomeGroups = [...usedOutcomeGroups.values()];
  for (let index = 0; index < outcomeGroups.length; index += 30) {
    const results = await Promise.all(outcomeGroups.slice(index, index + 30).map(async group => {
      const ids = group.map(item => item.id);
      return prisma.quiz.count({ where: { OR: [{ outcomeId: { in: ids } }, { questions: { some: { learningOutcomeId: { in: ids } } } }] } });
    }));
    if (results.some(count => count === 0)) throw new Error("Outcome filter simulation failed.");
  }

  console.log(JSON.stringify({
    readyToImport: true,
    indicatorRows: indicatorParsed.data.length,
    quizQuestionRows: quizParsed.data.length,
    quizzes: quizzes.length,
    databaseIndicators: outcomes.length,
    subjectFilterTotal: quizzes.length,
    testedOutcomeFilters: usedOutcomeGroups.size,
    testedIndicatorFilters: usedIndicatorIds.size,
    invalidDatabaseMappings: invalidDatabaseQuizzes.length,
    csvParserErrors: 0,
  }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
