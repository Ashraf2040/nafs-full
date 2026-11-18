import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import QuizManager2 from "@/components/QuizManager";
import QuizFilterBar from "../QuizFilterBar";
import QuizGridSection from "../QuizGridSection";
import { ClipboardCheck } from "lucide-react";

export default async function GradedQuizzesPage({ searchParams }: { searchParams: Promise<{ subject?: string; grade?: string; outcome?: string; indicator?: string; page?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  const userId = session.user.id;
  if (!userId) redirect("/login");
  const params = await searchParams;
  const subject = params.subject;
  const grade = params.grade ? parseInt(params.grade) : null;
  const outcome = params.outcome;
  const indicator = params.indicator;
  const page = Math.max(1, parseInt(params.page || "1"));
  return <div className="mx-auto max-w-7xl space-y-8">
    {(role === "ADMIN" || role === "TEACHER") && <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:p-8"><QuizManager2 assessmentType="QUIZ" /></div>}
    <section className="space-y-6">
      <header className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"/><div className="flex min-w-0 items-start gap-3 sm:gap-4"><span className="shrink-0 rounded-2xl border border-violet-100 bg-violet-50 p-3 text-violet-700"><ClipboardCheck size={22}/></span><div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{role === "STUDENT" ? "Graded Quizzes" : "Quiz Library"}</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">{role === "STUDENT" ? "Take published quizzes for your grade and review your scores and attempts." : role === "TEACHER" ? "Create and publish graded quizzes for your assigned classes, then review student results." : "Manage graded quizzes, publication, and student assessment access across the platform."}</p></div></div></header>
      {role !== "STUDENT" && <QuizFilterBar assessmentType="QUIZ" userRole={role} userId={userId} filterSubject={subject} filterGrade={grade} filterOutcome={outcome} filterIndicator={indicator}/>}
      <QuizGridSection userRole={role} userId={userId} filterSubject={subject} filterGrade={grade} filterOutcome={outcome} filterIndicator={indicator} currentPage={page} assessmentType="QUIZ"/>
    </section>
  </div>;
}
