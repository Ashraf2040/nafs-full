import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { grade3EnglishItems, grade3MathItems } from "@/lib/grade3Diagnostic";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;
    const { subjectName, gradeTarget, title: requestedTitle, refreshSource, quizId: requestedQuizId } = await req.json();
    const customDraft = gradeTarget != null || typeof requestedTitle === "string";
    if (typeof subjectName !== "string" || !subjectName.trim()) {
      return NextResponse.json({ message: "This Grade 3 diagnostic is not available yet." }, { status: 400 });
    }

    const level = customDraft ? Number(gradeTarget) : 3;
    if (![3, 6, 9].includes(level)) return NextResponse.json({ message: "Choose Grade 3, 6, or 9." }, { status: 400 });
    if (!customDraft && subjectName !== "Math" && subjectName !== "English") {
      return NextResponse.json({ message: "This Grade 3 diagnostic is not available yet." }, { status: 400 });
    }

    const grade = await prisma.grade.findUnique({ where: { level } });
    if (!grade) return NextResponse.json({ message: `Grade ${level} is not configured.` }, { status: 404 });
    const subject = await prisma.subject.findFirst({ where: { name: { equals: subjectName.trim(), mode: "insensitive" } } });
    if (!subject) return NextResponse.json({ message: `${subjectName} is not configured yet.` }, { status: 404 });

    if (user!.role === "TEACHER") {
      const assignment = await prisma.teacherAssignment.findFirst({
        where: { teacherId: user!.id, gradeId: grade.id, subjectId: subject.id },
      });
      if (!assignment) return NextResponse.json({ message: `You are not assigned to Grade ${level} ${subjectName}.` }, { status: 403 });
    }

    const title = customDraft
      ? (typeof requestedTitle === "string" && requestedTitle.trim() ? requestedTitle.trim() : `NAFS Grade ${level} ${subjectName.trim()} Diagnostic - Draft`)
      : `NAFS Grade 3 Diagnostic - ${subjectName}`;
    const existing = await prisma.quiz.findFirst({
      where: { ...(refreshSource && typeof requestedQuizId === "string" ? { id: requestedQuizId } : {}), title, gradeId: grade.id, subjectId: subject.id, isDiagnostic: true, ...(user!.role === "TEACHER" ? { creatorId: user!.id } : {}) },
      select: { id: true },
    });
    const items = customDraft ? [] : subjectName === "Math" ? grade3MathItems : grade3EnglishItems;
    const outcomes = !customDraft && ["Math", "English"].includes(subjectName) && level === 3
      ? await prisma.learningOutcome.findMany({ where: { grade: 3, subject: { equals: subjectName, mode: "insensitive" } } })
      : [];
    const outcomeFor = (code?: string, indicator?: number) => outcomes.find((outcome) =>
      outcome.outcomeText.startsWith(code || "") && (!indicator || outcome.indicatorText.startsWith(`${indicator}.`))
    );
    const questionData = items.map((item, index) => ({
      createdAt: new Date(Date.now() + index),
      questionText: item.prompt,
      questionType: "MULTIPLE_CHOICE",
      correctAnswer: item.answer,
      options: item.options,
      explanation: `${item.coverage ? `${item.coverage} · ` : ""}${item.outcomeCode ? `${item.outcomeCode} · ` : ""}${item.outcome}`,
      imageUrl: item.imageUrl || null,
      learningOutcomeId: item.coverage === "Not exist" ? null : outcomeFor(item.outcomeCode, item.outcomeIndicator)?.id || null,
    }));

    if (refreshSource && !existing) return NextResponse.json({ message: "The source diagnostic could not be found." }, { status: 404 });
    if (existing) {
      if (!refreshSource) return NextResponse.json({ quizId: existing.id, existing: true });
      if (customDraft || level !== 3 || !["Math", "English"].includes(subjectName)) {
        return NextResponse.json({ message: "Only the Grade 3 Math and English source assessments can be restored from the booklet." }, { status: 400 });
      }
      const current = await prisma.quiz.findUnique({ where: { id: existing.id }, select: { _count: { select: { results: true } } } });
      if (current && current._count.results > 0) {
        return NextResponse.json({ message: "This assessment has student submissions, so its questions cannot be replaced." }, { status: 409 });
      }
      await prisma.$transaction(async (tx) => {
        await tx.question.deleteMany({ where: { quizId: existing.id } });
        await tx.question.createMany({ data: questionData.map((question) => ({ ...question, quizId: existing.id })) });
        await tx.quiz.update({ where: { id: existing.id }, data: { isPublished: false, dueDate: null, description: `Preparation Form (A), Academic Year 2026-2027. ${subjectName === "Math" ? "Eight source items with exact diagram crops; use the item alignment notes as a screening guide." : "Five exact source questions with the original reading passage and illustration."}` } });
      });
      return NextResponse.json({ quizId: existing.id, existing: true, refreshed: true });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: customDraft
          ? "Diagnostic assessment draft. Add questions, outcome links, and visual assets before publishing."
          : `Preparation Form (A), Academic Year 2026-2027. ${subjectName === "Math" ? "Eight items; use the item alignment notes as a screening guide." : "Five exact Grade 3 English questions with the source reading passage."}`,
        isPublished: false,
        isDiagnostic: true,
        gradeId: grade.id,
        subjectId: subject.id,
        creatorId: user!.id,
        questions: { create: questionData },
      },
      select: { id: true },
    });
    return NextResponse.json({ quizId: quiz.id, existing: false }, { status: 201 });
  } catch (error) {
    console.error("DIAGNOSTIC_CREATE_ERROR", error);
    return NextResponse.json({ message: "Could not prepare this diagnostic." }, { status: 500 });
  }
}
