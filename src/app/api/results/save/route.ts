import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { upsertSkillMastery, checkTrophyAwards } from "@/lib/skillMastery";

export const maxDuration = 60;
const MAX_ATTEMPTS = 3;

function normalizeAnswer(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v).trim().toLowerCase())
      .sort()
      .join("||");
  }
  return String(value ?? "").trim().toLowerCase();
}

function getOptions(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function stripOptionLabel(value: string): string {
  return value.replace(/^\s*(?:[A-Z]|\d+)\s*[.)\-:]\s*/i, "").trim();
}

function resolveCorrectAnswer(correctAnswer: string, options: string[]): string {
  const normalizedCorrect = normalizeAnswer(correctAnswer);
  const exact = options.find((option) => normalizeAnswer(option) === normalizedCorrect);
  if (exact) return exact;

  const labelMatch = correctAnswer.trim().match(/^([A-Z])(?:\s*[.)\-:]?)$/i);
  if (labelMatch) {
    const index = labelMatch[1].toUpperCase().charCodeAt(0) - 65;
    if (options[index]) return options[index];
  }

  const contentMatch = options.find(
    (option) => normalizeAnswer(stripOptionLabel(option)) === normalizeAnswer(stripOptionLabel(correctAnswer)),
  );
  return contentMatch ?? correctAnswer;
}

function isAnswerCorrect(studentAnswer: unknown, correctAnswer: string, options: string[]): boolean {
  return normalizeAnswer(stripOptionLabel(String(studentAnswer ?? ""))) ===
    normalizeAnswer(stripOptionLabel(resolveCorrectAnswer(correctAnswer, options)));
}

export async function POST(req: Request) {
  try {
    const { user, response } = await requireRole("STUDENT");
    if (response) return response;

    const userId = user!.id;

    const { quizId, answers, timeSpentSeconds } = await req.json();

    if (!quizId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (!Array.isArray(answers)) {
      return NextResponse.json({ message: "answers must be an array" }, { status: 400 });
    }

    const normalizedTime = Number(timeSpentSeconds);
    if (!Number.isFinite(normalizedTime) || normalizedTime < 0 || normalizedTime > 86_400) {
      return NextResponse.json({ message: "Invalid completion time" }, { status: 400 });
    }

    // Fetch the quiz ONCE with everything needed for server-side grading.
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          select: {
            id: true,
            correctAnswer: true,
            explanation: true,
            learningOutcomeId: true,
            options: true,
          },
        },
        subject: { select: { name: true } },
        grade: { select: { level: true } },
      },
    });

    if (!quiz) {
      return NextResponse.json({ message: "Quiz not found" }, { status: 404 });
    }
    if (!quiz.isPublished) {
      return NextResponse.json({ message: "This quiz is not available" }, { status: 403 });
    }
    if (quiz.dueDate && quiz.dueDate < new Date()) {
      return NextResponse.json({ message: "The due date for this quiz has passed" }, { status: 410 });
    }
    if (!user!.gradeId || user!.gradeId !== quiz.gradeId) {
      return NextResponse.json({ message: "This quiz is assigned to a different grade" }, { status: 403 });
    }
    if (quiz.questions.length === 0) {
      return NextResponse.json({ message: "This quiz has no questions" }, { status: 409 });
    }

    // ── Server-side grading: never trust client-supplied score/isCorrect ──
    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));

    const submittedAnswers = new Map<string, unknown>();
    for (const answer of answers) {
      if (answer?.questionId && questionMap.has(answer.questionId) && !submittedAnswers.has(answer.questionId)) {
        submittedAnswers.set(answer.questionId, answer.studentAnswer);
      }
    }

    // Grade every question exactly once. Missing answers are incorrect and
    // duplicate question IDs cannot inflate the score.
    const gradedAnswers = quiz.questions.map((question) => {
        const studentAnswer = submittedAnswers.get(question.id) ?? "";
        const isCorrect = isAnswerCorrect(
          studentAnswer,
          question.correctAnswer,
          getOptions(question.options),
        );
        return {
          questionId: question.id,
          studentAnswer: Array.isArray(studentAnswer)
            ? studentAnswer.map(String).join(",")
            : String(studentAnswer),
          isCorrect,
          outcomeId: question.learningOutcomeId,
        };
      });

    const correctAnswers = gradedAnswers.filter((a) => a.isCorrect).length;
    const totalItems = quiz.questions.length;
    const score = Math.round((correctAnswers / totalItems) * 10000) / 100;
    const totalPoints = totalItems;

    // Commit the result and its answers first. Mastery/trophy enrichment is
    // intentionally separated so a secondary calculation can never roll back
    // a student's completed assessment.
    const result = await prisma.$transaction(async (tx) => {
      const existingResult = await tx.result.findUnique({
        where: { studentId_quizId: { studentId: userId, quizId } },
        include: { answers: true },
      });

      let resultRow;

      if (existingResult) {
        if (existingResult.attemptsCount >= MAX_ATTEMPTS) {
          return { limitReached: true as const, unchanged: true as const, result: existingResult };
        }
        if (score <= existingResult.score) {
          const attemptedResult = await tx.result.update({
            where: { id: existingResult.id },
            data: { attemptsCount: { increment: 1 } },
            include: { answers: true },
          });
          return { limitReached: false as const, unchanged: true as const, result: attemptedResult };
        }
        await tx.studentAnswer.deleteMany({ where: { resultId: existingResult.id } });
        resultRow = await tx.result.update({
          where: { id: existingResult.id },
          data: {
            score,
            totalPoints,
            timeSpentSeconds: Math.round(normalizedTime),
            totalItems,
            attemptsCount: { increment: 1 },
          },
        });
      } else {
        resultRow = await tx.result.create({
          data: {
            score,
            totalPoints,
            timeSpentSeconds: Math.round(normalizedTime),
            totalItems,
            studentId: userId,
            quizId,
          },
        });
      }

      await tx.studentAnswer.createMany({
        data: gradedAnswers.map((a) => ({
          resultId: resultRow.id,
          questionId: a.questionId,
          studentAnswer: a.studentAnswer,
          isCorrect: a.isCorrect,
        })),
      });

      return { limitReached: false as const, unchanged: false as const, result: resultRow };
    }, { timeout: 15_000 });

    if (result.limitReached) {
      return NextResponse.json(
        { message: `You have used all ${MAX_ATTEMPTS} attempts for this quiz.` },
        { status: 409 },
      );
    }

    let enrichmentPending = false;
    try {
      await prisma.$transaction(async (tx) => {
        for (const answer of gradedAnswers) {
          if (answer.outcomeId) {
            await upsertSkillMastery(userId, answer.outcomeId, answer.isCorrect, quiz.testingWindowId, tx);
          }
        }
        await checkTrophyAwards(userId, quiz.subject.name, quiz.grade.level, tx);
      }, { timeout: 30_000 });
    } catch (enrichmentError) {
      enrichmentPending = true;
      console.error("RESULT_ENRICHMENT_ERROR:", enrichmentError);
    }

    const review = quiz.questions.map((question) => {
      const graded = gradedAnswers.find((answer) => answer.questionId === question.id)!;
      return {
        questionId: question.id,
        isCorrect: graded.isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      };
    });

    if (result.unchanged) {
      return NextResponse.json({
        message: "Previous score was higher or equal",
        result: result.result,
        score,
        bestScore: result.result.score,
        correctAnswers,
        totalItems,
        attemptsUsed: result.result.attemptsCount,
        review,
        enrichmentPending,
      }, { status: 200 });
    }

    return NextResponse.json({
      message: "Result saved successfully",
      result: result.result,
      score,
      totalPoints,
      correctAnswers,
      totalItems,
      review,
      enrichmentPending,
      attemptsUsed: result.result.attemptsCount,
      bestScore: result.result.score,
    }, { status: 201 });

  } catch (error: any) {
    console.error("RESULT_SAVE_ERROR:", error);
    return NextResponse.json({
      message: "Internal Server Error",
    }, { status: 500 });
  }
}
