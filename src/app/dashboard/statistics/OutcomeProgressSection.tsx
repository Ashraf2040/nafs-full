import Link from "next/link";
import { Activity, AlertTriangle, BadgeCheck, Target } from "lucide-react";
import prisma from "@/lib/prisma";
import { getTeacherScope } from "@/lib/teacher-scope";
import OutcomeProgressFilters from "./OutcomeProgressFilters";

type Props = {
  userId: string;
  userRole: string;
  subject?: string;
  grade?: number | null;
  filterSubjects: { id: string; name: string }[];
  filterGrades: number[];
  assignments: Array<{ subject: { name: string }; grade: { level: number } }>;
};

export default async function OutcomeProgressSection({ userId, userRole, subject, grade, filterSubjects, filterGrades, assignments }: Props) {
  const scope: any = {};
  if (subject) scope.subject = subject;
  if (grade) scope.grade = grade;
  if (userRole === "TEACHER") {
    const visible = assignments.filter(item => (!subject || item.subject.name === subject) && (!grade || item.grade.level === grade));
    if (!visible.length) return null;
    scope.OR = visible.map(item => ({ subject: item.subject.name, grade: item.grade.level }));
  }
  const teacherScope = userRole === "TEACHER" ? await getTeacherScope(userId) : null;
  const outcomes = await prisma.learningOutcome.findMany({
    where: scope,
    orderBy: [{ subject: "asc" }, { grade: "asc" }, { subDomain: "asc" }, { outcomeText: "asc" }, { indicatorText: "asc" }],
    include: {
      questions: {
        where: { quiz: { AND: [
          { assessmentType: "QUIZ", isPublished: true },
          ...(teacherScope ? [teacherScope.quizWhere] : []),
          ...(subject ? [{ subject: { name: subject } }] : []),
          ...(grade ? [{ grade: { level: grade } }] : []),
        ] } },
        select: {
          id: true, questionText: true, correctAnswer: true,
          answers: {
            where: { result: { quiz: { AND: [
              { assessmentType: "QUIZ", isPublished: true },
              ...(teacherScope ? [teacherScope.quizWhere] : []),
            ] } } },
            select: {
              isCorrect: true,
              studentAnswer: true,
              result: {
                select: {
                  id: true,
                  completedAt: true,
                  student: { select: { id: true, name: true, grade: { select: { level: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  const rows = outcomes.map(outcome => {
    const students = new Map<string, { studentId: string; name: string; grade: number | null; correct: number; total: number; results: Set<string>; evidence: Array<{ resultId: string; question: string; selected: string; correctAnswer: string; isCorrect: boolean }> }>();
    for (const question of outcome.questions) for (const answer of question.answers) {
      const student = answer.result.student;
      const entry = students.get(student.id) ?? { studentId: student.id, name: student.name || "Student", grade: student.grade?.level ?? null, correct: 0, total: 0, results: new Set<string>(), evidence: [] };
      entry.total++;
      if (answer.isCorrect) entry.correct++;
      entry.results.add(answer.result.id);
      entry.evidence.push({ resultId: answer.result.id, question: question.questionText, selected: answer.studentAnswer || "No answer", correctAnswer: question.correctAnswer, isCorrect: answer.isCorrect });
      students.set(student.id, entry);
    }
    const group = [...students.values()].map(student => ({ ...student, accuracy: student.total ? Math.round(student.correct / student.total * 100) : 0 }));
    const responseCount = group.reduce((sum, student) => sum + student.total, 0);
    const correctCount = group.reduce((sum, student) => sum + student.correct, 0);
    const accuracy = responseCount ? Math.round(correctCount / responseCount * 100) : null;
    return { ...outcome, students: group.sort((a, b) => a.accuracy - b.accuracy || a.name.localeCompare(b.name)), accuracy, assessedStudents: group.length, questionCount: outcome.questions.length };
  });
  const mastered = rows.filter(row => row.accuracy !== null && row.accuracy >= 70).length;
  const focus = rows.filter(row => row.accuracy === null || row.accuracy < 70).length;

  return <details className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden"><div><div className="flex items-center gap-2 text-indigo-700"><Target size={19}/><p className="text-xs font-extrabold uppercase tracking-[.14em]">Curriculum progress</p></div><h2 className="mt-1 text-2xl font-black text-slate-900">Outcome progress across students</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Expand to review outcome mastery and student answer evidence.</p></div><span className="mt-2 shrink-0 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 group-open:hidden">Open</span><span className="mt-2 hidden shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 group-open:inline-flex">Close</span></summary>
    <div className="mt-5 space-y-5"><div className="max-w-3xl text-sm leading-6 text-slate-600">Progress is calculated from saved answers to published quizzes. Open an outcome to check each student’s evidence and open their full quiz report.</div><OutcomeProgressFilters subjects={filterSubjects} grades={filterGrades}/>
    <div className="grid gap-3 sm:grid-cols-3"><Summary icon={<Activity size={18}/>} label="Outcomes in filter" value={rows.length}/><Summary icon={<BadgeCheck size={18}/>} label="Mastered · 70%+" value={mastered}/><Summary icon={<AlertTriangle size={18}/>} label="Needs focus or no evidence" value={focus}/></div>
    {!rows.length ? <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">No outcomes match these subject and grade filters.</p> : <div className="space-y-3">{rows.map(row => {
      const needsFocus = row.accuracy === null || row.accuracy < 70;
      return <details key={row.id} className="group rounded-2xl border border-slate-200 bg-white open:border-indigo-200 open:bg-indigo-50/20"><summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${needsFocus ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{needsFocus ? <AlertTriangle size={18}/> : <BadgeCheck size={18}/>}</span><span className="min-w-0 flex-1"><span className="block font-bold text-slate-900">{row.indicatorText || row.outcomeText}</span><span className="mt-1 block text-xs text-slate-500">{row.subject} · Grade {row.grade}{row.subDomain ? ` · ${row.subDomain}` : ""} · {row.assessedStudents} students · {row.questionCount} linked questions</span></span><span className="min-w-24 text-right"><b className={`text-lg ${needsFocus ? "text-amber-700" : "text-emerald-700"}`}>{row.accuracy === null ? "—" : `${row.accuracy}%`}</b><small className="block text-xs text-slate-500">{needsFocus ? "Needs focus" : "Mastered"}</small></span></summary>
        <div className="border-t border-slate-100 px-4 py-4"><p className="mb-3 text-sm text-slate-600">{row.outcomeText}</p>{!row.students.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No quiz answers are linked to this outcome yet. Check outcome links on the quiz questions.</p> : <div className="space-y-3">{row.students.map(student => <details key={student.studentId} className="rounded-xl border border-slate-200 bg-white"><summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-3 [&::-webkit-details-marker]:hidden"><span className="min-w-0 flex-1"><b className="text-sm text-slate-900">{student.name}</b><span className="ml-2 text-xs text-slate-500">Grade {student.grade ?? "—"} · {student.total} answers · {student.results.size} quizzes</span></span><span className={`text-sm font-extrabold ${student.accuracy < 70 ? "text-amber-700" : "text-emerald-700"}`}>{student.accuracy}% ({student.correct}/{student.total})</span></summary><div className="space-y-2 border-t border-slate-100 p-3">{student.evidence.map((item, index) => <div key={`${item.resultId}-${index}`} className={`rounded-lg p-3 text-sm ${item.isCorrect ? "bg-emerald-50" : "bg-rose-50"}`}><p className="font-semibold text-slate-800">{item.question}</p><p className="mt-1 text-slate-600">Student: <b>{item.selected}</b> · Correct: <b>{item.correctAnswer}</b></p><Link href={`/dashboard/results/${item.resultId}`} className="mt-2 inline-flex text-xs font-bold text-indigo-700 underline">Open full quiz report</Link></div>)}</div></details>)}</div>}</div>
      </details>;
    })}</div>}
    </div>
  </details>;
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"><span className="text-indigo-600">{icon}</span><span className="min-w-0 flex-1 text-sm text-slate-600">{label}</span><b className="text-xl text-slate-900">{value}</b></div>;
}
