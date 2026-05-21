// src/app/api/quizzes/save/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

function generateSmartTitle(outcomeText: string, subject: string, grade: number): string {
  if (!outcomeText) return `${subject} Assessment - Grade ${grade}`;
  const clean = outcomeText.replace(/[^\w\s\-\.]/g, "").trim();
  const phrase = clean.split(/[\.;]/)[0].split(/\s+/).slice(0, 10).join(" ");
  return `${phrase} - ${subject} (Grade ${grade})`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized: Please log in." }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    if (userRole === "STUDENT") {
      return NextResponse.json({ message: "Forbidden: Students cannot create quizzes." }, { status: 403 });
    }

    const {
      title,
      subjectName,
      gradeTarget,
      questions,
      isPublished,
      description,
      outcomeText,
      outcomeId,        // ← ADDED
    } = await req.json();

    console.log("[SAVE_QUIZ] Payload received:", {
      subjectName,
      gradeTarget,
      outcomeId,
      questionCount: questions?.length,
    });

    if (!subjectName || !questions || gradeTarget == null) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const gradeLevel = parseInt(gradeTarget.toString());

    const gradeRecord = await prisma.grade.findUnique({
      where: { level: gradeLevel },
    });
    if (!gradeRecord) {
      return NextResponse.json({ message: `Grade ${gradeLevel} not found` }, { status: 400 });
    }

    if (userRole === "TEACHER") {
      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          teacherId: userId,
          subject: { name: subjectName },
          grade: { level: gradeLevel },
        },
      });
      if (!assignment) {
        return NextResponse.json({ message: "You are not assigned to this subject/grade" }, { status: 403 });
      }
    }

    const subject = await prisma.subject.upsert({
      where: { name: subjectName },
      update: {},
      create: { name: subjectName },
    });

    const smartTitle = title || generateSmartTitle(outcomeText || "", subjectName, gradeLevel);

    const newQuiz = await prisma.quiz.create({
      data: {
        title: smartTitle,
        description: description || null,
        isPublished: isPublished ?? false,
        subjectId: subject.id,
        gradeId: gradeRecord.id,
        creatorId: userId,
        outcomeId: outcomeId || null,   // ← ADDED
        questions: {
          create: questions.map((q: any) => ({
            questionText: q.question,
            questionType: "MULTIPLE_CHOICE",
            correctAnswer: q.answer,
            options: q.options,
            explanation: q.explanation,
            imageUrl: q.image_url || null,
            bloomLevel: null,
            difficulty: null,
          })),
        },
      },
      include: {
        subject: true,
        grade: true,
        outcome: true,
        questions: true,
      },
    });

    console.log("[SAVE_QUIZ] Created quiz shape:", JSON.stringify(newQuiz, null, 2));

    return NextResponse.json(
      { message: "Quiz saved successfully", quizId: newQuiz.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("QUIZ_SAVE_ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}