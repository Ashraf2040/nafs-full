import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { ClipboardCheck, Sparkles } from "lucide-react";
import DiagnosticHub from "./DiagnosticHub";
import StudentDiagnosticHub from "./StudentDiagnosticHub";

export const dynamic = "force-dynamic";

export default async function DiagnosticPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role === "STUDENT") {
    const grade = session.user.gradeId
      ? await prisma.grade.findUnique({ where: { id: session.user.gradeId }, select: { level: true } })
      : null;
    const quizzes = session.user.gradeId
      ? await prisma.quiz.findMany({
          where: {
            isDiagnostic: true,
            isPublished: true,
            gradeId: session.user.gradeId,
            OR: [{ dueDate: null }, { dueDate: { gte: new Date() } }],
          },
          include: {
            subject: { select: { name: true } },
            _count: { select: { questions: true } },
            results: {
              where: { studentId: session.user.id },
              select: { score: true, attemptsCount: true, completedAt: true },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    return <StudentDiagnosticHub gradeLevel={grade?.level ?? null} quizzes={quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      subject: quiz.subject.name,
      questionCount: quiz._count.questions,
      result: quiz.results[0] ?? null,
    }))} />;
  }

  const quizzes = await prisma.quiz.findMany({
    where: { isDiagnostic: true, grade: { level: { in: [3, 6, 9] } }, ...(session.user.role === "TEACHER" ? { creatorId: session.user.id } : {}) },
    include: { grade: { select: { level: true } }, subject: { select: { name: true } }, _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
  });
  const summaries = quizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    subject: quiz.subject.name,
    grade: quiz.grade.level,
    isPublished: quiz.isPublished,
    questionCount: quiz._count.questions,
  }));

  return <div className="mx-auto max-w-7xl space-y-7">
    <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-7 text-white shadow-xl sm:p-10">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" /><div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-fuchsia-300/10 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold"><ClipboardCheck size={14} /> Diagnostic workspace</span><h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Assessment library</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">Prepare, review, and publish focused NAFS diagnostics. Track student understanding by the outcomes each question measures.</p></div><div className="flex items-center gap-2 text-sm font-semibold text-white/80"><Sparkles size={17} /> Grades 3, 6 &amp; 9</div></div>
    </header>
    <DiagnosticHub quizzes={summaries} />
  </div>;
}
