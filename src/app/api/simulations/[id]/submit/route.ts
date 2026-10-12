import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

const norm = (value: unknown) => String(value ?? "").replace(/^\s*(?:[A-Z]|\d+)\s*[.)\-:]\s*/i, "").trim().toLowerCase();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireRole("STUDENT");
  if (response) return response;
  const { id } = await params;
  const body = await req.json();
  const simulation = await prisma.simulation.findFirst({
    where: { id, isPublished: true, gradeId: user!.gradeId ?? "" },
    include: {
      subjects: { include: { subject: { select: { name: true } }, quiz: { include: { questions: { select: { id: true, options: true, correctAnswer: true, explanation: true } } } }, questions: { select: { id: true, options: true, correctAnswer: true, explanation: true } } } },
    },
  });
  if (!simulation || (simulation.dueDate && simulation.dueDate < new Date())) return NextResponse.json({ message: "Simulation is unavailable" }, { status: 404 });
  if (body.retake === true) {
    await prisma.simulationAttempt.deleteMany({ where: { simulationId: id, studentId: user!.id } });
    return NextResponse.json({ success: true });
  }
  const answers = body.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return NextResponse.json({ message: "Answer sheet is required" }, { status: 400 });
  const questions = simulation.subjects.flatMap(section => (section.quiz?.questions ?? section.questions).map(question => ({ ...question, subjectName: section.subject.name })));
  const review = questions.map(question => {
    const choices = Array.isArray(question.options) ? question.options.map(String) : [];
    const answer = norm(question.correctAnswer);
    const correctAnswer = choices.find(option => norm(option) === answer) ?? (/^[A-Z]$/i.test(answer) ? choices[answer.toUpperCase().charCodeAt(0) - 65] : question.correctAnswer);
    const studentAnswer = String(answers[question.id] ?? "");
    return { questionId: question.id, subjectName: question.subjectName, correct: Boolean(studentAnswer && norm(correctAnswer) === norm(studentAnswer)), studentAnswer, correctAnswer: correctAnswer || question.correctAnswer, explanation: question.explanation };
  });
  const correct = review.filter(answer => answer.correct).length;
  const score = questions.length ? Math.round(correct * 10000 / questions.length) / 100 : 0;
  const subjectScores = simulation.subjects.map(section => {
    const subjectReview = review.filter(answer => answer.subjectName === section.subject.name);
    const subjectCorrect = subjectReview.filter(answer => answer.correct).length;
    return { subjectName: section.subject.name, correct: subjectCorrect, total: subjectReview.length, score: subjectReview.length ? Math.round(subjectCorrect * 10000 / subjectReview.length) / 100 : 0 };
  });
  const attempt = await prisma.simulationAttempt.upsert({ where: { simulationId_studentId: { simulationId: id, studentId: user!.id } }, create: { simulationId: id, studentId: user!.id, answerSheet: answers, score, totalItems: questions.length }, update: { answerSheet: answers, score, totalItems: questions.length, completedAt: new Date() } });
  return NextResponse.json({ score: attempt.score, totalItems: attempt.totalItems, correctAnswers: correct, incorrectAnswers: questions.length - correct, subjectScores, review, completedAt: attempt.completedAt });
}
