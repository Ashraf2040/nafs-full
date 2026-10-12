import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

export async function POST(req: Request) {
  const { user, response } = await requireRole("STUDENT");
  if (response) return response;
  const { quizId } = await req.json();
  if (!quizId) return NextResponse.json({ message: "Practice id is required" }, { status: 400 });
  const practice = await prisma.quiz.findUnique({ where: { id: quizId }, select: { id: true, gradeId: true, isPublished: true, dueDate: true, assessmentType: true } });
  if (!practice || practice.assessmentType !== "PRACTICE") return NextResponse.json({ message: "Practice not found" }, { status: 404 });
  if (!practice.isPublished || user!.gradeId !== practice.gradeId) return NextResponse.json({ message: "This practice is not available" }, { status: 403 });
  if (practice.dueDate && practice.dueDate < new Date()) return NextResponse.json({ message: "The due date has passed" }, { status: 410 });
  const completion = await prisma.practiceCompletion.upsert({ where: { studentId_quizId: { studentId: user!.id, quizId } }, create: { studentId: user!.id, quizId }, update: {} });
  return NextResponse.json({ completed: true, completedAt: completion.completedAt }, { status: 201 });
}
