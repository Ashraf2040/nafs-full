// src/app/api/quizzes/[id]/publish/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/guard";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;

    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: { creatorId: true, _count: { select: { questions: true } } },
    });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (user!.role === "TEACHER" && quiz.creatorId !== user!.id) {
      return NextResponse.json({ error: "Only the quiz owner can publish it" }, { status: 403 });
    }
    if (quiz._count.questions === 0) {
      return NextResponse.json({ error: "Add at least one question before publishing" }, { status: 409 });
    }

    // Calculate due date: 2 weeks from now
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    // Update quiz to published and set due date
    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: { 
        isPublished: true,
        dueDate: twoWeeksFromNow,
      },
    });

    // Revalidate the quizzes page so fresh data shows
    revalidatePath("/dashboard/quizzes");

    return NextResponse.json({ success: true, quiz: updatedQuiz });
  } catch (error) {
    console.error("PUBLISH_ERROR:", error);
    return NextResponse.json({ error: "Failed to publish quiz" }, { status: 500 });
  }
}
