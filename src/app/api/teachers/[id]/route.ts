import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/* ─── GET (existing) ─── */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const teacher = await prisma.user.findUnique({
    where: { id, role: "TEACHER" },
    include: {
      assignments: { include: { subject: true, grade: true } },
      quizzes: {
        include: {
          subject: true,
          grade: true,
          results: true,
          questions: true,
        },
      },
    },
  });

  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(teacher);
}

/* ─── PUT (new) ─── */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { assignments } = await req.json();

  // Verify target is a teacher
  const teacher = await prisma.user.findUnique({ where: { id, role: "TEACHER" } });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  // Flatten { subjectId, gradeIds[] } → one row per subject-grade pair
  const rows = (assignments || []).flatMap((a: any) =>
    (a.gradeIds || []).map((gradeId: string) => ({
      teacherId: id,
      subjectId: a.subjectId,
      gradeId,
    }))
  );

  // Replace all existing assignments for this teacher
  await prisma.teacherAssignment.deleteMany({ where: { teacherId: id } });
  if (rows.length > 0) {
    await prisma.teacherAssignment.createMany({ data: rows });
  }

  // Return fresh teacher data
  const updated = await prisma.user.findUnique({
    where: { id, role: "TEACHER" },
    include: {
      assignments: { include: { subject: true, grade: true } },
      quizzes: { include: { results: true } },
    },
  });

  return NextResponse.json(updated);
}

/* ─── POST preview + DELETE teacher account ─── */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (body?.action !== "preview") return NextResponse.json({ error: "Choose a valid action" }, { status: 400 });
  const teacher = await prisma.user.findUnique({
    where: { id, role: "TEACHER" },
    select: {
      id: true,
      _count: { select: { assignments: true, quizzes: true, createdChallenges: true, createdStudyGuides: true } },
    },
  });
  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  return NextResponse.json({ counts: teacher._count });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const adminId = (session.user as any).id as string | undefined;
  if (!adminId) return NextResponse.json({ error: "Administrator session is invalid" }, { status: 403 });

  try {
    const teacher = await prisma.user.findUnique({ where: { id, role: "TEACHER" }, select: { id: true } });
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      // Preserve teacher-created resources by transferring their ownership to the acting administrator.
      await tx.challenge.updateMany({ where: { teacherId: id }, data: { teacherId: adminId } });
      await tx.studyGuide.updateMany({ where: { creatorId: id }, data: { creatorId: adminId } });
      // Quiz.creator uses SetNull; quiz content and student results remain intact.
      await tx.user.delete({ where: { id } });
    });
    revalidatePath("/dashboard/teachers");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("TEACHER_DELETE_ERROR:", error);
    return NextResponse.json({ error: "Could not delete this teacher account" }, { status: 500 });
  }
}
