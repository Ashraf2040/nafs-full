import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { calculateChallengeProgress, isChallengeOpen, parseChallengeCriteria } from "@/lib/challenges";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireRole("STUDENT");
    if (response) return response;
    const { id } = await params;
    const userId = user!.id;

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      select: { criteria: true, isActive: true, startDate: true, endDate: true },
    });
    if (!challenge) {
      return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
    }

    const criteria = parseChallengeCriteria(challenge.criteria);
    if (!criteria || !isChallengeOpen(challenge)) {
      return NextResponse.json({ message: "This challenge is not open" }, { status: 409 });
    }
    const studentGrade = user!.gradeId
      ? await prisma.grade.findUnique({ where: { id: user!.gradeId }, select: { level: true } })
      : null;
    if (studentGrade?.level !== criteria.grade) {
      return NextResponse.json({ message: "This challenge is for a different grade" }, { status: 403 });
    }

    const { progress } = await calculateChallengeProgress(prisma, userId, criteria);

    const participation = await prisma.challengeParticipation.upsert({
      where: { challengeId_studentId: { challengeId: id, studentId: userId } },
      update: {
        progress,
        completedAt: progress >= 100 ? new Date() : null,
      },
      create: { challengeId: id, studentId: userId, progress },
    });
    return NextResponse.json({ participation, progress });
  } catch (error: any) {
    console.error("PARTICIPATE_POST_ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireRole("STUDENT", "TEACHER", "ADMIN");
    if (response) return response;
    const { id } = await params;
    const userId = user!.id;
    const userRole = user!.role;
    const body = await req.json().catch(() => ({}));
    const { studentId, action } = body;

    const challenge = await prisma.challenge.findUnique({ where: { id }, select: { criteria: true, teacherId: true } });
    if (!challenge) {
      return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
    }

    const criteria = parseChallengeCriteria(challenge.criteria);
    if (!criteria) {
      return NextResponse.json({ message: "Challenge criteria are invalid" }, { status: 409 });
    }

    // Auto-recalculate progress from SkillMastery
    if (action === "recalculate") {
      // Only the challenge owner (teacher) or an admin may trigger a recalc
      if (userRole !== "ADMIN" && challenge.teacherId !== userId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      // Pick which students to recalculate
      let studentIds: string[] = [];
      if (studentId) {
        studentIds = [studentId];
      } else {
        // Recalculate all participants
        const participants = await prisma.challengeParticipation.findMany({
          where: { challengeId: id },
          select: { studentId: true },
        });
        studentIds = participants.map((p) => p.studentId);
      }

      const progressRows = await Promise.all(
        studentIds.map(async (sid) => ({
          studentId: sid,
          ...(await calculateChallengeProgress(prisma, sid, criteria)),
        })),
      );
      const results = await prisma.$transaction(
        progressRows.map(({ studentId: sid, progress: pct }) =>
          prisma.challengeParticipation.upsert({
            where: { challengeId_studentId: { challengeId: id, studentId: sid } },
            update: {
              progress: pct,
              completedAt: pct >= 100 ? new Date() : null,
            },
            create: {
              challengeId: id,
              studentId: sid,
              progress: pct,
              ...(pct >= 100 ? { completedAt: new Date() } : {}),
            },
          }),
        ),
      );

      return NextResponse.json({
        results: results.map((participation) => ({
          studentId: participation.studentId,
          progress: participation.progress,
          completedAt: participation.completedAt,
        })),
      });
    }

    // Progress is derived from assessed indicators. It is never accepted from
    // the browser, including for students and teachers.
    return NextResponse.json({ message: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    console.error("PARTICIPATE_PATCH_ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
