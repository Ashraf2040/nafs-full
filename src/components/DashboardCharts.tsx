"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, BarChart3, Users } from "lucide-react";

type SubjectStat = { name: string; avgScore: number; submissions?: number; quizzes?: number };
type GradeStat = { gradeLevel: number; count: number };
type MonthStat = { month: Date | string; count: number };
type RecentScore = { quiz: string; subject: string; score: number };

export default function DashboardCharts({ subjectPerformance = [], gradeDistribution = [], monthlyData = [], recentScores = [], isStudent = false }: {
  subjectPerformance?: SubjectStat[];
  gradeDistribution?: GradeStat[];
  monthlyData?: MonthStat[];
  recentScores?: RecentScore[];
  isStudent?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  useEffect(() => { setMounted(true); }, []);

  const scoreColor = (score: number) => score >= 85 ? "from-emerald-500 to-teal-400" : score >= 70 ? "from-indigo-500 to-violet-400" : score >= 60 ? "from-amber-500 to-orange-400" : "from-rose-500 to-red-400";

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-5">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div><h3 className="font-bold text-slate-900">Performance by subject</h3><p className="mt-1 text-xs leading-5 text-slate-500">Average score across graded assessments</p></div>
          <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><BarChart3 size={18} /></span>
        </div>
        {subjectPerformance.length ? <div className="space-y-5">
          {subjectPerformance.map((subject, index) => {
            const score = Math.max(0, Math.min(100, Number(subject.avgScore) || 0));
            return <div key={subject.name}>
              <div className="mb-2 flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-slate-700">{subject.name}</span><span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{score}%</span></div>
              <div role="progressbar" aria-label={`${subject.name} average score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div className={`h-full rounded-full bg-gradient-to-r ${scoreColor(score)}`} initial={{ width: reduceMotion ? `${score}%` : "0%" }} animate={{ width: mounted ? `${score}%` : "0%" }} transition={{ duration: reduceMotion ? 0 : .7, delay: index * .08, ease: "easeOut" }} />
              </div>
              <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-[11px] text-slate-500"><span>{subject.submissions ?? 0} submissions</span><span>{subject.quizzes ?? 0} quizzes</span></div>
            </div>;
          })}
        </div> : <EmptyState icon={<BarChart3 size={19} />} title="No score data yet" detail="Scores will appear after students complete graded quizzes." />}
      </section>

      {!isStudent && <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">Students by grade</h3><p className="mt-1 text-xs leading-5 text-slate-500">Enrollment distribution across supported grades</p></div><span className="rounded-xl bg-violet-50 p-2 text-violet-600"><Users size={18} /></span></div>
        {gradeDistribution.length ? <div className="space-y-4">
          {gradeDistribution.map((grade, index) => {
            const largest = Math.max(...gradeDistribution.map((item) => item.count), 1);
            const width = Math.max(grade.count > 0 ? 4 : 0, Math.round((grade.count / largest) * 100));
            return <div key={grade.gradeLevel} className="grid grid-cols-[4.25rem_minmax(0,1fr)_2.25rem] items-center gap-3">
              <span className="text-xs font-semibold text-slate-600">Grade {grade.gradeLevel}</span>
              <div role="progressbar" aria-label={`Grade ${grade.gradeLevel} enrollment`} aria-valuemin={0} aria-valuemax={largest} aria-valuenow={grade.count} className="h-2.5 overflow-hidden rounded-full bg-slate-100"><motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400" initial={{ width: reduceMotion ? `${width}%` : "0%" }} animate={{ width: mounted ? `${width}%` : "0%" }} transition={{ duration: reduceMotion ? 0 : .65, delay: index * .06, ease: "easeOut" }} /></div>
              <span className="text-right text-sm font-bold tabular-nums text-slate-800">{grade.count}</span>
            </div>;
          })}
          <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">Bar lengths are relative to the grade with the most students.</p>
        </div> : <EmptyState icon={<Users size={19} />} title="No students enrolled" detail="Student enrollment will appear here." />}
      </section>}

      {!isStudent && <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-2">
        <div className="mb-5 flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">Assessment activity</h3><p className="mt-1 text-xs leading-5 text-slate-500">Number of graded quiz submissions in recent months</p></div><span className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><Activity size={18} /></span></div>
        {monthlyData.length ? <div className="grid min-h-36 grid-cols-3 items-end gap-3 sm:grid-cols-6 sm:gap-4">
          {monthlyData.map((item) => {
            const date = new Date(item.month);
            const max = Math.max(...monthlyData.map((entry) => entry.count), 1);
            const percent = item.count ? Math.max(8, Math.round((item.count / max) * 100)) : 0;
            return <div key={date.toISOString()} className="flex min-w-0 flex-col items-center gap-2">
              <span className="text-xs font-bold tabular-nums text-slate-700">{item.count}</span>
              <div className="flex h-24 w-full items-end overflow-hidden rounded-lg bg-slate-50"><motion.div role="img" aria-label={`${item.count} submissions in ${date.toLocaleString("en", { month: "long" })}`} className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-violet-400" initial={{ height: reduceMotion ? `${percent}%` : 0 }} animate={{ height: mounted ? `${percent}%` : 0 }} transition={{ duration: reduceMotion ? 0 : .65, ease: "easeOut" }} /></div>
              <span className="max-w-full truncate text-[11px] font-medium text-slate-500">{date.toLocaleString("en", { month: "short" })}</span>
            </div>;
          })}
        </div> : <EmptyState icon={<Activity size={19} />} title="No recent activity" detail="Submissions will appear here as students complete quizzes." />}
      </section>}

      {isStudent && recentScores.length > 0 && <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4"><h3 className="font-bold text-slate-900">Recent scores</h3><p className="mt-1 text-xs leading-5 text-slate-500">Your latest graded quiz results</p></div>
        <div className="space-y-2.5">{recentScores.slice(0, 10).map((result, index) => <motion.div key={`${result.quiz}-${index}`} initial={{ opacity: 0, x: reduceMotion ? 0 : -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduceMotion ? 0 : index * .04 }} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <div className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-700">{result.quiz}</span><span className="text-[11px] text-slate-500">{result.subject}</span></div><span className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${result.score >= 80 ? "bg-emerald-50 text-emerald-700" : result.score >= 60 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{result.score.toFixed(0)}%</span>
        </motion.div>)}</div>
      </section>}
    </div>
  );
}

function EmptyState({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-7 text-center"><span className="mb-2 rounded-xl bg-white p-2 text-slate-500 shadow-sm">{icon}</span><p className="text-sm font-semibold text-slate-700">{title}</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{detail}</p></div>;
}
