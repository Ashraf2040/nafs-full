// src/app/api/quizzes/save/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

function generateSmartTitle(outcomeText: string, subject: string, grade: number): string {
  if (!outcomeText) return `${subject} Assessment - Grade ${grade}`;
  const clean = outcomeText.replace(/[^\w\s\-\.]/g, "").trim();
  const phrase = clean.split(/[\.;]/)[0].split(/\s+/).slice(0, 10).join(" ");
  return `${phrase} - ${subject} (Grade ${grade})`;
}

export async function POST(req: Request) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;
    const userRole = user!.role;
    const userId = user!.id;

    const {
      title,
      subjectName,
      gradeTarget,
      questions,
      isPublished,
      description,
      outcomeText,
      outcomeId,
    } = await req.json();

    if (typeof subjectName !== "string" || !subjectName.trim() || !Array.isArray(questions) || questions.length === 0 || gradeTarget == null) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }
    if (questions.length > 200) {
      return NextResponse.json({ message: "A quiz can contain at most 200 questions" }, { status: 400 });
    }
    const invalidQuestion = questions.find((question: any) =>
      !question?.question ||
      !question?.answer ||
      !Array.isArray(question.options) ||
      question.options.length < 2,
    );
    if (invalidQuestion) {
      return NextResponse.json({ message: "Every question needs text, at least two options, and a correct answer" }, { status: 400 });
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
          subject: { name: subjectName.trim() },
          grade: { level: gradeLevel },
        },
      });
      if (!assignment) {
        return NextResponse.json({ message: "You are not assigned to this subject/grade" }, { status: 403 });
      }
    }

    const subject = userRole === "ADMIN"
      ? await prisma.subject.upsert({
          where: { name: subjectName.trim() },
          update: {},
          create: { name: subjectName.trim() },
        })
      : await prisma.subject.findUnique({ where: { name: subjectName.trim() } });
    if (!subject) {
      return NextResponse.json({ message: "Subject not found" }, { status: 400 });
    }

    const requestedOutcomeIds = [...new Set([
      ...(outcomeId ? [String(outcomeId)] : []),
      ...questions.map((question: any) => question.learningOutcomeId).filter(Boolean).map(String),
    ])];
    if (requestedOutcomeIds.length > 0) {
      const matchingOutcomeCount = await prisma.learningOutcome.count({
        where: {
          id: { in: requestedOutcomeIds },
          grade: gradeLevel,
          subject: { equals: subject.name, mode: "insensitive" },
        },
      });
      if (matchingOutcomeCount !== requestedOutcomeIds.length) {
        return NextResponse.json({ message: "One or more indicators do not match the selected subject and grade" }, { status: 400 });
      }
    }

    const smartTitle = typeof title === "string" && title.trim()
      ? title.trim()
      : generateSmartTitle(outcomeText || "", subject.name, gradeLevel);

    const newQuiz = await prisma.quiz.create({
      data: {
        title: smartTitle,
        description: description || null,
        isPublished: isPublished ?? false,
        subjectId: subject.id,
        gradeId: gradeRecord.id,
        creatorId: userId,
        outcomeId: outcomeId || null,
        // dueDate is not set here — it will be set when published
        questions: {
          create: questions.map((q: any) => ({
            questionText: String(q.question).trim(),
            questionType: "MULTIPLE_CHOICE",
            correctAnswer: String(q.answer).trim(),
            options: q.options.map(String),
            explanation: q.explanation || null,
            imageUrl: q.image_url || null,
            learningOutcomeId: q.learningOutcomeId || outcomeId || null,
            bloomLevel: q.bloomLevel || null,
            difficulty: q.difficulty || null,
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
