"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, ChevronDown, ChevronUp, Printer, Users } from "lucide-react";

type SubjectMetric = {
  subject: string;
  available: number;
  completed: number;
  completion: number;
  averageScore: number | null;
};

export type AnalysisStudent = {
  id: string;
  name: string;
  email: string;
  grade: number;
  className: string;
  subjects: SubjectMetric[];
};

export type OutcomeSummary = {
  key: string;
  subject: string;
  name: string;
  grade: number;
  correct: number;
  attempted: number;
  accuracy: number;
  curriculumGap: boolean;
  needsFocus?: boolean;
};

function getMetric(student: AnalysisStudent, subject: string): SubjectMetric {
  return student.subjects.find((item) => item.subject === subject) || {
    subject,
    available: 0,
    completed: 0,
    completion: 0,
    averageScore: null,
  };
}

function statusOf(metric: SubjectMetric) {
  if (metric.available === 0) return "No diagnostic";
  if (metric.completed === 0) return "Not started";
  return (metric.averageScore ?? 0) >= 70 ? "On track" : "Needs focus";
}

export default function GradeDiagnosticAnalysis({ grades, subjects, students, outcomes, generatedAt }: {
  grades: number[];
  subjects: string[];
  students: AnalysisStudent[];
  outcomes: OutcomeSummary[];
  generatedAt: string;
}) {
  const [grade, setGrade] = useState(grades[0] ?? 3);
  const [subject, setSubject] = useState(subjects.includes("Math") ? "Math" : subjects[0] || "");
  const [expanded, setExpanded] = useState(false);
  const gradeStudents = useMemo(() => students
    .filter((student) => student.grade === grade)
    .sort((left, right) => {
      const rank = (value: string) => value === "Needs focus" ? 0 : value === "Not started" ? 1 : value === "No diagnostic" ? 2 : 3;
      const leftMetric = getMetric(left, subject);
      const rightMetric = getMetric(right, subject);
      const statusDifference = rank(statusOf(leftMetric)) - rank(statusOf(rightMetric));
      if (statusDifference !== 0) return statusDifference;
      if (leftMetric.averageScore === null && rightMetric.averageScore === null) return left.name.localeCompare(right.name);
      if (leftMetric.averageScore === null) return 1;
      if (rightMetric.averageScore === null) return -1;
      return leftMetric.averageScore - rightMetric.averageScore;
    }), [students, grade, subject]);
  const focusOutcomes = useMemo(
    () => outcomes.filter((outcome) => outcome.grade === grade && outcome.subject === subject && outcome.needsFocus),
    [outcomes, grade, subject],
  );
  const statusCounts = [
    { label: "On track", color: "bg-emerald-500", text: "text-emerald-700", track: "bg-emerald-50" },
    { label: "Needs focus", color: "bg-amber-500", text: "text-amber-700", track: "bg-amber-50" },
    { label: "Not started", color: "bg-slate-400", text: "text-slate-600", track: "bg-slate-100" },
    { label: "No diagnostic", color: "bg-slate-300", text: "text-slate-500", track: "bg-slate-100" },
  ].map((item) => ({
    ...item,
    count: gradeStudents.filter((student) => statusOf(getMetric(student, subject)) === item.label).length,
  }));

  return <div className="space-y-6">
    <header className="hidden print:block border-b-2 border-indigo-700 pb-4">
      <p className="text-xs font-extrabold uppercase tracking-[.2em] text-indigo-700">NAFS · Student proficiency report</p>
      <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Grade {grade} {subject} diagnostic</h1>
      <p className="mt-1 text-sm text-slate-600">Student completion, proficiency status, and outcomes for instructional planning</p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs font-semibold text-slate-500"><span>Prepared: {generatedAt}</span><span>Students: {gradeStudents.length}</span><span>Subject: {subject}</span></div>
    </header>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.15em] text-indigo-600">Student completion</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">Grade {grade} · {subject || "Diagnostics"}</h2>
          <p className="mt-1 text-sm text-slate-500">Each completion percentage and report link below applies to the selected subject only.</p>
        </div>
        <div className="print:hidden flex flex-wrap gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Grade<select value={grade} onChange={(event) => setGrade(Number(event.target.value))} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300">{grades.map((item) => <option key={item} value={item}>Grade {item}</option>)}</select></label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Subject<select value={subject} onChange={(event) => setSubject(event.target.value)} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300">{subjects.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-black"><Printer size={16} /> Print report</button>
        </div>
      </div>
      {gradeStudents.length === 0 ? <div className="p-10 text-center print:hidden"><Users size={30} className="mx-auto text-slate-300" /><p className="mt-3 font-semibold text-slate-700">No students in this grade</p><p className="mt-1 text-sm text-slate-500">Students will appear here when they are assigned to this grade.</p></div> : <div className="overflow-x-auto print:overflow-visible"><table className="w-full min-w-[760px] text-left text-sm print:min-w-0"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Class</th><th className="px-5 py-3">{subject} completion</th><th className="px-5 py-3">Proficiency</th><th className="px-5 py-3">Status</th><th className="print:hidden px-5 py-3">Report</th></tr></thead><tbody className="divide-y divide-slate-100">{gradeStudents.map((student) => {
        const metric = getMetric(student, subject);
        const status = statusOf(metric);
        const statusClass = status === "On track" ? "bg-emerald-50 text-emerald-700" : status === "Needs focus" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
        return <tr key={student.id} className="break-inside-avoid hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-bold text-slate-900">{student.name}</p><p className="mt-0.5 text-xs text-slate-400">{student.email}</p></td><td className="px-5 py-4 text-slate-600">{student.className}</td><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100 print:hidden"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${metric.completion}%` }} /></div><span className="min-w-10 font-extrabold text-slate-800">{metric.completion}%</span></div><p className="mt-1 text-xs text-slate-400">{metric.completed} of {metric.available} completed</p></td><td className="px-5 py-4 font-bold text-slate-700">{metric.averageScore === null ? "—" : `${metric.averageScore}%`}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold print:border print:bg-white ${statusClass}`}>{status}{metric.averageScore !== null ? ` · ${metric.averageScore}%` : ""}</span></td><td className="print:hidden px-5 py-4"><Link href={`/dashboard/student-reports/${student.id}?subject=${encodeURIComponent(subject)}&grade=${student.grade}`} className="inline-flex items-center gap-1.5 whitespace-nowrap font-bold text-indigo-700 hover:text-indigo-900">View report <ArrowUpRight size={14} /></Link></td></tr>;
      })}</tbody></table></div>}
    </section>

    <div className="print:hidden flex justify-center"><button type="button" onClick={() => setExpanded((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700">{expanded ? <ChevronUp size={17} /> : <Activity size={17} />}{expanded ? "Hide grade analysis" : "Show full grade analysis"}{expanded ? null : <ChevronDown size={16} />}</button></div>

    <div className={expanded ? "space-y-6" : "hidden print:block space-y-6"}>
      <section className="break-inside-avoid rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 print:rounded-none print:border-0 print:shadow-none">
        <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.15em] text-indigo-600">Grade {grade} · {subject}</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">All students status</h2><p className="mt-1 text-sm text-slate-500">One bar per student. Scores and colors use this subject’s diagnostic results only.</p></div>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{statusCounts.map((item) => <div key={item.label} className={`rounded-2xl ${item.track} p-4`}><p className={`text-xs font-bold uppercase tracking-wider ${item.text}`}>{item.label}</p><p className={`mt-1 text-2xl font-extrabold ${item.text}`}>{item.count}<span className="ml-1 text-xs font-semibold">/ {gradeStudents.length}</span></p></div>)}</div>
        <div className="mb-5 hidden print:block rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-slate-700"><strong className="text-indigo-900">Planning note:</strong> Prioritize students marked Needs focus or Not started, then use the outcome table below to select reteaching and practice targets.</div>
        {gradeStudents.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No students are available in this grade.</p> : <div className="space-y-3">{gradeStudents.map((student) => {
          const metric = getMetric(student, subject);
          const status = statusOf(metric);
          const barColor = status === "On track" ? "bg-emerald-500" : status === "Needs focus" ? "bg-amber-500" : "bg-slate-300";
          const score = metric.averageScore;
          return <div key={student.id} className="grid gap-2 rounded-2xl border border-slate-100 p-4 sm:grid-cols-[170px_1fr_145px] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{student.name}</p><p className="text-xs text-slate-400">{student.className}</p></div><div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${score ?? 0}%` }} /></div><p className="mt-1 text-xs text-slate-400">{metric.completed} of {metric.available} {subject} diagnostic{metric.available === 1 ? "" : "s"} completed</p></div><div className="sm:text-right"><span className={`text-sm font-extrabold ${status === "On track" ? "text-emerald-700" : status === "Needs focus" ? "text-amber-700" : "text-slate-500"}`}>{score === null ? status : `${score}% · ${status}`}</span></div></div>;
        })}</div>}
      </section>

      <section className="break-inside-avoid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:overflow-visible print:rounded-none print:border print:shadow-none"><div className="border-b border-slate-100 p-5 sm:p-6"><div className="flex items-center gap-2"><Activity size={19} className="text-amber-600" /><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Grade {grade} · {subject}</p><h2 className="text-lg font-extrabold text-slate-900">Outcomes needing focus</h2><p className="mt-1 text-sm text-slate-500">Only outcomes from the selected subject are shown.</p></div></div></div>{focusOutcomes.length === 0 ? <p className="p-8 text-center text-sm font-medium text-slate-500">No outcomes are currently flagged for this subject and grade.</p> : <div className="overflow-x-auto print:overflow-visible"><table className="w-full min-w-[700px] text-left text-sm print:min-w-0"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Outcome to focus</th><th className="px-5 py-3">Evidence</th><th className="px-5 py-3">Accuracy</th><th className="px-5 py-3">Flag</th></tr></thead><tbody className="divide-y divide-slate-100">{focusOutcomes.map((outcome) => <tr key={outcome.key} className="break-inside-avoid"><td className="max-w-xl px-5 py-4 leading-5 text-slate-700">{outcome.name}</td><td className="px-5 py-4 text-slate-600">{outcome.correct} of {outcome.attempted} correct</td><td className="px-5 py-4"><div className="flex items-center gap-2"><div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100 print:hidden"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, outcome.accuracy)}%` }} /></div><span className="font-bold text-slate-700">{outcome.accuracy}%</span></div></td><td className="px-5 py-4"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 print:border print:bg-white">{outcome.curriculumGap ? "Curriculum gap" : "Needs focus"}</span></td></tr>)}</tbody></table></div>}</section>
    </div>
  </div>;
}
