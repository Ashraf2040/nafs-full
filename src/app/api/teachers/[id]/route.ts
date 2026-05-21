import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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