import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canViewStudent } from "@/lib/guard";
import { getTeacherScope } from "@/lib/teacher-scope";
import PrintButton from "@/components/PrintButton";

export default async function QuizResultReport({ params }: { params: Promise<{ resultId: string }> }) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; role?: "STUDENT" | "TEACHER" | "ADMIN" } | undefined;
  if (!sessionUser?.id) redirect("/login");
  if (!["STUDENT", "TEACHER", "ADMIN"].includes(sessionUser.role || "")) redirect("/dashboard");
  const { resultId } = await params;

  const result = await prisma.result.findUnique({
    where: { id: resultId },
    include: {
      student: { include: { grade: true, class: true } },
      quiz: { include: { subject: true, grade: true, questions: { include: { learningOutcome: true }, orderBy: { createdAt: "asc" } } } },
      answers: { include: { question: { include: { learningOutcome: true } } } },
    },
  });
  if (!result) notFound();
  if (sessionUser.role === "STUDENT" && result.studentId !== sessionUser.id) redirect("/dashboard");
  if (sessionUser.role === "TEACHER") {
    const allowed = await canViewStudent({ id: sessionUser.id, role: "TEACHER" }, result.student);
    const scope = await getTeacherScope(sessionUser.id);
    const quizAllowed = await prisma.quiz.count({ where: { id: result.quizId, AND: [scope.quizWhere] } });
    if (!allowed || !quizAllowed) redirect("/dashboard/student-reports");
  }

  const savedAnswers = new Map(result.answers.map(answer => [answer.questionId, answer]));
  const questions = result.quiz.questions.map(question => ({ question, answer: savedAnswers.get(question.id) }));
  const percent = result.totalPoints ? Math.round((result.score / result.totalPoints) * 100) : 0;

  return <main id="student-report" className="mx-auto max-w-4xl space-y-6 text-slate-900">
    <div className="no-print"><Link href={sessionUser.role === "STUDENT" ? "/dashboard/quizzes/completed" : `/dashboard/student-reports/${result.studentId}?subject=All&grade=${result.student.grade?.level || ""}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16}/> Back</Link></div>
    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Quiz report</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{result.quiz.title}</h1><p className="mt-2 text-sm text-slate-600">{result.student.name} · Grade {result.student.grade?.level ?? "—"} · {result.student.class?.name ?? "No class"} · {result.quiz.subject.name}</p></div><PrintButton/></div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Score" value={`${result.score} / ${result.totalPoints}`}/><Metric label="Percentage" value={`${percent}%`}/><Metric label="Questions" value={questions.length}/><Metric label="Completed" value={result.completedAt.toLocaleDateString("en-SA")}/></div>
    </header>
    <section className="space-y-4"><div><h2 className="text-xl font-black">Question review</h2><p className="mt-1 text-sm text-slate-600">Incorrect and unanswered questions are marked for review, with the related learning outcome.</p></div>
      {questions.map(({ question, answer }, index) => {
        const correct = answer?.isCorrect ?? false;
        const options = Array.isArray(question.options) ? question.options as string[] : [];
        const outcome = question.learningOutcome;
        return <article key={question.id} className={`break-inside-avoid rounded-2xl border bg-white p-5 shadow-sm ${correct ? "border-emerald-200" : "border-rose-200"}`}>
          <div className="flex items-center justify-between gap-3"><h3 className="font-bold">Question {index + 1}</h3><span className={`inline-flex items-center gap-1 text-sm font-bold ${correct ? "text-emerald-700" : "text-rose-700"}`}>{correct ? <CheckCircle2 size={16}/> : <XCircle size={16}/>} {correct ? "Correct" : "Review"}</span></div>
          {question.imageUrl && <img src={question.imageUrl} alt="Question illustration" className="my-3 max-h-64 max-w-full object-contain"/>}
          <p className="mt-3 whitespace-pre-wrap leading-7">{question.questionText}</p>
          {options.length > 0 && <ol className="mt-3 grid gap-2 sm:grid-cols-2">{options.map((option, optionIndex) => <li key={optionIndex} className={`rounded-xl border px-3 py-2 text-sm ${option === question.correctAnswer ? "border-emerald-300 bg-emerald-50 font-semibold" : option === answer?.studentAnswer && !correct ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>{String.fromCharCode(65 + optionIndex)}. {option}</li>)}</ol>}
          <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2"><p><span className="font-semibold">Student answer:</span> {answer?.studentAnswer || "No answer"}</p><p><span className="font-semibold">Correct answer:</span> {question.correctAnswer}</p></div>
          {outcome && <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-sm"><p className="font-bold text-indigo-900">Related outcome</p><p className="mt-1 text-indigo-800">{outcome.outcomeText}</p>{outcome.indicatorText && <p className="mt-1 text-indigo-700">Indicator: {outcome.indicatorText}</p>}</div>}
        </article>;
      })}
    </section>
  </main>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 font-black text-slate-900">{value}</p></div>;
}
