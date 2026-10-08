import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, Clock3, Pencil, Send } from "lucide-react";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { grade3EnglishItems, grade3MathItems, grade3Passage, grade3PassageImage } from "@/lib/grade3Diagnostic";

export const dynamic = "force-dynamic";

export default async function DiagnosticPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role === "STUDENT") redirect("/dashboard/diagnostic");
  const { id } = await params;
  const quiz = await prisma.quiz.findUnique({ where: { id }, include: { grade: true, subject: true, questions: { include: { learningOutcome: true }, orderBy: { createdAt: "asc" } } } });
  if (!quiz || !quiz.isDiagnostic) notFound();
  if (session.user.role === "TEACHER" && quiz.creatorId !== session.user.id) {
    const assignment = await prisma.teacherAssignment.findUnique({ where: { teacherId_subjectId_gradeId: { teacherId: session.user.id, subjectId: quiz.subjectId, gradeId: quiz.gradeId } }, select: { id: true } });
    if (!assignment) notFound();
  }

  const isGrade3Math = quiz.grade.level === 3 && quiz.subject.name.toLowerCase() === "math";
  const isGrade3English = quiz.grade.level === 3 && quiz.subject.name.toLowerCase() === "english";
  const sourceItems = isGrade3Math ? grade3MathItems : isGrade3English ? grade3EnglishItems : [];
  return <div className="mx-auto max-w-5xl space-y-6">
    <Link href="/dashboard/diagnostic" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} /> Back to diagnostic library</Link>
    <header className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"><div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" /><div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8"><div><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${quiz.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{quiz.isPublished ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}{quiz.isPublished ? "Published" : "Draft"}</span><h1 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">{quiz.title}</h1><p className="mt-2 text-sm text-slate-500">Grade {quiz.grade.level} · {quiz.subject.name} · {quiz.questions.length} questions · Preparation Form (A)</p><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{quiz.description}</p></div><div className="flex flex-wrap gap-2"><a href="/diagnostics/grade3-preparation-form-a.pdf" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><BookOpen size={16} /> View booklet</a><Link href={`/dashboard/quizzes/edit/${quiz.id}`} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"><Pencil size={16} /> Edit questions</Link></div></div></header>
    {isGrade3English && <section className="rounded-2xl border border-sky-100 bg-sky-50/80 p-5"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sky-700">Reading passage</p><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700"><img src={grade3PassageImage} alt="Linda caring for the plants in her garden" className="float-right mb-3 ml-4 w-48 rounded-xl" />{grade3Passage}</p></section>}
    {isGrade3Math && <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5"><h2 className="font-bold text-indigo-950">Outcome alignment guide</h2><p className="mt-1 text-sm leading-6 text-indigo-900/75">Aligned outcomes are directly sampled. Partially aligned items should be followed by a full-range re-test. Item 2 is marked “Not exist” in the supplied alignment report and should be treated as a curriculum gap regardless of score.</p><div className="mt-3 flex flex-wrap gap-2">{["2 Aligned", "5 Partially aligned", "1 Not exist"].map((label) => <span key={label} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">{label}</span>)}</div></section>}
    <section className="space-y-4">{quiz.questions.map((question, index) => {
      const source = sourceItems[index];
      const code = source?.outcomeCode;
      return <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-extrabold text-indigo-700">{source?.number ?? index + 1}</span><div className="min-w-0 flex-1"><h2 className="font-bold leading-6 text-slate-900">{question.questionText}</h2>{question.imageUrl && <img src={question.imageUrl} alt="Question visual" className="mt-4 max-h-64 rounded-xl border border-slate-200 object-contain" />}<div className="mt-4 grid gap-2 sm:grid-cols-2">{Array.isArray(question.options) && question.options.map((option, optionIndex) => <div key={optionIndex} className={`rounded-xl border px-3 py-2.5 text-sm ${String(option) === question.correctAnswer ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-800" : "border-slate-100 bg-slate-50 text-slate-600"}`}>{String(option)}</div>)}</div><div className="mt-4 flex flex-wrap items-center gap-2"><span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">Answer: {question.correctAnswer}</span>{question.learningOutcome && <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600">{code ? `${code} · ` : ""}{question.learningOutcome.indicatorText}</span>}{source?.coverage && <span className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${source.coverage === "Aligned" ? "bg-emerald-50 text-emerald-700" : source.coverage === "Not exist" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{source.coverage}</span>}</div>{question.explanation && <p className="mt-3 text-xs leading-5 text-slate-500">Outcome: {question.explanation}</p>}</div></div></article>;
    })}</section>
    <footer className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-6 text-amber-900">{isGrade3English ? <><strong>Source fidelity.</strong> Questions 9–13, their answer choices, the reading passage, and its garden illustration follow Preparation Form (A). Each question is mapped to the closest Grade 3 English indicator.</> : <><strong>Use the booklet for diagram fidelity.</strong> The digital items preserve the answer key and mapped outcomes. For the original number lines, patterns, grids, and pictograph, use the booklet as the visual reference when adding question images.</>}</footer>
  </div>;
}
