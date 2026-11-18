import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Award, BarChart3, BookOpenCheck, CircleAlert, Users } from "lucide-react";
import { getAuthUser } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { getTeacherScope } from "@/lib/teacher-scope";

const normalize = (value: unknown) => String(value ?? "").replace(/^\s*(?:[A-Z]|\d+)\s*[.)\-:]\s*/i, "").trim().toLowerCase();

export default async function TestClassReport({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard/simulations");
  const { id } = await params;
  const test = await prisma.simulation.findUnique({
    where: { id },
    include: {
      grade: { select: { level: true } },
      subjects: {
        include: {
          subject: { select: { name: true } },
          quiz: { include: { questions: { include: { learningOutcome: true }, orderBy: { createdAt: "asc" } } } },
          questions: true,
        },
      },
      attempts: {
        include: { student: { select: { id: true, name: true, class: { select: { name: true } } } } },
        orderBy: { completedAt: "desc" },
      },
    },
  });
  if (!test || test.creatorId !== user.id) notFound();
  const scope = await getTeacherScope(user.id);
  if (test.subjects.some(section => !scope.assignments.some(item => item.gradeId === test.gradeId && item.subjectId === section.subjectId))) notFound();
  const sourceQuizIds = test.subjects.flatMap(section => section.quizId ? [section.quizId] : []);
  if (sourceQuizIds.length) {
    const allowed = await prisma.quiz.count({ where: { id: { in: sourceQuizIds }, AND: [scope.quizWhere] } });
    if (allowed !== sourceQuizIds.length) notFound();
  }

  const questions = test.subjects.flatMap(section => (section.quiz?.questions ?? section.questions).map(question => ({
    ...question,
    subject: section.subject.name,
    outcome: "learningOutcome" in question ? question.learningOutcome : null,
  })));
  const attempts = test.attempts.map(attempt => {
    const answers = attempt.answerSheet && typeof attempt.answerSheet === "object" && !Array.isArray(attempt.answerSheet)
      ? attempt.answerSheet as Record<string, unknown>
      : {};
    const review = questions.map((question, index) => {
      const choices = Array.isArray(question.options) ? question.options.map(String) : [];
      const rawCorrect = String(question.correctAnswer ?? "");
      const correctAnswer = choices.find(choice => normalize(choice) === normalize(rawCorrect)) ?? (/^[A-Z]$/i.test(rawCorrect) ? choices[rawCorrect.toUpperCase().charCodeAt(0) - 65] : rawCorrect);
      const studentAnswer = String(answers[question.id] ?? "");
      return { index: index + 1, subject: question.subject, text: question.questionText, studentAnswer: studentAnswer || "No answer", correctAnswer: correctAnswer || rawCorrect, isCorrect: Boolean(studentAnswer && normalize(studentAnswer) === normalize(correctAnswer || rawCorrect)), outcome: question.outcome };
    });
    const correct = review.filter(item => item.isCorrect).length;
    const accuracy = review.length ? Math.round(correct / review.length * 100) : 0;
    return { ...attempt, answers: review, correct, accuracy };
  });
  const average = attempts.length ? Math.round(attempts.reduce((sum, item) => sum + item.accuracy, 0) / attempts.length) : null;
  const passing = attempts.filter(item => item.accuracy >= 70).length;
  const needsSupport = attempts.filter(item => item.accuracy < 70).length;

  const bySubject = test.subjects.map(section => {
    const subjectQuestions = questions.filter(question => question.subject === section.subject.name);
    const correct = attempts.reduce((sum, attempt) => sum + attempt.answers.filter(answer => answer.subject === section.subject.name && answer.isCorrect).length, 0);
    const total = attempts.reduce((sum, attempt) => sum + attempt.answers.filter(answer => answer.subject === section.subject.name).length, 0);
    return { name: section.subject.name, count: subjectQuestions.length, accuracy: total ? Math.round(correct / total * 100) : null };
  });
  const outcomeMap = new Map<string, { id: string; indicator: string; outcomeText: string; subject: string; correct: number; total: number; students: Map<string, { name: string; correct: number; total: number; wrongQuestions: string[] }> }>();
  for (const attempt of attempts) for (const answer of attempt.answers) {
    if (!answer.outcome) continue;
    const outcome = answer.outcome;
    const row = outcomeMap.get(outcome.id) ?? { id: outcome.id, indicator: outcome.indicatorText, outcomeText: outcome.outcomeText, subject: answer.subject, correct: 0, total: 0, students: new Map() };
    row.total++;
    if (answer.isCorrect) row.correct++;
    const student = row.students.get(attempt.studentId) ?? { name: attempt.student.name || "Student", correct: 0, total: 0, wrongQuestions: [] };
    student.total++;
    if (answer.isCorrect) student.correct++;
    else student.wrongQuestions.push(`Q${answer.index}: ${answer.text}`);
    row.students.set(attempt.studentId, student);
    outcomeMap.set(outcome.id, row);
  }
  const outcomeRows = [...outcomeMap.values()].map(item => ({ ...item, accuracy: item.total ? Math.round(item.correct / item.total * 100) : 0, students: [...item.students.values()].sort((a, b) => (a.total ? a.correct / a.total : 0) - (b.total ? b.correct / b.total : 0)) })).sort((a, b) => a.accuracy - b.accuracy);
  const focusOutcomes = outcomeRows.filter(item => item.accuracy < 70);

  return <main className="mx-auto max-w-7xl space-y-6">
    <Link href="/dashboard/simulations" className="no-print inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16}/> Back to Tests</Link>
    <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="h-1.5 bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500"/><div className="p-5 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.15em] text-indigo-700"><BookOpenCheck size={16}/> Teacher class report</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{test.title}</h1><p className="mt-2 text-sm text-slate-600">Grade {test.grade.level} · {test.subjects.map(item => item.subject.name).join(" · ")} · {questions.length} questions</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${test.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{test.isPublished ? "Published" : "Draft"}</span></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<Users size={18}/>} label="Student submissions" value={`${attempts.length}`}/><Metric icon={<BarChart3 size={18}/>} label="Class average" value={average === null ? "—" : `${average}%`}/><Metric icon={<Award size={18}/>} label="At or above 70%" value={`${passing} / ${attempts.length}`}/><Metric icon={<CircleAlert size={18}/>} label="Need support" value={`${needsSupport} students`}/></div>
    </div></header>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-4"><h2 className="text-xl font-black text-slate-900">Performance by subject</h2><p className="mt-1 text-sm text-slate-500">Accuracy is calculated from submitted answers in this test.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{bySubject.map((item, index) => <div key={`${item.name}-${index}`} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><b className="text-slate-900">{item.name}</b><b className={`text-lg ${(item.accuracy ?? 0) < 70 ? "text-amber-700" : "text-emerald-700"}`}>{item.accuracy === null ? "—" : `${item.accuracy}%`}</b></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${(item.accuracy ?? 0) < 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${item.accuracy ?? 0}%` }}/></div><p className="mt-2 text-xs text-slate-500">{item.count} questions</p></div>)}</div></section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-4"><h2 className="text-xl font-black text-slate-900">Outcomes needing attention</h2><p className="mt-1 text-sm text-slate-500">Outcomes below 70% cohort accuracy. Expand an outcome to see which students missed it.</p></div>{!outcomeRows.length ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No linked learning outcomes were found in this test’s quiz questions.</p> : focusOutcomes.length === 0 ? <p className="rounded-2xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">All assessed outcomes are at or above 70% accuracy.</p> : <div className="space-y-3">{focusOutcomes.map(outcome => <details key={outcome.id} className="rounded-2xl border border-amber-200 bg-amber-50/40"><summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4"><span className="min-w-0 flex-1"><b className="block text-slate-900">{outcome.indicator || outcome.outcomeText}</b><span className="mt-1 block text-xs text-slate-600">{outcome.subject} · {outcome.students.length} students assessed · {outcome.total} answers</span></span><b className="text-lg text-amber-800">{outcome.accuracy}%</b></summary><div className="space-y-2 border-t border-amber-100 p-4">{outcome.students.map((student, index) => <div key={`${student.name}-${index}`} className="rounded-xl bg-white p-3"><div className="flex flex-wrap justify-between gap-2"><b className="text-sm">{student.name}</b><span className="text-sm font-bold text-amber-800">{student.total ? Math.round(student.correct / student.total * 100) : 0}% · {student.correct}/{student.total}</span></div>{student.wrongQuestions.length > 0 && <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-5 text-slate-600">{student.wrongQuestions.map((question, questionIndex) => <li key={questionIndex}>{question}</li>)}</ul>}</div>)}</div></details>)}</div>}</section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-4"><h2 className="text-xl font-black text-slate-900">Full class report</h2><p className="mt-1 text-sm text-slate-500">Expand a student to review every response, correct answer, and linked outcome.</p></div>{!attempts.length ? <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">No student submissions yet. Results will appear here after students complete the test.</p> : <div className="space-y-3">{attempts.map(attempt => <details key={attempt.id} className="rounded-2xl border border-slate-200"><summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4"><span className="min-w-0 flex-1"><b className="block text-slate-900">{attempt.student.name || "Student"}</b><span className="mt-1 block text-xs text-slate-500">{attempt.student.class?.name || "No class"} · Submitted {attempt.completedAt.toLocaleDateString("en-SA")}</span></span><span className={`rounded-full px-3 py-1 text-sm font-extrabold ${attempt.accuracy < 70 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>{attempt.accuracy}% · {attempt.correct}/{questions.length}</span></summary><div className="space-y-2 border-t border-slate-100 p-4">{attempt.answers.map(answer => <article key={answer.index} className={`break-inside-avoid rounded-xl border p-3 ${answer.isCorrect ? "border-emerald-100 bg-emerald-50/40" : "border-rose-100 bg-rose-50/50"}`}><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm text-slate-900">Q{answer.index} · {answer.subject}</b><span className={`text-xs font-bold ${answer.isCorrect ? "text-emerald-700" : "text-rose-700"}`}>{answer.isCorrect ? "Correct" : "Review"}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{answer.text}</p><p className="mt-2 text-xs leading-5 text-slate-600">Student: <b>{answer.studentAnswer}</b> · Correct: <b>{answer.correctAnswer}</b></p>{answer.outcome && <p className="mt-2 rounded-lg bg-indigo-50 p-2 text-xs leading-5 text-indigo-800"><b>Outcome:</b> {answer.outcome.outcomeText}<span className="block">{answer.outcome.indicatorText}</span></p>}</article>)}</div></details>)}</div>}</section>
  </main>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"><span className="text-indigo-600">{icon}</span><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-900">{value}</p></div></div>;
}
