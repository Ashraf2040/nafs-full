// src/app/api/stats/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const results = await prisma.result.findMany({
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            grade: { select: { level: true } },
            subject: { select: { name: true } },
          },
        },
        student: { select: { id: true, name: true } },
      },
    });

    // Group by grade level
    const gradeMap: Record<number, { totalScore: number; count: number; students: Set<string> }> = {};

    for (const result of results) {
      const gradeLevel = result.quiz.grade?.level;
      if (gradeLevel == null) continue; // Skip if no grade
      
      if (!gradeMap[gradeLevel]) {
        gradeMap[gradeLevel] = { totalScore: 0, count: 0, students: new Set() };
      }
      gradeMap[gradeLevel].totalScore += result.score;
      gradeMap[gradeLevel].count++;
      gradeMap[gradeLevel].students.add(result.studentId);
    }

    const data = Object.entries(gradeMap)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([grade, stats]) => ({
        name: `Grade ${grade}`,
        score: Math.round(stats.totalScore / stats.count),
        participation: stats.students.size,
      }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Stats fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}