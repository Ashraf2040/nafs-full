import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { user, response } = await requireRole("STUDENT");
    if (response) return response;

    const userId = user!.id;
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const grade = searchParams.get("grade");

    const where: any = { studentId: userId };
    const outcomeWhere: any = {};
    if (subject) outcomeWhere.subject = subject;
    if (grade) outcomeWhere.grade = parseInt(grade);

    const items = await prisma.learningPathItem.findMany({
      where: {
        ...where,
        outcome: outcomeWhere,
      },
      include: {
        outcome: {
          select: {
            id: true,
            grade: true,
            subject: true,
            subDomain: true,
            outcomeText: true,
            indicatorText: true,
          },
        },
      },
      orderBy: { sequenceOrder: "asc" },
    });

    // Also fetch mastery data for each outcome
    const skillMastery = await prisma.skillMastery.findMany({
      where: {
        studentId: userId,
        outcomeId: { in: items.map((i) => i.outcomeId) },
      },
      select: { outcomeId: true, masteryLevel: true, status: true, attemptsCount: true },
    });
    const masteryMap = new Map(skillMastery.map((m) => [m.outcomeId, m]));

    const enriched = items.map((item) => ({
      ...item,
      mastery: masteryMap.get(item.outcomeId) || null,
    }));

    return NextResponse.json({ items: enriched });
  } catch (error: any) {
    console.error("LEARNING_PATH_GET_ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
