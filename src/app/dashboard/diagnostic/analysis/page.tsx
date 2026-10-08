import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, BookOpenCheck, CircleAlert, Target } from "lucide-react";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import GradeDiagnosticAnalysis, { type AnalysisStudent, type OutcomeSummary } from "./GradeDiagnosticAnalysis";

export const dynamic = "force-dynamic";

type DiagnosticReportResult = {
  quiz: { subject: { name: string }; grade: { level: number } };
  answers: Array<{
    isCorrect: boolean;
    question: {
      explanation: string | null;
      learningOutcome: { id: string; indicatorText: string; outcomeText: string } | null;
    };
  }>;
};

type CohortDiagnosticResult = DiagnosticReportResult & {
  quizId: string;
  score: number;
  student: { id: string };
  quiz: DiagnosticReportResult["quiz"] & { id: string; gradeId: string };
};

function reportOutcomes(results: DiagnosticReportResult[]): OutcomeSummary[] {
  const grouped = new Map<string, OutcomeSummary>();
  for (const result of results) {
    for (const answer of result.answers) {
      const question = answer.question;
      const outcome = question.learningOutcome;
      const key = `${result.quiz.subject.name}:${outcome?.id || question.explanation || "unmapped"}`;
      const current = grouped.get(key) || {
        key,
        subject: result.quiz.subject.name,
        name: outcome?.indicatorText || outcome?.outcomeText || question.explanation || "Unmapped outcome",
        grade: result.quiz.grade.level,
        correct: 0,
        attempted: 0,
        accuracy: 0,
        curriculumGap: question.explanation?.startsWith("Not exist") || false,
      };
      current.attempted += 1;
      if (answer.isCorrect) current.correct += 1;
      current.accuracy = Math.round((current.correct / current.attempted) * 100);
      current.curriculumGap ||= question.explanation?.startsWith("Not exist") || false;
      grouped.set(key, current);
    }
  }
  return [...grouped.values()].sort((a, b) => a.accuracy - b.accuracy);
}

export default async function DiagnosticAnalysisPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if (session.user.role === "STUDENT") {
    const results = await prisma.result.findMany({
      where: { studentId: session.user.id, quiz: { isDiagnostic: true, isPublished: true } },
      include: {
        quiz: { include: { grade: { select: { level: true } }, subject: { select: { name: true } } } },
        answers: { include: { question: { include: { learningOutcome: true } } } },
      },
      orderBy: { completedAt: "desc" },
    });
    const outcomes = reportOutcomes(results);
    const mastered = outcomes.filter((item) => !item.curriculumGap && item.accuracy >= 70);
    const focus = outcomes.filter((item) => item.curriculumGap || item.accuracy < 70);
    return <main className="mx-auto max-w-7xl space-y-6">
      <Link href="/dashboard/diagnostic" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} /> Back to diagnostics</Link>
      <header className="rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-7 text-white shadow-lg sm:p-9"><div className="flex items-center gap-3"><span className="rounded-2xl bg-white/15 p-3"><Target size={23} /></span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-100">Your diagnostic progress</p><h1 className="mt-1 text-3xl font-extrabold">Outcome analysis</h1></div></div><p className="mt-3 max-w-3xl text-sm leading-6 text-indigo-100">Based on your submitted diagnostic assessments. Results show which outcomes appear secure and which need more practice.</p></header>
      <section className="grid gap-4 sm:grid-cols-3"><Metric label="Diagnostics completed" value={String(results.length)} /><Metric label="Outcomes mastered" value={String(mastered.length)} /><Metric label="Needs practice" value={String(focus.length)} /></section>
      {results.length === 0 ? <EmptyState message="Complete a published diagnostic to see your outcome progress here." /> : <OutcomeTable outcomes={outcomes} />}
    </main>;
  }

  const assignments = session.user.role === "TEACHER"
    ? await prisma.teacherAssignment.findMany({ where: { teacherId: session.user.id, grade: { level: { in: [3, 6, 9] } } }, select: { gradeId: true, subjectId: true, grade: { select: { level: true } } } })
    : await prisma.grade.findMany({ where: { level: { in: [3, 6, 9] } }, select: { id: true, level: true } }).then((grades) => grades.map((grade) => ({ gradeId: grade.id, subjectId: "", grade: { level: grade.level } })));
  const gradeIds = [...new Set(assignments.map((item) => item.gradeId))];
  const gradeLevels = [...new Set(assignments.map((item) => item.grade.level))].sort((a, b) => a - b);
  if (!gradeIds.length) return <main className="mx-auto max-w-7xl"><EmptyState message="No assigned grades are available for analysis yet." /></main>;

  const now = new Date();
  const quizzes = await prisma.quiz.findMany({
    where: {
      isDiagnostic: true,
      isPublished: true,
      gradeId: { in: gradeIds },
      AND: [
        { OR: [{ dueDate: null }, { dueDate: { gte: now } }] },
        ...(session.user.role === "TEACHER" ? [{ OR: assignments.map(({ gradeId, subjectId }) => ({ gradeId, subjectId })) }] : []),
      ],
    },
    select: { id: true, gradeId: true, subject: { select: { name: true } }, grade: { select: { level: true } } },
  });
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", gradeId: { in: gradeIds } },
    select: { id: true, name: true, email: true, gradeId: true, grade: { select: { level: true } }, class: { select: { name: true } } },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });
  const results = quizzes.length ? await prisma.result.findMany({
    where: { quizId: { in: quizzes.map((quiz) => quiz.id) }, studentId: { in: students.map((student) => student.id) } },
    include: {
      student: { select: { id: true } },
      quiz: { include: { grade: { select: { level: true } }, subject: { select: { name: true } } } },
      answers: { include: { question: { include: { learningOutcome: true } } } },
    },
  }) : [];
  const resultsByStudent = new Map<string, CohortDiagnosticResult[]>();
  for (const result of results) resultsByStudent.set(result.student.id, [...(resultsByStudent.get(result.student.id) || []), result]);
  const subjectNames = [...new Set(quizzes.map((quiz) => quiz.subject.name))].sort();
  const rows: AnalysisStudent[] = students.map((student) => {
    const gradeQuizzes = quizzes.filter((quiz) => quiz.gradeId === student.gradeId);
    const studentResults = resultsByStudent.get(student.id) || [];
    return {
      id: student.id,
      name: student.name || student.email,
      email: student.email,
      grade: student.grade?.level || 0,
      className: student.class?.name || "—",
      subjects: subjectNames.map((subject) => {
        const subjectQuizzes = gradeQuizzes.filter((quiz) => quiz.subject.name === subject);
        const subjectResults = studentResults.filter((result) => result.quiz.subject.name === subject);
        const completed = new Set(subjectResults.map((result) => result.quizId)).size;
        const scores = subjectResults.map((result) => result.score);
        return {
          subject,
          available: subjectQuizzes.length,
          completed,
          completion: subjectQuizzes.length ? Math.round((completed / subjectQuizzes.length) * 100) : 0,
          averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
        };
      }),
    };
  });
  const outcomeSummaries = reportOutcomes(results).map((item) => ({ ...item, needsFocus: item.curriculumGap || item.accuracy < 70 }));

  return <main className="mx-auto max-w-7xl space-y-6">
    <Link href="/dashboard/diagnostic" className="print:hidden inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} /> Back to diagnostics</Link>
    <header className="print:hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-7 text-white shadow-lg sm:p-9"><div className="flex items-center gap-3"><span className="rounded-2xl bg-white/15 p-3"><BarChart3 size={23} /></span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-100">Diagnostic insights</p><h1 className="mt-1 text-3xl font-extrabold">Student and grade analysis</h1></div></div><p className="mt-3 max-w-3xl text-sm leading-6 text-indigo-100">Start with each student’s diagnostic completion, then expand the grade overview to see performance patterns and outcomes needing attention.</p></header>
    <GradeDiagnosticAnalysis grades={gradeLevels} subjects={subjectNames} students={rows} outcomes={outcomeSummaries} generatedAt={new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date())} />
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p></div>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center"><BookOpenCheck size={35} className="mx-auto text-slate-300" /><h2 className="mt-4 text-lg font-bold text-slate-800">No diagnostic data yet</h2><p className="mt-1 text-sm text-slate-500">{message}</p></div>;
}

function OutcomeTable({ outcomes }: { outcomes: OutcomeSummary[] }) {
  const bySubject = new Map<string, OutcomeSummary[]>();
  for (const item of outcomes) bySubject.set(item.subject, [...(bySubject.get(item.subject) || []), item]);
  return <div className="space-y-5">{[...bySubject.entries()].map(([subject, items]) => <section key={subject} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><div className="flex items-center gap-2"><CircleAlert size={19} className="text-amber-600" /><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{subject}</p><h2 className="text-lg font-extrabold text-slate-900">Outcome progress</h2></div></div></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Outcome</th><th className="px-5 py-3">Correct</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item) => <tr key={item.key}><td className="max-w-lg px-5 py-4 text-slate-700">{item.name}</td><td className="px-5 py-4 text-slate-600">{item.correct}/{item.attempted} · {item.accuracy}%</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.curriculumGap || item.accuracy < 70 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{item.curriculumGap ? "Curriculum gap" : item.accuracy < 70 ? "Needs practice" : "Mastered"}</span></td></tr>)}</tbody></table></div></section>)}</div>;
}
