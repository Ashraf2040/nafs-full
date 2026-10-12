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
      <header><h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"><span className="rounded-xl border border-violet-100 bg-violet-50 p-2.5 text-violet-600"><ClipboardCheck size={22}/></span>{role === "STUDENT" ? "Graded Quizzes" : "Quiz Library"}</h1><p className="ml-[46px] mt-1.5 text-sm text-slate-500">Quizzes are graded and contribute to student score reports.</p></header>
      {role !== "STUDENT" && <QuizFilterBar userRole={role} userId={userId} filterSubject={subject} filterGrade={grade} filterOutcome={outcome} filterIndicator={indicator}/>}
      <QuizGridSection userRole={role} userId={userId} filterSubject={subject} filterGrade={grade} filterOutcome={outcome} filterIndicator={indicator} currentPage={page} assessmentType="QUIZ"/>
    </section>
  </div>;
}
