import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import QuizManager from "@/components/QuizManager";
import QuizFilterBar from "../quizzes/QuizFilterBar";
import QuizGridSection from "../quizzes/QuizGridSection";
import BulkDeleteAssessmentsButton from "../quizzes/BulkDeleteAssessmentsButton";

export default async function PracticesPage({ searchParams }: { searchParams: Promise<{ subject?: string; grade?: string; outcome?: string; indicator?: string; page?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const role = session.user.role;
  const params = await searchParams;
  return <div className="mx-auto max-w-7xl space-y-8">
    {(role === "ADMIN" || role === "TEACHER") && <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:p-8"><QuizManager assessmentType="PRACTICE" /></div>}
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{role === "STUDENT" ? "Available Practices" : "Practice Library"}</h1><p className="mt-1.5 text-sm text-slate-500">Practise skills at your own pace. Completion is recorded without a grade.</p></div>{(role === "ADMIN" || role === "TEACHER") && <BulkDeleteAssessmentsButton assessmentType="PRACTICE" />}</header>
      {role !== "STUDENT" && <Suspense fallback={<div className="h-10 animate-pulse rounded-xl bg-slate-100" />}><QuizFilterBar userRole={role} userId={session.user.id} filterSubject={params.subject} filterGrade={params.grade ? parseInt(params.grade) : null} filterOutcome={params.outcome} filterIndicator={params.indicator}/></Suspense>}
      <Suspense fallback={<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{Array.from({length:6},(_,i)=><div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100"/>)}</div>}><QuizGridSection userRole={role} userId={session.user.id} filterSubject={params.subject} filterGrade={params.grade ? parseInt(params.grade) : null} filterOutcome={params.outcome} filterIndicator={params.indicator} currentPage={Math.max(1, parseInt(params.page || "1"))} assessmentType="PRACTICE" /></Suspense>
    </section>
  </div>;
}
