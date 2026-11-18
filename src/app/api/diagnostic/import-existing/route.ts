import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/guard";
import { getTeacherScope } from "@/lib/teacher-scope";

export async function GET() {
  const { user, response } = await requireRole("ADMIN", "TEACHER");
  if (response) return response;
  const scope = user!.role === "TEACHER" ? await getTeacherScope(user!.id) : null;
  const quizzes = await prisma.quiz.findMany({
    where: {
      assessmentType: "QUIZ",
      isDiagnostic: false,
      grade: { level: { in: [3, 6, 9] } },
      ...(scope ? { AND: [scope.quizWhere] } : {}),
    },
    select: {
      id: true,
      title: true,
      isPublished: true,
      subject: { select: { name: true } },
      grade: { select: { level: true } },
      _count: { select: { questions: true } },
    },
    orderBy: [{ grade: { level: "asc" } }, { subject: { name: "asc" } }, { title: "asc" }],
  });
  return NextResponse.json({ quizzes: quizzes.map(quiz => ({ id: quiz.id, title: quiz.title, subject: quiz.subject.name, grade: quiz.grade.level, isPublished: quiz.isPublished, questionCount: quiz._count.questions })) });
}

export async function POST(request: Request) {
  const { user, response } = await requireRole("ADMIN", "TEACHER");
  if (response) return response;
  const body = await request.json().catch(() => ({}));
  const quizIds = Array.isArray(body.quizIds)
    ? [...new Set(body.quizIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0))]
    : typeof body.quizId === "string" ? [body.quizId] : [];
  if (quizIds.length < 1 || quizIds.length > 30) return NextResponse.json({ error: "Select between one and 30 quizzes." }, { status: 400 });

  const scope = user!.role === "TEACHER" ? await getTeacherScope(user!.id) : null;
  const source = await prisma.quiz.findMany({
    where: {
      id: { in: quizIds },
      assessmentType: "QUIZ",
      isDiagnostic: false,
      grade: { level: { in: [3, 6, 9] } },
      ...(scope ? { AND: [scope.quizWhere] } : {}),
    },
    include: {
      subject: { select: { name: true } },
      grade: { select: { level: true } },
      questions: { orderBy: { createdAt: "asc" } },
    },
  });
  if (source.length !== quizIds.length) return NextResponse.json({ error: "One or more selected quizzes are outside your assigned diagnostic scope." }, { status: 404 });
  const orderedSources = quizIds.map(id => source.find(quiz => quiz.id === id)!);
  if (orderedSources.some(quiz => quiz.questions.length === 0)) return NextResponse.json({ error: "Every selected quiz must contain at least one question." }, { status: 400 });
  const first = orderedSources[0];
  if (orderedSources.some(quiz => quiz.gradeId !== first.gradeId || quiz.subjectId !== first.subjectId)) {
    return NextResponse.json({ error: "One diagnostic can combine quizzes from the same grade and subject only. Filter to one grade and subject, then select quizzes." }, { status: 400 });
  }

  const sources = orderedSources.map(quiz => quiz.title);
  const title = `Diagnostic · ${first.subject.name} Grade ${first.grade.level} · ${orderedSources.length} Quiz${orderedSources.length === 1 ? "" : "zes"}`.slice(0, 160);
  const description = `Combined from platform quizzes: ${sources.join("; ")}. Review questions and publish when ready.`.slice(0, 2000);
  const diagnostic = await prisma.$transaction(async (tx) => {
    const created = await tx.quiz.create({
      data: {
        title,
        description,
        assessmentType: "QUIZ",
        isDiagnostic: true,
        isPublished: false,
        isShared: false,
        dueDate: null,
        gradeId: first.gradeId,
        subjectId: first.subjectId,
        creatorId: user!.id,
        outcomeId: first.outcomeId,
        questions: {
          create: orderedSources.flatMap(sourceQuiz => sourceQuiz.questions.map(question => ({
            questionText: question.questionText,
            questionType: question.questionType,
            options: question.options ?? [],
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            imageUrl: question.imageUrl,
            bloomLevel: question.bloomLevel,
            difficulty: question.difficulty,
            learningOutcomeId: question.learningOutcomeId,
          }))),
        },
      },
      select: { id: true, title: true },
    });
    return created;
  });
  return NextResponse.json({ quizId: diagnostic.id, title: diagnostic.title, sourceCount: orderedSources.length }, { status: 201 });
}
