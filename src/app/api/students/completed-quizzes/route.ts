// src/app/api/students/completed-quizzes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    if (userRole !== "STUDENT") {
      return NextResponse.json({ error: "Only students can access this endpoint" }, { status: 403 });
    }

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
            questions: true,
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
      quizAttemptsMap.set(quizId, currentCount + 1);

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