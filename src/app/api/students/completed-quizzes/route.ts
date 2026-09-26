// src/app/api/students/completed-quizzes/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireRole("STUDENT");
    if (response) return response;
    const userId = user!.id;

    // Get URL params
    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get("studentId");

    // Security: ensure students can only see their own data
    if (requestedStudentId && requestedStudentId !== userId) {
      return NextResponse.json({ error: "Forbidden: Cannot access other students' data" }, { status: 403 });
    }

    const studentId = userId;

    // Fetch all results for this student with quiz details
    const results = await prisma.result.findMany({
      where: { studentId },
      include: {
        quiz: {
          include: {
            subject: true,
            grade: true,
            questions: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                options: true,
                imageUrl: true,
                difficulty: true,
              },
            },
          },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    // Also fetch quizzes that the student has taken but may have multiple results for
    // We need to get the latest result per quiz and count attempts
    const quizAttemptsMap = new Map<string, number>();
    const latestResultMap = new Map<string, typeof results[0]>();

    results.forEach((result) => {
      const quizId = result.quizId;
      const currentCount = quizAttemptsMap.get(quizId) || 0;
      quizAttemptsMap.set(quizId, Math.max(currentCount, result.attemptsCount));

      // Keep the latest result (highest score or most recent)
      const existing = latestResultMap.get(quizId);
      if (!existing || result.score > existing.score) {
        latestResultMap.set(quizId, result);
      }
    });

    // Build the response
    const completedQuizzes = Array.from(latestResultMap.values()).map((result) => {
      const quiz = result.quiz;
      const attemptsUsed = quizAttemptsMap.get(quiz.id) || 1;

      return {
        id: quiz.id,
        title: quiz.title,
        subject: quiz.subject,
        grade: quiz.grade,
        questions: quiz.questions,
        createdAt: quiz.createdAt,
        isPublished: quiz.isPublished,
        result: {
          id: result.id,
          score: result.score,
          totalPoints: result.totalPoints,
          createdAt: result.completedAt,
          attemptNumber: result.attemptsCount,
        },
        attemptsUsed,
      };
    });

    return NextResponse.json({ quizzes: completedQuizzes });
  } catch (error: any) {
    console.error("COMPLETED_QUIZZES_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch completed quizzes", details: error.message },
      { status: 500 }
    );
  }
}
