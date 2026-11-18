import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { response } = await requireRole("ADMIN");
    if (response) return response;
    const body = await req.json().catch(() => null);
    if (body?.action !== "preview" && body?.action !== "delete") {
      return NextResponse.json({ message: "Choose preview or delete" }, { status: 400 });
    }

    const requestedIds: string[] = Array.isArray(body?.studentIds)
      ? Array.from(new Set<string>(body.studentIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)))
      : [];
    if (requestedIds.length === 0) {
      return NextResponse.json({ message: "Select at least one student" }, { status: 400 });
    }
    const students = await prisma.user.findMany({ where: { id: { in: requestedIds }, role: "STUDENT" }, select: { id: true } });
    const ids = students.map((student) => student.id);
    if (body.action === "preview") {
      const [submissions, skillRecords, learningPathItems, trophies, challengeParticipations] = ids.length ? await Promise.all([
        prisma.result.count({ where: { studentId: { in: ids } } }),
        prisma.skillMastery.count({ where: { studentId: { in: ids } } }),
        prisma.learningPathItem.count({ where: { studentId: { in: ids } } }),
        prisma.trophy.count({ where: { studentId: { in: ids } } }),
        prisma.challengeParticipation.count({ where: { studentId: { in: ids } } }),
      ]) : [0, 0, 0, 0, 0];
      return NextResponse.json({
        count: ids.length,
        submissions,
        skillRecords,
        learningPathItems,
        trophies,
        challengeParticipations,
      });
    }
    if (!ids.length) return NextResponse.json({ deletedCount: 0 });

    const deletedCount = await prisma.$transaction(async (tx) => {
      await tx.result.deleteMany({ where: { studentId: { in: ids } } });
      await tx.practiceCompletion.deleteMany({ where: { studentId: { in: ids } } });
      await tx.skillMastery.deleteMany({ where: { studentId: { in: ids } } });
      await tx.learningPathItem.deleteMany({ where: { studentId: { in: ids } } });
      await tx.trophy.deleteMany({ where: { studentId: { in: ids } } });
      await tx.challengeParticipation.deleteMany({ where: { studentId: { in: ids } } });
      const deleted = await tx.user.deleteMany({ where: { id: { in: ids }, role: "STUDENT" } });
      return deleted.count;
    }, { maxWait: 10000, timeout: 60000 });

    return NextResponse.json({ deletedCount });
  } catch (error) {
    console.error("STUDENT_BULK_DELETE_ERROR:", error);
    return NextResponse.json({ message: "Could not delete the student roster" }, { status: 500 });
  }
}
