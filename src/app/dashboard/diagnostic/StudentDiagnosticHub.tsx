import Link from "next/link";
import { Activity, ArrowRight, BookOpenCheck, Brain, CheckCircle2, ClipboardList, FlaskConical, LockKeyhole, Play, Trophy } from "lucide-react";

type QuizSummary = {
  id: string;
  title: string;
  subject: string;
  questionCount: number;
  result: { score: number; attemptsCount: number; completedAt: Date } | null;
};

const subjectNames = (grade: number) => grade === 3 ? ["Math", "English"] : ["Math", "English", "Science"];

export default function StudentDiagnosticHub({ gradeLevel, quizzes }: { gradeLevel: number | null; quizzes: QuizSummary[] }) {
  const subjects = gradeLevel && [3, 6, 9].includes(gradeLevel) ? subjectNames(gradeLevel) : [];

  return <div className="mx-auto max-w-7xl space-y-7">
    <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-7 text-white shadow-xl sm:p-10">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" /><div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-fuchsia-300/10 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold"><BookOpenCheck size={14} /> NAFS diagnostics</span><h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Your diagnostic practice</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">Choose a subject to see the assessments available for your grade. Your results show which outcomes are secure and where to practise next.</p></div><div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold">{gradeLevel ? `Grade ${gradeLevel}` : "Grade not assigned"}</div></div>
    </header>

    {!gradeLevel || subjects.length === 0 ? <section className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center"><LockKeyhole size={34} className="mx-auto text-slate-300" /><h2 className="mt-4 text-lg font-extrabold text-slate-800">Your grade is not set up yet</h2><p className="mt-1 text-sm text-slate-500">Ask your teacher to add your grade so the right diagnostics appear here.</p></section> : <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Grade {gradeLevel}</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Choose a subject</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{subjects.length} subjects</span></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject) => {
          const assessments = quizzes.filter((quiz) => quiz.subject.toLowerCase() === subject.toLowerCase());
          const Icon = subject === "Science" ? FlaskConical : subject === "Math" ? Brain : ClipboardList;
          return <article key={subject} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm"><Icon size={20} /></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${assessments.length ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{assessments.length ? `${assessments.length} available` : "Coming soon"}</span></div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">{subject}</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">{assessments.length ? "Published diagnostics for your grade" : "Your teacher has not published a diagnostic here yet."}</p>
            {assessments.length > 0 && <div className="mt-4 space-y-3">{assessments.map((quiz) => {
              const attempts = quiz.result?.attemptsCount ?? 0;
              const attemptsLeft = Math.max(0, 3 - attempts);
              return <div key={quiz.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-bold leading-5 text-slate-800">{quiz.title}</p>
                <p className="mt-1 text-xs text-slate-500">{quiz.questionCount} questions · up to 3 attempts</p>
                {quiz.result && <div className="mt-3 flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700"><Trophy size={13} /> Best score</span><span className="text-sm font-extrabold text-indigo-800">{quiz.result.score}%</span></div>}
                {attemptsLeft > 0 ? <Link href={`/dashboard/quizzes/solve/${quiz.id}`} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">{quiz.result ? "Try again" : "Start diagnostic"}<Play size={15} /></Link> : <div className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700"><CheckCircle2 size={15} /> Attempts complete</div>}
                {quiz.result && <p className="mt-2 text-center text-[11px] text-slate-400">{attemptsLeft} {attemptsLeft === 1 ? "attempt" : "attempts"} remaining</p>}
              </div>;
            })}</div>}
          </article>;
        })}
      </div>
    </section>}

    <Link href="/dashboard/diagnostic/analysis" className="group flex flex-col gap-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-6 text-white shadow-lg transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-indigo-200"><Activity size={23} /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-200">Your outcomes</p><h2 className="mt-1 text-2xl font-extrabold">Analysis and progress</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/75">Review your overall mastery, outcome progress, and areas to practise.</p></div></div><span className="inline-flex items-center gap-2 self-end text-sm font-bold text-white/80 sm:self-auto">View analysis <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></span>
    </Link>
  </div>;
}
