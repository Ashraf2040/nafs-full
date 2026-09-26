// src/app/api/students/stats/[id]/route.ts

import { NextResponse } from "next/server";
import { requireRole, canViewStudent } from "@/lib/guard";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireRole("STUDENT", "TEACHER", "ADMIN");
    if (response) return response;

    const resolvedParams = await params;
    const studentId = resolvedParams.id;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true, gradeId: true },
    });

    if (!student || student.role !== "STUDENT") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Students may only ever access their OWN stats (IDOR protection)
    if (user!.role === "STUDENT" && user!.id !== studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Teachers may only access students in grades they are assigned to
    if (user!.role === "TEACHER" && !(await canViewStudent(user!, student))) {
      return NextResponse.json(
        { error: "Forbidden: Not assigned to this student's grade" },
        { status: 403 }
      );
    }

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

    // Result.score is stored as a percentage from 0 to 100.
    const averagePercentage = Math.round(averageScore);

    // أعلى درجة
    const highestScore =
      quizzesTaken > 0
        ? Math.max(...results.map((r) => r.score))
        : 0;

    return NextResponse.json({
      totalScore: Math.round(totalRawScore),
      averageScore: Math.round(averageScore),
      averagePercentage,
      quizzesTaken,
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
