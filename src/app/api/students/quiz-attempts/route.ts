// src/app/api/students/quiz-attempts/route.ts
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

    // Get quizId from query params
    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get("quizId");

    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
    }

    // Count how many results exist for this student + quiz combination
    const attemptsCount = await prisma.result.count({
      where: {
        studentId: userId,
        quizId: quizId,
      },
    });

    return NextResponse.json({
      attemptsUsed: attemptsCount,
      maxAttempts: 3,
      canRetake: attemptsCount < 3,
    });
  } catch (error: any) {
    console.error("QUIZ_ATTEMPTS_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz attempts", details: error.message },
      { status: 500 }
    );
  }
}