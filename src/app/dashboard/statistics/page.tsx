import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  Users, CheckCircle, TrendingUp, BarChart3, AlertTriangle,
  BookOpen, Trophy
} from "lucide-react";
import StatFilters from "./StatFilters";
import GenerateRemediationBtn from "./GenerateRemediationBtn";
import { ScoreTrendsChart, GradePieChart, SubjectBarChart } from "./Charts";

export const revalidate = 600;

function getRiskLevel(avg: number) {
  if (avg < 40) return { label: "Critical", icon: AlertTriangle, text: "text-red-600", bg: "bg-red-50", border: "border-red-200", progressColor: "bg-red-500" };
  if (avg < 60) return { label: "At Risk", icon: AlertTriangle, text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", progressColor: "bg-amber-500" };
  return { label: "Needs Work", icon: AlertTriangle, text: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", progressColor: "bg-orange-500" };
}

/* ─── Skeleton components ─── */

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-4 rounded-xl bg-slate-100 animate-pulse w-[60px] h-[60px]" />
          <div className="space-y-2">
            <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
            <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartSectionSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="h-6 w-40 bg-slate-100 rounded-lg mb-6 animate-pulse" />
          <div className="h-[300px] bg-slate-50 rounded-2xl animate-pulse" />
        </div>
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="h-6 w-48 bg-slate-100 rounded-lg mb-6 animate-pulse" />
          <div className="h-[300px] bg-slate-50 rounded-2xl animate-pulse" />
        </div>
      </div>
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
        <div className="h-6 w-48 bg-slate-100 rounded-lg mb-6 animate-pulse" />
        <div className="h-[200px] bg-slate-50 rounded-2xl animate-pulse" />
      </div>
    </>
  );
}

function RankingsSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
      <div className="h-7 w-48 bg-slate-100 rounded-lg mb-6 animate-pulse" />
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-slate-50/80 rounded-xl">
            <div className="w-6 h-6 bg-slate-100 rounded animate-pulse" />
            <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse" />
            <div className="flex-1 h-4 bg-slate-100 rounded animate-pulse" />
            <div className="w-16 h-4 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Async sub-components ─── */

async function KpiCards({ userRole, resultWhere, quizFilter }: { userRole: string; resultWhere: any; quizFilter: any }) {
  const [totalStudents, totalTeachers, totalQuizzes, publishedQuizzes, totalSubmissions, avgScoreAgg, uniqueStudentsAgg] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.quiz.count({ where: quizFilter }),
    prisma.quiz.count({ where: { ...quizFilter, isPublished: true } }),
    prisma.result.count({ where: resultWhere }),
    prisma.result.aggregate({ where: resultWhere, _avg: { score: true } }),
    prisma.result.groupBy({ by: ["studentId"], where: resultWhere }),
  ]);
  const averageScore = avgScoreAgg._avg?.score || 0;
  const uniqueStudents = uniqueStudentsAgg.length;
  const completionRate = totalStudents > 0 ? (uniqueStudents / totalStudents) * 100 : 0;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { title: "Total Students", value: userRole === "TEACHER" ? uniqueStudents : totalStudents, sub: userRole === "ADMIN" ? `${totalTeachers} teachers` : "In your classes", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "Completion Rate", value: `${completionRate.toFixed(1)}%`, sub: `${uniqueStudents} active`, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
        { title: "Average Score", value: `${averageScore.toFixed(1)}%`, sub: `Across ${totalSubmissions} submissions`, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
        { title: "Active Quizzes", value: publishedQuizzes, sub: `${totalQuizzes - publishedQuizzes} drafts`, icon: BookOpen, color: "text-amber-600", bg: "bg-amber-50" },
      ].map((stat, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
          <div className={`p-4 rounded-xl ${stat.bg} ${stat.color}`}><stat.icon size={28} /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">{stat.title}</p>
            <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
            <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

async function ChartsSection({ resultWhere }: { resultWhere: any }) {
  const [subjectResults, allFilteredResults, gradeResults, monthlyResults] = await Promise.all([
    prisma.result.groupBy({ by: ["quizId"], where: resultWhere, _avg: { score: true }, _count: { id: true } }),
    prisma.result.findMany({ where: resultWhere, select: { score: true, quizId: true } }),
    prisma.result.findMany({ where: resultWhere, select: { quiz: { select: { grade: { select: { level: true } } } } } }),
    (() => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      return prisma.result.findMany({ where: { ...resultWhere, completedAt: { gte: sixMonthsAgo } }, select: { score: true, completedAt: true } });
    })(),
  ]);

  const quizIds = subjectResults.map(r => r.quizId);
  const quizzesWithSubjects = quizIds.length > 0
    ? await prisma.quiz.findMany({ where: { id: { in: quizIds } }, select: { id: true, subject: { select: { name: true } } } })
    : [];
  const quizSubjectMap = new Map(quizzesWithSubjects.map(q => [q.id, q.subject.name]));

  // Subject Performance
  const subjectMap: Record<string, { totalScore: number; count: number; passed: number; failed: number }> = {};
  allFilteredResults.forEach((r) => {
    const subName = quizSubjectMap.get(r.quizId) || "Unknown";
    if (!subjectMap[subName]) subjectMap[subName] = { totalScore: 0, count: 0, passed: 0, failed: 0 };
    subjectMap[subName].totalScore += r.score;
    subjectMap[subName].count++;
    if (r.score >= 50) subjectMap[subName].passed++;
    else subjectMap[subName].failed++;
  });
  const subjectChartData = Object.entries(subjectMap).map(([name, data]) => ({
    name, avg: Math.round(data.totalScore / data.count), submissions: data.count, passed: data.passed, failed: data.failed,
  }));

  // Grade Distribution
  const gradeDistMap: Record<string, number> = {};
  gradeResults.forEach(r => {
    const level = r.quiz.grade?.level;
    if (level == null) return;
    gradeDistMap[`Grade ${level}`] = (gradeDistMap[`Grade ${level}`] || 0) + 1;
  });
  const pieData = Object.entries(gradeDistMap).map(([name, value]) => ({ name, value }));

  // Monthly Trend
  const months: Record<string, { score: number; count: number }> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months[d.toLocaleString('default', { month: 'short' })] = { score: 0, count: 0 };
  }
  monthlyResults.forEach(r => {
    const m = r.completedAt.toLocaleString('default', { month: 'short' });
    if (months[m]) { months[m].score += r.score; months[m].count++; }
  });
  const trendData = Object.entries(months).map(([name, data]) => ({
    name, avg: data.count > 0 ? Math.round(data.score / data.count) : 0, submissions: data.count,
  }));

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Score Trends (6 Months)</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Live</span>
          </div>
          <ScoreTrendsChart data={trendData} />
        </div>
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Submissions by Grade</h2>
          <GradePieChart data={pieData} />
        </div>
      </div>
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Subject Performance</h2>
        <SubjectBarChart data={subjectChartData} />
      </div>
    </>
  );
}

async function RankingsSection({ resultWhere, userRole, relevantStudentIds }: { resultWhere: any; userRole: string; relevantStudentIds: string[] }) {
  const studentWhere: any = { role: "STUDENT" };
  if (userRole === "TEACHER" && relevantStudentIds.length > 0) {
    studentWhere.id = { in: relevantStudentIds };
  }
  const [studentStats, allStudents] = await Promise.all([
    prisma.result.groupBy({ by: ["studentId"], where: resultWhere, _avg: { score: true }, _count: { id: true }, _max: { score: true } }),
    userRole === "TEACHER" && relevantStudentIds.length === 0
      ? Promise.resolve([] as { id: string; name: string | null }[])
      : prisma.user.findMany({ where: studentWhere, take: 50, select: { id: true, name: true } }),
  ]);
  const studentStatMap = new Map(studentStats.map((s: { studentId: string; _avg: { score: number | null } | null; _count: { id: number }; _max: { score: number | null } | null }) => [s.studentId, s]));
  const rankedStudents = allStudents
    .map((s: { id: string; name: string | null }) => {
      const stat = studentStatMap.get(s.id);
      return { ...s, avgScore: stat?._avg?.score || 0, totalQuizzes: stat?._count?.id || 0, highestScore: stat?._max?.score || 0, strengths: [] as any[], weaknesses: [] as any[] };
    })
    .filter((s: { totalQuizzes: number }) => s.totalQuizzes > 0)
    .sort((a: { avgScore: number }, b: { avgScore: number }) => b.avgScore - a.avgScore);

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Trophy size={28} className="text-amber-500" /> Student Rankings
        </h2>
        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{rankedStudents.length} students</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-xs font-black text-slate-400 uppercase tracking-[0.1em]">
              <th className="p-4">Rank</th>
              <th className="p-4">Student</th>
              <th className="p-4">Quizzes</th>
              <th className="p-4">Avg Score</th>
              <th className="p-4">Highest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rankedStudents.map((s, idx) => (
              <tr key={s.id} className="hover:bg-slate-50/80 transition-all">
                <td className="p-4 font-black text-slate-400">#{idx + 1}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">{s.name?.[0] || "S"}</div>
                    <span className="font-bold text-slate-800">{s.name}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-600">{s.totalQuizzes}</td>
                <td className="p-4">
                  <span className={`font-bold ${s.avgScore >= 80 ? "text-emerald-600" : s.avgScore >= 50 ? "text-amber-600" : "text-red-500"}`}>{s.avgScore.toFixed(1)}%</span>
                </td>
                <td className="p-4 font-bold text-slate-700">{s.highestScore.toFixed(0)}%</td>
              </tr>
            ))}
            {rankedStudents.length === 0 && (
              <tr><td colSpan={5} className="p-12 text-center text-slate-400">No student data available for the selected filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function StrugglingQuizzesSection({ resultWhere }: { resultWhere: any }) {
  const strugglingQuizResults = await prisma.result.groupBy({
    by: ["quizId"], where: resultWhere, _avg: { score: true }, _count: { id: true },
    having: { score: { _avg: { lt: 70 } } },
  });
  if (strugglingQuizResults.length === 0) return null;
  const strugglingQuizIds = strugglingQuizResults.map(r => r.quizId);
  const strugglingQuizDetails = await prisma.quiz.findMany({
    where: { id: { in: strugglingQuizIds } },
    select: { id: true, title: true, subject: { select: { name: true } }, grade: { select: { level: true } } },
  });
  const strugglingQuizzes = strugglingQuizResults.map(r => {
    const quiz = strugglingQuizDetails.find(q => q.id === r.quizId);
    return { quizId: r.quizId, title: quiz?.title || "Unknown", subjectName: quiz?.subject.name || "Unknown", gradeLevel: quiz?.grade.level || 0, avg: r._avg.score || 0, submissionCount: r._count.id };
  }).sort((a, b) => a.avg - b.avg);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle size={24} className="text-red-500" />
        <h2 className="text-2xl font-bold text-slate-800">Quizzes Needing Remediation</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {strugglingQuizzes.map((sq, idx) => {
          const risk = getRiskLevel(sq.avg);
          const RiskIcon = risk.icon;
          return (
            <div key={idx} className={`rounded-2xl border-2 ${risk.border} ${risk.bg} overflow-hidden shadow-sm`}>
              <div className={`px-6 py-4 border-b ${risk.border} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <RiskIcon size={18} className={risk.text} />
                  <span className={`text-xs font-black uppercase tracking-wider ${risk.text}`}>{risk.label}</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-white/60 ${risk.text}`}>{sq.submissionCount} submissions</span>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-slate-900 text-lg mb-1">{sq.title}</h3>
                <p className="text-sm text-slate-500 mb-4">{sq.subjectName} • Grade {sq.gradeLevel ?? "?"}</p>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-slate-600">Class Average</span>
                  <span className={`text-3xl font-black ${risk.text}`}>{sq.avg.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden border border-slate-200/50 mb-4">
                  <div className={`${risk.progressColor} h-3 rounded-full`} style={{ width: `${Math.min(sq.avg, 100)}%` }} />
                </div>
                <GenerateRemediationBtn quizId={sq.quizId} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main page ─── */

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ tab?: string; subject?: string; grade?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;
  const params = await searchParams;
  const filterSubject = params.subject;
  const filterGrade = params.grade ? parseInt(params.grade) : null;

  if (userRole === "STUDENT") redirect("/dashboard");

  // ─── Teacher scope ───
  let teacherSubjectIds: string[] = [];
  let teacherGradeIds: string[] = [];
  let relevantStudentIds: string[] = [];
  if (userRole === "TEACHER") {
    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: userId },
      select: { subjectId: true, gradeId: true },
    });
    teacherSubjectIds = [...new Set(assignments.map(a => a.subjectId))];
    teacherGradeIds = [...new Set(assignments.map(a => a.gradeId))];
  }

  // ─── Build filters ───
  const quizFilter: any = {};
  if (filterSubject) quizFilter.subject = { name: filterSubject };
  if (filterGrade) quizFilter.grade = { level: filterGrade };
  if (userRole === "TEACHER") {
    if (!filterSubject) quizFilter.subjectId = { in: teacherSubjectIds };
    if (!filterGrade) quizFilter.gradeId = { in: teacherGradeIds };
  }

  const resultQuizFilter: any = {};
  if (filterSubject) resultQuizFilter.subject = { name: filterSubject };
  if (filterGrade) resultQuizFilter.grade = { level: filterGrade };
  if (userRole === "TEACHER") {
    if (!filterSubject) resultQuizFilter.subjectId = { in: teacherSubjectIds };
    if (!filterGrade) resultQuizFilter.gradeId = { in: teacherGradeIds };
  }
  const resultWhere = Object.keys(resultQuizFilter).length > 0 ? { quiz: resultQuizFilter } : {};

  // Pre-fetch the relevant student IDs for teacher scope (needed by RankingsSection)
  if (userRole === "TEACHER") {
    const relevant = await prisma.result.groupBy({ by: ["studentId"], where: resultWhere });
    relevantStudentIds = relevant.map(r => r.studentId);
  }

  const [allSubjects, allGrades] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.grade.findMany({ orderBy: { level: 'asc' }, select: { level: true } }),
  ]);
  const gradeLevels = allGrades.map(g => g.level);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <BarChart3 className="text-indigo-600" size={32} /> {userRole === "ADMIN" ? "Platform Analytics" : "My Class Analytics"}
        </h1>
        <p className="text-slate-500">Real-time performance metrics and actionable insights.</p>
      </header>

      <StatFilters subjects={allSubjects} grades={gradeLevels} defaultSubject={filterSubject} defaultGrade={filterGrade} />

      <Suspense fallback={<KpiCardsSkeleton />}>
        <KpiCards userRole={userRole} resultWhere={resultWhere} quizFilter={quizFilter} />
      </Suspense>

      <Suspense fallback={<ChartSectionSkeleton />}>
        <ChartsSection resultWhere={resultWhere} />
      </Suspense>

      <Suspense fallback={<RankingsSkeleton />}>
        <RankingsSection resultWhere={resultWhere} userRole={userRole} relevantStudentIds={relevantStudentIds} />
      </Suspense>

      <Suspense fallback={<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-48 bg-slate-50 rounded-2xl animate-pulse" />)}</div>}>
        <StrugglingQuizzesSection resultWhere={resultWhere} />
      </Suspense>
    </div>
  );
}