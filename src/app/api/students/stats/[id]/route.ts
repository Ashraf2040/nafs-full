// src/app/api/students/stats/[id]/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const studentId = resolvedParams.id;

    const results = await prisma.result.findMany({
      where: { studentId },
      include: {
        quiz: {
          include: {
            questions: true,
          },
        },
      },
    });

    const quizzesTaken = results.length;

    // مجموع الدرجات العادية
    const totalRawScore = results.reduce((acc, r) => {
      return acc + r.score;
    }, 0);

    // متوسط الدرجات
    const averageScore =
      quizzesTaken > 0 ? totalRawScore / quizzesTaken : 0;

    // Achievement Score
    const achievementScore = results.reduce((acc, r) => {
      const questionCount = r.quiz?.questions?.length || 0;

      return acc + r.score * questionCount;
    }, 0);

    // أعلى درجة
    const highestScore =
      quizzesTaken > 0
        ? Math.max(...results.map((r) => r.score))
        : 0;

    return NextResponse.json({
      totalScore: achievementScore || 0,
      quizzesTaken,
      averageScore,
      highestScore,
    });
  } catch (error) {
    console.error("STUDENT_STATS_ERROR:", error);

    return NextResponse.json(
      {
        totalScore: 0,
        quizzesTaken: 0,
        averageScore: 0,
        highestScore: 0,
        error: "Failed to fetch student stats",
      },
      { status: 500 }
    );
  }
}