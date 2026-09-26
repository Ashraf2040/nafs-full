import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { user, response } = await requireRole("STUDENT");
    if (response) return response;
    const userId = user!.id;

    const participations = await prisma.challengeParticipation.findMany({
      where: { studentId: userId, completedAt: { not: null } },
      include: {
        challenge: {
          select: { id: true, title: true, description: true, rewardBadge: true, criteria: true },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    return NextResponse.json({ badges: participations });
  } catch (error: any) {
    console.error("COMPLETED_CHALLENGES_ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
