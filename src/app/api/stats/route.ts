// src/app/api/stats/route.ts
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;

    // Keep aggregation in PostgreSQL. Teacher data is constrained by the exact
    // subject + grade assignment pair, not by a broad cross-product.
    const teacherScope = user!.role === "TEACHER"
      ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM "TeacherAssignment" ta
          WHERE ta."teacherId" = ${user!.id}
            AND ta."subjectId" = q."subjectId"
            AND ta."gradeId" = q."gradeId"
        )`
      : Prisma.empty;

    const data = await prisma.$queryRaw<
      { name: string; score: number; participation: number }[]
    >(Prisma.sql`
      SELECT 
        'Grade ' || g.level as name,
        COALESCE(ROUND(AVG(r.score)), 0)::int as score,
        COUNT(DISTINCT r."studentId")::int as participation
      FROM "Grade" g
      LEFT JOIN "Quiz" q ON q."gradeId" = g.id
        ${teacherScope}
      LEFT JOIN "Result" r ON r."quizId" = q.id
      GROUP BY g.id, g.level
      ORDER BY g.level
    `);

    // Fill missing grades with zeros
    const allGrades = [3, 4, 5, 6, 7, 8, 9];
    const resultMap = new Map(data.map(d => [d.name, d]));
    
    const filledData = allGrades.map(level => {
      const gradeName = `Grade ${level}`;
      const existing = resultMap.get(gradeName);
      return existing || { name: gradeName, score: 0, participation: 0 };
    });

    return NextResponse.json(
      { data: filledData },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Stats fetch error:", error);
    return NextResponse.json({ message: "Unable to load statistics" }, { status: 500 });
  }
}
