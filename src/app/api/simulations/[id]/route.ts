import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole("ADMIN", "TEACHER", "STUDENT");
  if (response) return response;
  const { id } = await params;
  const simulation = await prisma.simulation.findUnique({
    where: { id },
    include: {
      grade: true,
      subjects: {
        include: {
          subject: true,
          quiz: { include: { questions: { select: { id: true, questionText: true, options: true, imageUrl: true }, orderBy: { createdAt: "asc" } } } },
          questions: { select: { id: true, questionText: true, options: true, imageUrl: true }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!simulation || (user!.role === "STUDENT" && (!simulation.isPublished || simulation.gradeId !== user!.gradeId))) return NextResponse.json({ message: "Simulation not available" }, { status: 404 });
  if (user!.role === "TEACHER") {
    const assignments = await prisma.teacherAssignment.findMany({ where: { teacherId: user!.id, gradeId: simulation.gradeId }, select: { subjectId: true } });
    const allowed = new Set(assignments.map(a => a.subjectId));
    if (simulation.subjects.some(subject => !allowed.has(subject.subjectId))) return NextResponse.json({ message: "You are not assigned to every subject in this simulation" }, { status: 403 });
  }
  const attempt = user!.role === "STUDENT" ? await prisma.simulationAttempt.findUnique({ where: { simulationId_studentId: { simulationId: id, studentId: user!.id } } }) : null;
  const safeSimulation = { ...simulation, subjects: simulation.subjects.map(section => ({ ...section, questions: section.quiz?.questions ?? section.questions })) };
  return NextResponse.json({ simulation: safeSimulation, attempt });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole("ADMIN", "TEACHER");
  if (response) return response;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.isPublished !== "boolean") {
    return NextResponse.json({ message: "Choose whether to publish or unpublish this simulation" }, { status: 400 });
  }

  const simulation = await prisma.simulation.findUnique({
    where: { id },
    include: { subjects: { include: { quiz: { include: { _count: { select: { questions: true } } } }, questions: { select: { id: true } } } } },
  });
  if (!simulation) return NextResponse.json({ message: "Simulation not found" }, { status: 404 });
  if (user!.role === "TEACHER" && simulation.creatorId !== user!.id) {
    return NextResponse.json({ message: "Only the creator can publish this simulation" }, { status: 403 });
  }
  if (body.isPublished && (simulation.subjects.length < 2 || simulation.subjects.some(section => (section.quiz ? section.quiz._count.questions : section.questions.length) < 1))) {
    return NextResponse.json({ message: "Add at least one question in each of two subjects before publishing" }, { status: 409 });
  }

  const updated = await prisma.simulation.update({ where: { id }, data: { isPublished: body.isPublished }, select: { id: true, isPublished: true } });
  return NextResponse.json({ simulation: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole("ADMIN", "TEACHER");
  if (response) return response;
  const { id } = await params;
  const simulation = await prisma.simulation.findUnique({ where: { id }, select: { creatorId: true } });
  if (!simulation) return NextResponse.json({ message: "Simulation not found" }, { status: 404 });
  if (user!.role === "TEACHER" && simulation.creatorId !== user!.id) return NextResponse.json({ message: "Only the creator can delete this simulation" }, { status: 403 });
  await prisma.simulation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
