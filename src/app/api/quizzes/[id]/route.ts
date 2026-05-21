// src/app/api/quizzes/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    console.log("[DEBUG] Session:", JSON.stringify(session, null, 2));

    if (!session?.user) {
      console.log("[DEBUG] No session user → 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    console.log("[DEBUG] Quiz ID:", id);

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { subject: true, questions: true },
    });

    if (!quiz) {
      console.log("[DEBUG] Quiz not found in DB → 404");
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    console.log("[DEBUG] Quiz found:", {
      id: quiz.id,
      isPublished: quiz.isPublished,
      gradeId: quiz.gradeId,
    });

    const userRole = (session.user as any).role;
    const studentGradeId = (session.user as any).gradeId;

    console.log("[DEBUG] User:", {
      id: (session.user as any).id,
      role: userRole,
      gradeId: studentGradeId,
    });

    if (userRole === "STUDENT") {
      if (!quiz.isPublished) {
        console.log("[DEBUG] Quiz is NOT published → 403");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (studentGradeId && quiz.gradeId !== studentGradeId) {
        console.log(
          `[DEBUG] Grade mismatch: quiz.gradeId=${quiz.gradeId} vs user.gradeId=${studentGradeId} → 403`
        );
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      console.log("[DEBUG] Student passed all checks");
    } else {
      console.log("[DEBUG] User is not a student, access granted");
    }

    return NextResponse.json(quiz);
  } catch (error) {
    console.error("[DEBUG] CATCH ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, description, dueDate, questions } = body;

    // Update quiz metadata
    await prisma.quiz.update({
      where: { id },
      data: {
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    // Handle questions: update existing, create new, delete removed
    const existingQuestionIds = questions
      .filter((q: any) => q.id)
      .map((q: any) => q.id);

    // Delete questions that are no longer in the list
    await prisma.question.deleteMany({
      where: {
        quizId: id,
        id: { notIn: existingQuestionIds },
      },
    });

    // Upsert questions
    for (const q of questions) {
      const questionData = {
        questionText: q.questionText,
        questionType: "MULTIPLE_CHOICE",
        correctAnswer: q.correctAnswer,
        options: q.options,
        explanation: q.explanation || null,
        imageUrl: q.imageUrl || null,
        bloomLevel: null,
        difficulty: null,
      };

      if (q.id) {
        // Update existing
        await prisma.question.update({
          where: { id: q.id },
          data: questionData,
        });
      } else {
        // Create new
        await prisma.question.create({
          data: {
            ...questionData,
            quizId: id,
          },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Quiz updated successfully" });
  } catch (error) {
    console.error("QUIZ_UPDATE_ERROR:", error);
    return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Delete quiz (cascades to questions and results due to onDelete: Cascade)
    await prisma.quiz.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("QUIZ_DELETE_ERROR:", error);
    return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}