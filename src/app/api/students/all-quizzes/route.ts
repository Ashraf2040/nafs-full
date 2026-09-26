// src/app/api/students/all-quizzes/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireRole("STUDENT");
    if (response) return response;
    const userId = user!.id;

    // Get student's grade
    const student = await prisma.user.findUnique({
      where: { id: userId },
      select: { gradeId: true },
    });

    if (!student?.gradeId) {
      return NextResponse.json({ quizzes: [] });
    }

    // Fetch all published quizzes for this student's grade
    const quizzes = await prisma.quiz.findMany({
      where: {
        isPublished: true,
        gradeId: student.gradeId,
      },
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
      orderBy: { createdAt: "desc" },
    });

    // Fetch all results for this student
    const results = await prisma.result.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        quizId: true,
        score: true,
        totalPoints: true,
        completedAt: true,
        attemptsCount: true,
      },
    });

    // Build a map of quizId -> best result
    const resultMap: Record<string, typeof results[0]> = {};
    results.forEach((r) => {
      if (!resultMap[r.quizId] || resultMap[r.quizId].score < r.score) {
        resultMap[r.quizId] = r;
      }
    });

    // Count attempts per quiz
    const attemptCounts: Record<string, number> = {};
    results.forEach((r) => {
      attemptCounts[r.quizId] = Math.max(attemptCounts[r.quizId] || 0, r.attemptsCount);
    });

    const now = new Date();

    // Enrich quizzes with status
    const enriched = quizzes.map((quiz) => {
      const result = resultMap[quiz.id] || null;
      const attemptsUsed = attemptCounts[quiz.id] || 0;
      const isCompleted = !!result;
      const isExpired = quiz.dueDate ? new Date(quiz.dueDate) < now : false;

      let status: "completed" | "expired" | "active";
      if (isCompleted) status = "completed";
      else if (isExpired) status = "expired";
      else status = "active";

      return {
        id: quiz.id,
        title: quiz.title,
        subject: quiz.subject,
        grade: quiz.grade,
        questions: quiz.questions,
        createdAt: quiz.createdAt.toISOString(),
        isPublished: quiz.isPublished,
        dueDate: quiz.dueDate ? quiz.dueDate.toISOString() : null,
        result: result
          ? {
              id: result.id,
              score: result.score,
              totalPoints: result.totalPoints,
              createdAt: result.completedAt.toISOString(),
              attemptNumber: attemptsUsed, // derived from count, not stored field
            }
          : null,
        attemptsUsed,
        status,
      };
    });

    return NextResponse.json({ quizzes: enriched });
  } catch (error: any) {
    console.error("ALL_QUIZZES_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes", details: error.message },
      { status: 500 }
    );
  }
}
