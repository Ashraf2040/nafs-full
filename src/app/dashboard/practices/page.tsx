import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import QuizManager from "@/components/QuizManager";
import QuizFilterBar from "../quizzes/QuizFilterBar";
import QuizGridSection from "../quizzes/QuizGridSection";
import BulkDeleteAssessmentsButton from "../quizzes/BulkDeleteAssessmentsButton";
import { BookOpenCheck } from "lucide-react";

export default async function PracticesPage({ searchParams }: { searchParams: Promise<{ subject?: string; grade?: string; outcome?: string; indicator?: string; page?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const role = session.user.role;
  const params = await searchParams;
  return <div className="mx-auto max-w-7xl space-y-8">
    {(role === "ADMIN" || role === "TEACHER") && <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:p-8"><QuizManager assessmentType="PRACTICE" /></div>}
    <section className="space-y-6">
      <header className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="flex min-w-0 items-start gap-3 sm:gap-4"><span className="shrink-0 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-700"><BookOpenCheck size={22} /></span><div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{role === "STUDENT" ? "Available Practices" : "Practice Library"}</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">{role === "STUDENT" ? "Choose a practice set for your grade. Your progress is saved separately from graded quiz results." : role === "TEACHER" ? "Create and manage practice sets for your assigned classes. Student practice progress is tracked separately from quiz scores." : "Manage the platform practice library and keep student practice progress separate from graded quiz results."}</p></div></div>
        {(role === "ADMIN" || role === "TEACHER") && <BulkDeleteAssessmentsButton assessmentType="PRACTICE" />}
      </header>
      {role !== "STUDENT" && <Suspense fallback={<div className="h-10 animate-pulse rounded-xl bg-slate-100" />}><QuizFilterBar assessmentType="PRACTICE" userRole={role} userId={session.user.id} filterSubject={params.subject} filterGrade={params.grade ? parseInt(params.grade) : null} filterOutcome={params.outcome} filterIndicator={params.indicator}/></Suspense>}
      <Suspense fallback={<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({length:6},(_,i)=><div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100"/>)}</div>}><QuizGridSection userRole={role} userId={session.user.id} filterSubject={params.subject} filterGrade={params.grade ? parseInt(params.grade) : null} filterOutcome={params.outcome} filterIndicator={params.indicator} currentPage={Math.max(1, parseInt(params.page || "1"))} assessmentType="PRACTICE" /></Suspense>
    </section>
  </div>;
}
