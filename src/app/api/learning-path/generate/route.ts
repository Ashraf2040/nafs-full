import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireRole("STUDENT");
    if (response) return response;

    const userId = user!.id;

    const { subject, grade } = await req.json();
    if (!subject || !grade) {
      return NextResponse.json({ message: "subject and grade are required" }, { status: 400 });
    }

    const gradeNum = parseInt(grade);

    // Get all outcomes for this subject/grade
    const allOutcomes = await prisma.learningOutcome.findMany({
      where: { subject, grade: gradeNum },
      orderBy: [{ subDomain: "asc" }, { outcomeText: "asc" }],
    });

    // Get student's current mastery for each outcome
    const masteryRecords = await prisma.skillMastery.findMany({
      where: {
        studentId: userId,
        outcomeId: { in: allOutcomes.map((o) => o.id) },
      },
    });
    const masteryMap = new Map(masteryRecords.map((m) => [m.outcomeId, m]));

    // Identify weak outcomes (mastery < 70 or never attempted)
    const weakOutcomes = allOutcomes.filter((o) => {
      const m = masteryMap.get(o.id);
      return !m || m.masteryLevel < 70;
    });

    // Clear existing learning path items for this student/subject
    await prisma.learningPathItem.deleteMany({
      where: {
        studentId: userId,
        outcome: { subject, grade: gradeNum },
      },
    });

    // Create sequenced learning path
    if (weakOutcomes.length > 0) {
      const groupedByDomain: Record<string, typeof weakOutcomes> = {};
      for (const o of weakOutcomes) {
        const domain = o.subDomain || "General";
        if (!groupedByDomain[domain]) groupedByDomain[domain] = [];
        groupedByDomain[domain].push(o);
      }

      let seq = 0;
      const items: { studentId: string; outcomeId: string; sequenceOrder: number; status: "PENDING" }[] = [];

      // Sort domains to put foundational ones first
      const domainOrder = Object.keys(groupedByDomain).sort();
      for (const domain of domainOrder) {
        // Within each domain, sort by indicator text
        const sorted = groupedByDomain[domain].sort((a, b) => a.indicatorText.localeCompare(b.indicatorText));
        for (const o of sorted) {
          seq++;
          items.push({ studentId: userId, outcomeId: o.id, sequenceOrder: seq, status: "PENDING" });
        }
      }

      await prisma.learningPathItem.createMany({ data: items });
    }

    return NextResponse.json({
      message: "Learning path generated",
      totalItems: weakOutcomes.length,
    });
  } catch (error: any) {
    console.error("LEARNING_PATH_GENERATE_ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
