import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const outputDir = path.resolve("outputs", "quiz-mapping-audit");

function outcomeGroupKey(outcome: {
  subject: string;
  grade: number;
  outcomeText: string;
}) {
  return `${outcome.subject.trim().toLowerCase()}|||${outcome.grade}|||${outcome.outcomeText.trim().toLowerCase()}`;
}

const ignoredTitleTokens = new Set([
  "english", "math", "science", "grade", "assessment", "quiz", "set",
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/\bg\d+\b/g, " ")
    .replace(/\bgrade\s*\d+\b/g, " ")
    .replace(/\bset\s*\d+\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1 && !ignoredTitleTokens.has(token) && !/^\d+$/.test(token));
}

function titleMatchScore(title: string, indicatorText: string): number {
  const titleTokens = [...new Set(tokens(title))];
  const indicatorTokens = new Set(tokens(indicatorText));
  if (titleTokens.length === 0) return 0;
  const matches = titleTokens.filter((token) => indicatorTokens.has(token)).length;
  return matches / titleTokens.length;
}

async function main() {
  const [outcomes, quizzes] = await Promise.all([
    prisma.learningOutcome.findMany({
      orderBy: [{ subject: "asc" }, { grade: "asc" }, { outcomeText: "asc" }, { indicatorText: "asc" }],
      select: {
        id: true,
        subject: true,
        grade: true,
        subDomain: true,
        outcomeText: true,
        indicatorText: true,
        createdAt: true,
        _count: { select: { quizzes: true, questions: true } },
      },
    }),
    prisma.quiz.findMany({
      orderBy: [{ subject: { name: "asc" } }, { grade: { level: "asc" } }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        isPublished: true,
        subject: { select: { name: true } },
        grade: { select: { level: true } },
        outcomeId: true,
        outcome: {
          select: {
            id: true,
            subject: true,
            grade: true,
            subDomain: true,
            outcomeText: true,
            indicatorText: true,
          },
        },
        questions: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            questionText: true,
            learningOutcomeId: true,
            learningOutcome: {
              select: {
                id: true,
                subject: true,
                grade: true,
                subDomain: true,
                outcomeText: true,
                indicatorText: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const groupSizes = new Map<string, number>();
  const outcomesByScope = new Map<string, typeof outcomes>();
  const directOutcomeUsage = new Map<string, number>();
  for (const outcome of outcomes) {
    const key = outcomeGroupKey(outcome);
    groupSizes.set(key, (groupSizes.get(key) ?? 0) + 1);
    const scopeKey = `${outcome.subject}|||${outcome.grade}`;
    const scoped = outcomesByScope.get(scopeKey) ?? [];
    scoped.push(outcome);
    outcomesByScope.set(scopeKey, scoped);
  }
  for (const quiz of quizzes) {
    if (quiz.outcomeId) {
      directOutcomeUsage.set(quiz.outcomeId, (directOutcomeUsage.get(quiz.outcomeId) ?? 0) + 1);
    }
  }

  const quizMappings = quizzes.map((quiz) => {
    const linkedQuestionOutcomes = quiz.questions
      .map((question) => question.learningOutcome)
      .filter((outcome): outcome is NonNullable<typeof outcome> => Boolean(outcome));
    const uniqueLinkedOutcomes = [...new Map(linkedQuestionOutcomes.map((outcome) => [outcome.id, outcome])).values()];
    const linkedGroups = new Set(uniqueLinkedOutcomes.map(outcomeGroupKey));
    const directGroup = quiz.outcome ? outcomeGroupKey(quiz.outcome) : null;
    const reasons: string[] = [];
    const reviewReasons: string[] = [];
    const candidates = (outcomesByScope.get(`${quiz.subject.name}|||${quiz.grade.level}`) ?? [])
      .map((outcome) => ({ outcome, score: titleMatchScore(quiz.title, outcome.indicatorText) }))
      .sort((left, right) => right.score - left.score);
    const recommended = candidates[0];
    const secondBestScore = candidates[1]?.score ?? 0;
    const recommendationIsReliable = Boolean(
      recommended && recommended.score >= 0.6 && recommended.score - secondBestScore >= 0.05,
    );

    if (!quiz.outcomeId) reasons.push("Quiz has no direct outcome link");
    if (quiz.outcome && quiz.outcome.subject !== quiz.subject.name) {
      reasons.push(`Direct outcome subject is ${quiz.outcome.subject}, quiz subject is ${quiz.subject.name}`);
    }
    if (quiz.outcome && quiz.outcome.grade !== quiz.grade.level) {
      reasons.push(`Direct outcome grade is ${quiz.outcome.grade}, quiz grade is ${quiz.grade.level}`);
    }

    const questionsWithoutIndicator = quiz.questions.filter((question) => !question.learningOutcomeId).length;
    if (questionsWithoutIndicator > 0) {
      reasons.push(`${questionsWithoutIndicator} of ${quiz.questions.length} questions have no indicator link`);
    }

    const wrongScopeQuestionLinks = linkedQuestionOutcomes.filter(
      (outcome) => outcome.subject !== quiz.subject.name || outcome.grade !== quiz.grade.level,
    ).length;
    if (wrongScopeQuestionLinks > 0) {
      reasons.push(`${wrongScopeQuestionLinks} question links use a different subject or grade`);
    }

    if (directGroup && linkedGroups.size > 0 && !linkedGroups.has(directGroup)) {
      reasons.push("Question indicators belong to a different outcome than the quiz direct link");
    }
    if (recommendationIsReliable && recommended.outcome.id !== quiz.outcomeId) {
      reasons.push("Quiz title matches a different imported indicator than the current database link");
    }
    if (!recommendationIsReliable && quiz.outcomeId && (directOutcomeUsage.get(quiz.outcomeId) ?? 0) > 5) {
      reviewReasons.push(
        `Current indicator is shared by ${directOutcomeUsage.get(quiz.outcomeId)} quizzes; title match is not strong enough for an automatic suggestion`,
      );
    }

    const mappedGroupSize = quiz.outcome
      ? groupSizes.get(outcomeGroupKey(quiz.outcome)) ?? 0
      : uniqueLinkedOutcomes.reduce((maximum, outcome) => Math.max(maximum, groupSizes.get(outcomeGroupKey(outcome)) ?? 0), 0);

    return {
      quizId: quiz.id,
      title: quiz.title,
      subject: quiz.subject.name,
      grade: quiz.grade.level,
      isPublished: quiz.isPublished,
      createdAt: quiz.createdAt.toISOString(),
      questionCount: quiz.questions.length,
      quizOutcomeId: quiz.outcomeId ?? "",
      quizOutcomeText: quiz.outcome?.outcomeText ?? "",
      quizOutcomeIndicator: quiz.outcome?.indicatorText ?? "",
      linkedQuestionCount: quiz.questions.length - questionsWithoutIndicator,
      unlinkedQuestionCount: questionsWithoutIndicator,
      uniqueLinkedIndicatorCount: uniqueLinkedOutcomes.length,
      availableIndicatorsInOutcome: mappedGroupSize,
      linkedIndicatorIds: uniqueLinkedOutcomes.map((outcome) => outcome.id).join(" | "),
      linkedIndicatorTexts: uniqueLinkedOutcomes.map((outcome) => outcome.indicatorText).join(" | "),
      recommendedIndicatorId: recommendationIsReliable ? recommended.outcome.id : "",
      recommendedOutcomeText: recommendationIsReliable ? recommended.outcome.outcomeText : "",
      recommendedIndicatorText: recommendationIsReliable ? recommended.outcome.indicatorText : "",
      recommendedMatchScore: recommendationIsReliable ? Number(recommended.score.toFixed(3)) : "",
      recommendationConfidence: recommendationIsReliable
        ? recommended.score >= 0.85 ? "HIGH" : "MEDIUM"
        : "LOW",
      outcomeFilterReady: Boolean(quiz.outcomeId || uniqueLinkedOutcomes.length),
      indicatorFilterReady: uniqueLinkedOutcomes.length > 0,
      mappingStatus: reasons.length > 0 ? "MISMATCH" : reviewReasons.length > 0 ? "REVIEW" : "OK",
      mismatchReasons: [...reasons, ...reviewReasons].join("; "),
    };
  });

  const quizMappingById = new Map(quizMappings.map((quiz) => [quiz.quizId, quiz]));
  const questionMappings = quizzes.flatMap((quiz) =>
    quiz.questions.map((question, index) => {
      const quizMapping = quizMappingById.get(quiz.id);
      const structuralStatus = !question.learningOutcomeId
        ? "MISSING INDICATOR"
        : question.learningOutcome?.subject !== quiz.subject.name || question.learningOutcome?.grade !== quiz.grade.level
          ? "SCOPE MISMATCH"
          : null;
      return {
        quizId: quiz.id,
        quizTitle: quiz.title,
        subject: quiz.subject.name,
        grade: quiz.grade.level,
        questionNumber: index + 1,
        questionId: question.id,
        questionText: question.questionText,
        indicatorId: question.learningOutcomeId ?? "",
        indicatorSubject: question.learningOutcome?.subject ?? "",
        indicatorGrade: question.learningOutcome?.grade ?? "",
        outcomeText: question.learningOutcome?.outcomeText ?? "",
        indicatorText: question.learningOutcome?.indicatorText ?? "",
        recommendedIndicatorId: quizMapping?.recommendedIndicatorId ?? "",
        recommendedIndicatorText: quizMapping?.recommendedIndicatorText ?? "",
        mappingStatus: structuralStatus ?? quizMapping?.mappingStatus ?? "REVIEW",
      };
    }),
  );

  const importedIndicators = outcomes.map((outcome) => ({
    indicatorId: outcome.id,
    subject: outcome.subject,
    grade: outcome.grade,
    subDomain: outcome.subDomain ?? "",
    outcomeText: outcome.outcomeText,
    indicatorText: outcome.indicatorText,
    directQuizCount: outcome._count.quizzes,
    linkedQuestionCount: outcome._count.questions,
    filterReferenceCount: outcome._count.quizzes + outcome._count.questions,
    mappingStatus: outcome._count.quizzes + outcome._count.questions > 0 ? "USED" : "UNUSED",
    importedAt: outcome.createdAt.toISOString(),
  }));

  const mismatches = quizMappings.filter((quiz) => quiz.mappingStatus !== "OK");
  const summary = {
    generatedAt: new Date().toISOString(),
    indicatorCount: importedIndicators.length,
    usedIndicatorCount: importedIndicators.filter((item) => item.mappingStatus === "USED").length,
    unusedIndicatorCount: importedIndicators.filter((item) => item.mappingStatus === "UNUSED").length,
    quizCount: quizMappings.length,
    mappedQuizCount: quizMappings.filter((quiz) => quiz.mappingStatus === "OK").length,
    mismatchQuizCount: quizMappings.filter((quiz) => quiz.mappingStatus === "MISMATCH").length,
    reviewQuizCount: quizMappings.filter((quiz) => quiz.mappingStatus === "REVIEW").length,
    issueQuizCount: mismatches.length,
    reliableSuggestedRemapCount: quizMappings.filter((quiz) => Boolean(quiz.recommendedIndicatorId)).length,
    currentLinkDiffersFromSuggestionCount: quizMappings.filter(
      (quiz) => quiz.recommendedIndicatorId && quiz.recommendedIndicatorId !== quiz.quizOutcomeId,
    ).length,
    quizzesWithoutDirectOutcome: quizMappings.filter((quiz) => !quiz.quizOutcomeId).length,
    quizzesWithoutIndicatorLinks: quizMappings.filter((quiz) => !quiz.indicatorFilterReady).length,
    questionCount: questionMappings.length,
    unlinkedQuestionCount: questionMappings.filter((question) => !question.indicatorId).length,
    scopeMismatchQuestionCount: questionMappings.filter((question) => question.mappingStatus === "SCOPE MISMATCH").length,
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    path.join(outputDir, "audit-data.json"),
    JSON.stringify({ summary, importedIndicators, quizMappings, questionMappings, mismatches }, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(summary, null, 2));
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
