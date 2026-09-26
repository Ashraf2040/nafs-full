import { NextResponse } from "next/server";
import { requireRole, canViewStudent } from "@/lib/guard";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { user, response } = await requireRole("STUDENT", "TEACHER", "ADMIN");
    if (response) return response;

    const userId = user!.id;
    const userRole = user!.role;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || userId;

    // Students may only see their own trophies
    if (userRole === "STUDENT") {
      if (studentId !== userId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    // Teachers may only see trophies of students in assigned grades
    if (userRole === "TEACHER") {
      const target = await prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true, role: true, gradeId: true },
      });
      if (!target || target.role !== "STUDENT") {
        return NextResponse.json({ trophies: [], total: 0, byTier: {}, byDomain: {} });
      }
      if (!(await canViewStudent(user!, target))) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    const targetStudentId = studentId;

    const trophies = await prisma.trophy.findMany({
      where: { studentId: targetStudentId },
      orderBy: { earnedAt: "desc" },
    });

    // Count trophies by tier
    const byTier = trophies.reduce((acc: Record<string, number>, t) => {
      acc[t.tier] = (acc[t.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byDomain = trophies.reduce((acc: Record<string, any[]>, t) => {
      const domain = t.domain ?? "General";
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(t);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      trophies,
      total: trophies.length,
      byTier,
      byDomain,
    });
  } catch (error: any) {
    console.error("TROPHIES_ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
