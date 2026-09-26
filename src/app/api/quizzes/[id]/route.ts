import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireRole("STUDENT", "TEACHER", "ADMIN");
    if (response) return response;
    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        subject: true,
        grade: { select: { level: true } },
        questions: user!.role === "STUDENT"
          ? {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                options: true,
                imageUrl: true,
                bloomLevel: true,
                difficulty: true,
                learningOutcomeId: true,
              },
              orderBy: { createdAt: "asc" },
            }
          : { orderBy: { createdAt: "asc" } },
      },
    });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    if (user!.role === "STUDENT") {
      if (!quiz.isPublished || !user!.gradeId || quiz.gradeId !== user!.gradeId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (quiz.dueDate && quiz.dueDate < new Date()) {
        return NextResponse.json({ error: "This quiz is no longer available" }, { status: 410 });
      }
    } else if (user!.role === "TEACHER" && quiz.creatorId !== user!.id) {
      const assignment = await prisma.teacherAssignment.findUnique({
        where: {
          teacherId_subjectId_gradeId: {
            teacherId: user!.id,
            subjectId: quiz.subjectId,
            gradeId: quiz.gradeId,
          },
        },
        select: { id: true },
      });
      if (!assignment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ...quiz, gradeTarget: quiz.grade.level });
  } catch (error) {
    console.error("QUIZ_GET_ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;
    const { id } = await params;
    const { title, description, dueDate, questions } = await req.json();
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id },
      select: { creatorId: true, _count: { select: { results: true } } },
    });
    if (!existingQuiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (user!.role === "TEACHER" && existingQuiz.creatorId !== user!.id) {
      return NextResponse.json({ error: "Only the quiz owner can edit it" }, { status: 403 });
    }
    if (existingQuiz._count.results > 0) {
      return NextResponse.json(
        { error: "This quiz already has submissions and can no longer be structurally edited." },
        { status: 409 },
      );
    }
    if (typeof title !== "string" || !title.trim() || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "A title and at least one question are required" }, { status: 400 });
    }
    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    if (parsedDueDate && Number.isNaN(parsedDueDate.getTime())) {
      return NextResponse.json({ error: "Enter a valid due date" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.quiz.update({
        where: { id },
        data: {
          title: title.trim(),
          description: typeof description === "string" && description.trim() ? description.trim() : null,
          dueDate: parsedDueDate,
        },
      });
      const existingQuestionIds = questions.filter((q: any) => q.id).map((q: any) => q.id);
      await tx.question.deleteMany({ where: { quizId: id, id: { notIn: existingQuestionIds } } });

      for (const question of questions) {
        if (!question.questionText || !question.correctAnswer || !Array.isArray(question.options) || question.options.length < 2) {
          throw new Error("Each question requires text, at least two options, and a correct answer");
        }
        const data = {
          questionText: String(question.questionText).trim(),
          questionType: "MULTIPLE_CHOICE",
          correctAnswer: String(question.correctAnswer).trim(),
          options: question.options.map(String),
          explanation: question.explanation || null,
          imageUrl: question.imageUrl || null,
          bloomLevel: null,
          difficulty: null,
        };
        if (question.id) {
          const updated = await tx.question.updateMany({ where: { id: question.id, quizId: id }, data });
          if (updated.count !== 1) throw new Error("A question does not belong to this quiz");
        } else {
          await tx.question.create({ data: { ...data, quizId: id } });
        }
      }
    }, { timeout: 15_000 });
    return NextResponse.json({ success: true, message: "Quiz updated successfully" });
  } catch (error) {
    console.error("QUIZ_UPDATE_ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update quiz" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;
    const { id } = await params;
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id },
      select: { creatorId: true, _count: { select: { results: true } } },
    });
    if (!existingQuiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (user!.role === "TEACHER" && existingQuiz.creatorId !== user!.id) {
      return NextResponse.json({ error: "Only the quiz owner can delete it" }, { status: 403 });
    }
    if (existingQuiz._count.results > 0) {
      return NextResponse.json(
        { error: "This quiz has student submissions and cannot be deleted. Unpublish it instead." },
        { status: 409 },
      );
    }
    await prisma.quiz.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("QUIZ_DELETE_ERROR:", error);
    return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}
