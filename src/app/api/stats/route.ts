// src/app/api/stats/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const revalidate = 300;

export async function GET() {
  try {
    // 🔥 OPTIMIZED: Raw SQL aggregation instead of findMany + JS grouping
    const data = await prisma.$queryRaw<
      { name: string; score: number; participation: number }[]
    >`
      SELECT 
        'Grade ' || g.level as name,
        COALESCE(ROUND(AVG(r.score)), 0)::int as score,
        COUNT(DISTINCT r."studentId")::int as participation
      FROM "Grade" g
      LEFT JOIN "Quiz" q ON q."gradeId" = g.id
      LEFT JOIN "Result" r ON r."quizId" = q.id
      GROUP BY g.id, g.level
      ORDER BY g.level
    `;

    // Fill missing grades with zeros
    const allGrades = [3, 4, 5, 6, 7, 8, 9];
    const resultMap = new Map(data.map(d => [d.name, d]));
    
    const filledData = allGrades.map(level => {
      const gradeName = `Grade ${level}`;
      const existing = resultMap.get(gradeName);
      return existing || { name: gradeName, score: 0, participation: 0 };
    });

    return NextResponse.json({ data: filledData });
  } catch (error) {
    console.error("Stats fetch error:", error);
    return NextResponse.json(
      { 
        data: [
          { name: "Grade 3", score: 0, participation: 0 },
          
        
          { name: "Grade 6", score: 0, participation: 0 },
         
          { name: "Grade 9", score: 0, participation: 0 },
        ] 
      }
    );
  }
}