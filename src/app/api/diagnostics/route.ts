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
    const subject = searchParams.get("subject");
    const grade = searchParams.get("grade") ? parseInt(searchParams.get("grade")!) : null;

    // STUDENT: only ever their own diagnostics
    const targetStudentId = (userRole === "STUDENT") ? userId : studentId;

    // TEACHER: only students in assigned grades
    if (userRole === "TEACHER") {
      const target = await prisma.user.findUnique({
        where: { id: targetStudentId },
        select: { id: true, role: true, gradeId: true },
      });
      if (!target || target.role !== "STUDENT") {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }
      if (!(await canViewStudent(user!, target))) {
        return NextResponse.json(
          { error: "Forbidden: Not assigned to this student's grade" },
          { status: 403 }
        );
      }
    }

    // Build outcome filter
    const outcomeFilter: any = {};
    if (subject) outcomeFilter.subject = subject;
    if (grade) outcomeFilter.grade = grade;

    // All outcomes matching filter
    const allOutcomes = await prisma.learningOutcome.findMany({
      where: outcomeFilter,
    });

    // Skill mastery for this student
    const skillMastery = await prisma.skillMastery.findMany({
      where: {
        studentId: targetStudentId,
        outcomeId: { in: allOutcomes.map((o) => o.id) },
      },
    });

    // Group outcomes and mastery by domain
    const domainMap: Record<string, { total: number; mastered: number; points: number; maxPoints: number; outcomes: any[] }> = {};

    for (const o of allOutcomes) {
      const domain = o.subDomain || "General";
      if (!domainMap[domain]) {
        domainMap[domain] = { total: 0, mastered: 0, points: 0, maxPoints: 0, outcomes: [] };
      }
      domainMap[domain].total++;
      domainMap[domain].maxPoints++;

      const m = skillMastery.find((s) => s.outcomeId === o.id);
      if (m) {
        domainMap[domain].points += m.masteryLevel >= 70 ? 1 : 0;
        if (m.masteryLevel >= 70) domainMap[domain].mastered++;
      }

      domainMap[domain].outcomes.push({
        outcomeId: o.id,
        outcomeText: o.outcomeText,
        indicatorText: o.indicatorText,
        masterLevel: m?.masteryLevel || 0,
        status: m?.status || "BELOW",
        attempts: m?.attemptsCount || 0,
      });
    }

    // Overall stats
    const totalOutcomes = allOutcomes.length;
    const masteredOutcomes = skillMastery.filter((s) => s.masteryLevel >= 70).length;
    const overallMastery = totalOutcomes > 0 ? Math.round((masteredOutcomes / totalOutcomes) * 100) : 0;

    // Windows this student has completed
    const completedWindows = await prisma.testingWindow.findMany({
      where: {
        quizzes: {
          some: {
            results: { some: { studentId: targetStudentId } },
          },
        },
        ...(subject ? { subject } : {}),
        ...(grade ? { grade } : {}),
      },
      include: {
        quizzes: {
          include: {
            results: {
              where: { studentId: targetStudentId },
              select: { score: true, completedAt: true, timeSpentSeconds: true, totalItems: true },
            },
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    const windowScores = completedWindows.map((w) => {
      const quizScores = w.quizzes.flatMap((q) => q.results.map((r) => r.score));
      const avgScore = quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;
      return {
        windowName: w.name,
        startDate: w.startDate,
        endDate: w.endDate,
        avgScore,
        submissions: quizScores.length,
      };
    });

    // Trophies
    const trophies = await prisma.trophy.findMany({
      where: { studentId: targetStudentId },
      orderBy: { earnedAt: "desc" },
    });

    // Percentile calculation (simple rank within grade)
    let percentile = null;
    const latestResult = await prisma.result.findFirst({
      where: { studentId: targetStudentId },
      orderBy: { completedAt: "desc" },
      include: { quiz: { select: { grade: { select: { level: true } } } } },
    });

    if (latestResult) {
      const allScores = await prisma.result.findMany({
        where: { quiz: { grade: { level: latestResult.quiz.grade.level } } },
        select: { score: true },
      });
      const sorted = allScores.map((r) => r.score).sort((a, b) => a - b);
      const rank = sorted.filter((s) => s <= latestResult.score).length;
      percentile = allScores.length > 0 ? Math.round((rank / allScores.length) * 100) : null;
    }

    return NextResponse.json({
      overallMastery,
      totalOutcomes,
      masteredOutcomes,
      domains: domainMap,
      windowScores,
      trophies,
      percentile,
      latestScore: latestResult?.score || null,
    });
  } catch (error: any) {
    console.error("DIAGNOSTICS_ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
