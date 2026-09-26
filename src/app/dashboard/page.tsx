// app/dashboard/page.tsx — ENHANCED VERSION
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Users, FileText, TrendingUp, AlertCircle, CheckCircle2,
  BarChart3, Calendar, ChevronRight, PlayCircle, Plus,
  Clock, Award, BookOpen, Sparkles, ArrowUpRight, Zap,
  Target, TrendingDown, Activity, Route, Trophy
} from "lucide-react";
import { Suspense } from "react";
import DashboardCharts from "@/components/DashboardCharts";
import type { Prisma } from "@prisma/client";

export const revalidate = 600;

/* ─── Inline skeleton components ─── */

function StatCardsSkeleton() {
  return Array.from({ length: 4 }, (_, i) => (
    <div key={i} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-[52px] h-[52px] bg-slate-100 rounded-xl animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  ));
}

function ChartSectionSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 bg-slate-100 rounded-xl animate-pulse" />
        <div className="space-y-2">
          <div className="h-5 w-40 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-3 w-56 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[300px] bg-slate-50 rounded-2xl animate-pulse" />
        <div className="h-[300px] bg-slate-50 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

function RecentSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
        <div className="h-5 w-40 bg-slate-100 rounded-lg mb-6 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-slate-50/80 rounded-2xl">
              <div className="w-11 h-11 bg-slate-100 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
            <div className="h-5 w-32 bg-slate-100 rounded-lg mb-4 animate-pulse" />
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, j) => (
                <div key={j} className="h-14 bg-slate-50/80 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Async sub-components ─── */

async function StaffStatCards({ quizWhere, studentWhere }: {
  quizWhere: Prisma.QuizWhereInput;
  studentWhere: Prisma.UserWhereInput;
}) {
  const resultWhere: Prisma.ResultWhereInput = { quiz: quizWhere };
  const [totalStudents, totalQuizzes, publishedQuizzes, totalSubmissions, avgScoreResult, activeToday] = await Promise.all([
    prisma.user.count({ where: studentWhere }),
    prisma.quiz.count({ where: quizWhere }),
    prisma.quiz.count({ where: { AND: [quizWhere, { isPublished: true }] } }),
    prisma.result.count({ where: resultWhere }),
    prisma.result.aggregate({ where: resultWhere, _avg: { score: true } }),
    prisma.result.count({
      where: {
        ...resultWhere,
        completedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    })
  ]);
  const avgScore = avgScoreResult._avg?.score || 0;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <StatCard 
        icon={<Users size={22} />} 
        label="Total Students" 
        value={totalStudents} 
        color="blue" 
        subtitle="Active learners"
      />
      <StatCard 
        icon={<FileText size={22} />} 
        label="Total Quizzes" 
        value={totalQuizzes} 
        color="indigo" 
        subvalue={`${publishedQuizzes} published`}
        subtitle={`${totalQuizzes - publishedQuizzes} in draft`}
      />
      <StatCard 
        icon={<CheckCircle2 size={22} />} 
        label="Total Submissions" 
        value={totalSubmissions} 
        color="emerald" 
        trend={`${activeToday} today`}
        subtitle="All time"
      />
      <StatCard 
        icon={<TrendingUp size={22} />} 
        label="Average Score" 
        value={`${Math.round(avgScore)}%`} 
        color="amber" 
        subtitle="Across visible submissions"
      />
    </div>
  );
}

async function StaffChartSection({ quizWhere, studentWhere }: {
  quizWhere: Prisma.QuizWhereInput;
  studentWhere: Prisma.UserWhereInput;
}) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const resultWhere: Prisma.ResultWhereInput = { quiz: quizWhere };
  const [results, gradeGroups, grades] = await Promise.all([
    prisma.result.findMany({
      where: { ...resultWhere, completedAt: { gte: sixMonthsAgo } },
      select: {
        score: true,
        completedAt: true,
        quiz: { select: { id: true, subject: { select: { name: true } } } },
      },
    }),
    prisma.user.groupBy({ by: ["gradeId"], where: studentWhere, _count: { id: true } }),
    prisma.grade.findMany({ select: { id: true, level: true } }),
  ]);

  const subjects = new Map<string, { quizIds: Set<string>; submissions: number; score: number }>();
  const months = new Map<string, { month: Date; count: number }>();
  for (const result of results) {
    const name = result.quiz.subject.name;
    const subject = subjects.get(name) ?? { quizIds: new Set<string>(), submissions: 0, score: 0 };
    subject.quizIds.add(result.quiz.id);
    subject.submissions += 1;
    subject.score += result.score;
    subjects.set(name, subject);

    const month = new Date(result.completedAt.getFullYear(), result.completedAt.getMonth(), 1);
    const key = month.toISOString();
    const bucket = months.get(key) ?? { month, count: 0 };
    bucket.count += 1;
    months.set(key, bucket);
  }
  const subjectPerformance = [...subjects.entries()]
    .map(([name, value]) => ({
      name,
      quizzes: value.quizIds.size,
      submissions: value.submissions,
      avgScore: Math.round(value.score / value.submissions),
    }))
    .sort((a, b) => b.submissions - a.submissions)
    .slice(0, 10);
  const gradeLevelMap = new Map(grades.map((grade) => [grade.id, grade.level]));
  const gradeDistribution = gradeGroups
    .filter((group) => group.gradeId)
    .map((group) => ({ gradeLevel: gradeLevelMap.get(group.gradeId!) ?? 0, count: group._count.id }))
    .sort((a, b) => a.gradeLevel - b.gradeLevel);
  const monthlySubmissions = [...months.values()].sort((a, b) => a.month.getTime() - b.month.getTime());
  
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          <BarChart3 size={22} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analytics Overview</h2>
          <p className="text-sm text-slate-500">Performance across the subjects and grades you can access</p>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
          <Activity size={12} /> Live data
        </div>
      </div>
      <DashboardCharts 
        subjectPerformance={subjectPerformance} 
        gradeDistribution={gradeDistribution} 
        monthlyData={monthlySubmissions} 
      />
    </div>
  );
}

async function StaffRecentSection({ quizWhere, studentWhere, isAdmin }: {
  quizWhere: Prisma.QuizWhereInput;
  studentWhere: Prisma.UserWhereInput;
  isAdmin: boolean;
}) {
  const resultWhere: Prisma.ResultWhereInput = { quiz: quizWhere };
  const [recentQuizzes, recentSubmissions, topStudents] = await Promise.all([
    prisma.quiz.findMany({ 
      where: quizWhere,
      take: 5, 
      orderBy: { createdAt: "desc" }, 
      select: { 
        id: true, 
        title: true, 
        isPublished: true, 
        createdAt: true, 
        subject: { select: { name: true } }, 
        grade: { select: { level: true } }, 
        _count: { select: { results: true } } 
      } 
    }),
    prisma.result.findMany({ 
      where: resultWhere,
      take: 5, 
      orderBy: { completedAt: "desc" }, 
      select: { 
        id: true, 
        score: true, 
        completedAt: true, 
        student: { select: { name: true } }, 
        quiz: { select: { title: true, subject: { select: { name: true } } } } 
      } 
    }),
    prisma.result.groupBy({
      by: ["studentId"],
      where: resultWhere,
      _avg: { score: true },
      _count: { id: true },
      orderBy: { _avg: { score: "desc" } },
      take: 3,
    }),
  ]);
  const topStudentUsers = await prisma.user.findMany({
    where: { AND: [studentWhere, { id: { in: topStudents.map((student) => student.studentId) } }] },
    select: { id: true, name: true },
  });
  const studentNameMap = new Map(topStudentUsers.map((student) => [student.id, student.name]));
  const topStudentRows = topStudents.map((student) => ({
    name: studentNameMap.get(student.studentId) ?? "Student",
    avgScore: student._avg.score ?? 0,
    total: student._count.id,
  }));
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recent Assessments */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="text-indigo-500" size={20} /> Recent Assessments
          </h3>
          <Link href="/dashboard/quizzes" className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1 group">
            View All <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        <div className="space-y-3">
          {recentQuizzes.map((quiz) => (
            <div key={quiz.id} className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl hover:bg-slate-100/80 transition-all border border-slate-100 group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-semibold text-sm transition-all ${
                  quiz.isPublished 
                    ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white" 
                    : "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white"
                }`}>
                  {quiz.subject.name[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{quiz.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{quiz.subject.name} • Grade {quiz.grade?.level ?? "?"} • {quiz._count.results} submissions</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                quiz.isPublished 
                  ? "bg-indigo-50 text-indigo-700 border-indigo-100" 
                  : "bg-amber-50 text-amber-700 border-amber-100"
              }`}>
                {quiz.isPublished ? "Published" : "Draft"}
              </span>
            </div>
          ))}
          {recentQuizzes.length === 0 && (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <FileText size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No quizzes created yet.</p>
              <Link href="/dashboard/quizzes" className="text-sm text-indigo-600 font-semibold mt-2 inline-block hover:underline">
                Create your first assessment
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Right Column */}
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-5">Quick Actions</h3>
          <div className="space-y-2.5">
            <Link href="/dashboard/quizzes" className="flex items-center gap-3 p-3.5 bg-indigo-50/80 rounded-xl text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors border border-indigo-100/50 group">
              <Plus size={18} /> Create New Quiz 
              <ArrowUpRight size={14} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link href="/dashboard/students" className="flex items-center gap-3 p-3.5 bg-emerald-50/80 rounded-xl text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors border border-emerald-100/50 group">
              <Users size={18} /> Manage Students 
              <ArrowUpRight size={14} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
            </Link>
            {isAdmin && (
              <Link href="/dashboard/teachers" className="flex items-center gap-3 p-3.5 bg-amber-50/80 rounded-xl text-amber-700 font-semibold hover:bg-amber-100 transition-colors border border-amber-100/50 group">
                <Users size={18} /> Manage Teachers
                <ArrowUpRight size={14} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
              </Link>
            )}
          </div>
        </div>
        
        {/* Top Performers */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Target size={18} className="text-amber-500" /> Top Performers
          </h3>
          <div className="space-y-3">
            {topStudentRows.map((student, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  idx === 0 ? "bg-amber-100 text-amber-700" :
                  idx === 1 ? "bg-slate-200 text-slate-600" :
                  "bg-orange-100 text-orange-700"
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{student.name}</p>
                  <p className="text-xs text-slate-500">{student.total} quizzes taken</p>
                </div>
                <span className={`text-sm font-bold px-2 py-1 rounded-lg ${
                  (student.avgScore as number) >= 80 ? "bg-emerald-50 text-emerald-700" :
                  (student.avgScore as number) >= 60 ? "bg-amber-50 text-amber-700" :
                  "bg-red-50 text-red-700"
                }`}>
                  {(student.avgScore as number).toFixed(0)}%
                </span>
              </div>
            ))}
            {topStudentRows.length === 0 && (
              <p className="text-center text-slate-400 py-4 text-sm">No data available</p>
            )}
          </div>
        </div>
        
        {/* Recent Submissions */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Submissions</h3>
          <div className="space-y-3">
            {recentSubmissions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs border border-slate-200">
                    {sub.student.name?.[0] || "S"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{sub.student.name}</p>
                    <p className="text-xs text-slate-500">{sub.quiz.subject.name}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                  sub.score >= 80 ? "bg-emerald-50 text-emerald-700" : 
                  sub.score >= 50 ? "bg-amber-50 text-amber-700" : 
                  "bg-red-50 text-red-700"
                }`}>
                  {sub.score.toFixed(0)}%
                </span>
              </div>
            ))}
            {recentSubmissions.length === 0 && (
              <p className="text-center text-slate-400 py-4 text-sm">No submissions yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

async function StudentDashboardContent({ userId, userName }: { userId: string; userName: string }) {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { grade: { select: { level: true, id: true } } },
  });
  const userGradeLevel = currentUser?.grade?.level;
  const userGradeId = currentUser?.grade?.id;

  if (!userGradeLevel) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 sm:p-12 text-center shadow-sm">
          <AlertCircle size={48} className="mx-auto text-amber-400 mb-4" />
          <h2 className="text-xl font-bold text-amber-900 mb-2">Grade Not Assigned</h2>
          <p className="text-amber-700 max-w-md mx-auto">Please contact your administrator to assign you to a grade so you can start your NAFS preparation.</p>
        </div>
      </div>
    );
  }

  const [availableQuizzes, completedResults, upcomingQuizzes, subjectStats, streakData] = await Promise.all([
    prisma.quiz.count({ where: { isPublished: true, grade: { level: userGradeLevel } } }),
    prisma.result.findMany({ 
      where: { studentId: userId }, 
      take: 10, 
      select: { 
        id: true, 
        score: true, 
        completedAt: true, 
        quiz: { select: { id: true, title: true, subject: { select: { name: true } }, grade: { select: { level: true } } } } 
      }, 
      orderBy: { completedAt: "desc" } 
    }),
    prisma.quiz.findMany({ 
      where: { 
        isPublished: true, 
        grade: { level: userGradeLevel }, 
        NOT: { results: { some: { studentId: userId } } } 
      }, 
      select: { 
        id: true, 
        title: true, 
        createdAt: true, 
        subject: { select: { name: true } }, 
        grade: { select: { level: true } }, 
        _count: { select: { questions: true } } 
      }, 
      orderBy: { createdAt: "desc" }, 
      take: 5 
    }),
    prisma.$queryRaw<{ name: string; completed: number; total: number; avgScore: number }[]>`
      SELECT s.name, COUNT(DISTINCT CASE WHEN r."studentId" = ${userId} THEN r.id END)::int as completed,
        COUNT(DISTINCT q.id)::int as total, COALESCE(ROUND(AVG(CASE WHEN r."studentId" = ${userId} THEN r.score END)), 0)::int as "avgScore"
      FROM "Subject" s LEFT JOIN "Quiz" q ON q."subjectId" = s.id AND q."gradeId" = ${userGradeId}
      LEFT JOIN "Result" r ON r."quizId" = q.id AND r."studentId" = ${userId}
      GROUP BY s.id, s.name HAVING COUNT(q.id) > 0 ORDER BY total DESC
    `,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count FROM "Result" 
      WHERE "studentId" = ${userId} AND "completedAt" >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
    `
  ]);

  const completedCount = completedResults.length;
  const avgScore = completedCount > 0 ? completedResults.reduce((sum, r) => sum + r.score, 0) / completedCount : 0;
  const recentScores = completedResults.slice(0, 10).map((r) => ({ quiz: r.quiz.title, score: r.score, subject: r.quiz.subject.name }));
  const weeklyCount = (streakData[0]?.count as number) || 0;

  return (
    <>
      {/* Hero Header with Glassmorphism */}
      <header className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-3xl p-6 sm:p-8 lg:p-10 text-white shadow-2xl shadow-emerald-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/[0.08] rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-400/[0.1] rounded-full blur-3xl" />
        
        {/* Streak Badge */}
        {weeklyCount > 0 && (
          <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-2">
              <Zap size={16} className="text-yellow-300 fill-yellow-300" />
              <span className="text-sm font-bold">{weeklyCount} this week</span>
            </div>
          </div>
        )}
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold uppercase tracking-wider border border-white/10 mb-4">
              <Award size={14} /> Student Dashboard
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Hello, {userName}!</h1>
            <p className="text-emerald-100 mt-2 max-w-lg text-sm sm:text-base">Track your NAFS preparation progress, complete assessments, and review your performance.</p>
          </div>
          <Link href="/dashboard/quizzes" className="inline-flex items-center gap-2 bg-white text-emerald-700 px-5 py-3 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/20 transition-all group">
            <PlayCircle size={18} /> Browse Assessments
            <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard icon={<BookOpen size={22} />} label="Available" value={availableQuizzes} color="indigo" subvalue={`Grade ${userGradeLevel}`} />
        <StatCard icon={<CheckCircle2 size={22} />} label="Completed" value={completedCount} color="emerald" trend={completedCount > 0 ? "Keep it up!" : undefined} />
        <StatCard icon={<TrendingUp size={22} />} label="Average Score" value={`${Math.round(avgScore)}%`} color="amber" />
        <StatCard icon={<Clock size={22} />} label="Pending" value={Math.max(0, availableQuizzes - completedCount)} color={availableQuizzes > completedCount ? "amber" : "slate"} />
      </div>

      {/* Charts Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><BarChart3 size={22} /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Performance Overview</h2>
            <p className="text-sm text-slate-500">Your recent activity and subject breakdown</p>
          </div>
        </div>
        <DashboardCharts subjectPerformance={subjectStats} recentScores={recentScores} isStudent={true} />
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Assessments */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="text-emerald-500" size={20} /> Available Assessments
            </h3>
            <Link href="/dashboard/quizzes" className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1 group">
              View All <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingQuizzes.map((quiz) => (
              <Link key={quiz.id} href={`/dashboard/quizzes/solve/${quiz.id}`} className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl hover:bg-emerald-50/50 hover:border-emerald-100 transition-all border border-slate-100 group">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <PlayCircle size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{quiz.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{quiz.subject.name} • {quiz._count.questions} questions</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-white text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors shadow-sm">
                  Start
                </span>
              </Link>
            ))}
            {upcomingQuizzes.length === 0 && (
              <div className="text-center py-12 bg-emerald-50/30 rounded-2xl border border-dashed border-emerald-200">
                <CheckCircle2 size={40} className="mx-auto text-emerald-300 mb-3" />
                <p className="text-emerald-700 font-semibold">All caught up!</p>
                <p className="text-slate-500 text-sm mt-1">No pending assessments right now.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Links */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-5">Learning Tools</h3>
            <div className="space-y-2.5">
              <Link href="/dashboard/learning-path" className="flex items-center gap-3 p-3.5 bg-indigo-50/80 rounded-xl text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors border border-indigo-100/50 group">
                <Route size={18} /> Learning Path
                <ArrowUpRight size={14} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link href="/dashboard/diagnostics" className="flex items-center gap-3 p-3.5 bg-emerald-50/80 rounded-xl text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors border border-emerald-100/50 group">
                <BarChart3 size={18} /> Diagnostics & Reports
                <ArrowUpRight size={14} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link href="/dashboard/achievements" className="flex items-center gap-3 p-3.5 bg-amber-50/80 rounded-xl text-amber-700 font-semibold hover:bg-amber-100 transition-colors border border-amber-100/50 group">
                <Trophy size={18} /> Trophy Gallery
                <ArrowUpRight size={14} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>
          {/* Subject Breakdown */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-5">Subject Breakdown</h3>
            <div className="space-y-5">
              {subjectStats.map((sub) => (
                <div key={sub.name}>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-semibold text-slate-800 text-sm">{sub.name}</span>
                    <span className="font-bold text-slate-900 text-sm">{sub.avgScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-2.5 rounded-full transition-all duration-700 ${
                      sub.avgScore >= 80 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : 
                      sub.avgScore >= 60 ? "bg-gradient-to-r from-amber-400 to-yellow-300" : 
                      "bg-gradient-to-r from-red-500 to-rose-400"
                    }`} style={{ width: `${Math.max(sub.avgScore, 5)}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">{sub.completed} of {sub.total} completed</p>
                </div>
              ))}
              {subjectStats.length === 0 && (
                <div className="text-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-500 text-sm">No completed assessments yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Results */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Results</h3>
            <div className="space-y-3">
              {completedResults.slice(0, 5).map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-semibold text-slate-800 truncate">{result.quiz.title}</p>
                    <p className="text-xs text-slate-500">{result.quiz.subject.name}</p>
                  </div>
                  <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                    result.score >= 80 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : 
                    result.score >= 60 ? "bg-amber-50 text-amber-700 border border-amber-100" : 
                    "bg-red-50 text-red-700 border border-red-100"
                  }`}>
                    {result.score.toFixed(0)}%
                  </div>
                </div>
              ))}
              {completedResults.length === 0 && (
                <div className="text-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-500 text-sm">Start taking quizzes to see results!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Main page ─── */

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userRole = (session.user as any)?.role;
  const userId = (session.user as any)?.id;
  const userName = (session.user as any)?.name || "User";

  if (userRole === "ADMIN" || userRole === "TEACHER") {
    const assignments = userRole === "TEACHER"
      ? await prisma.teacherAssignment.findMany({
          where: { teacherId: userId },
          select: { subjectId: true, gradeId: true },
        })
      : [];
    const quizWhere: Prisma.QuizWhereInput = userRole === "TEACHER"
      ? assignments.length > 0
        ? { OR: assignments.map((assignment) => ({ subjectId: assignment.subjectId, gradeId: assignment.gradeId })) }
        : { id: "__no_teacher_assignments__" }
      : {};
    const teacherGradeIds = [...new Set(assignments.map((assignment) => assignment.gradeId))];
    const studentWhere: Prisma.UserWhereInput = {
      role: "STUDENT",
      ...(userRole === "TEACHER" ? { gradeId: { in: teacherGradeIds } } : {}),
    };

    return (
      <div className="space-y-6 sm:space-y-8">
        {/* Admin/Teacher Hero */}
        <header className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-6 sm:p-8 lg:p-10 text-white shadow-2xl shadow-indigo-500/20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/[0.08] rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-400/[0.1] rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold uppercase tracking-wider border border-white/10 mb-4">
                <Sparkles size={14} /> {userRole === "ADMIN" ? "Admin Dashboard" : "Teacher Dashboard"}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Welcome back, {userName}!</h1>
              <p className="text-indigo-100 mt-2 max-w-lg text-sm sm:text-base">
                {userRole === "ADMIN" 
                  ? "Monitor student progress, manage assessments, and track NAFS preparation performance."
                  : "Manage your classes, review student submissions, and create new assessments."}
              </p>
            </div>
            <Link href="/dashboard/quizzes" className="inline-flex items-center gap-2 bg-white text-indigo-700 px-5 py-3 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-indigo-500/20 transition-all group">
              <Plus size={18} /> Create Assessment
              <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </header>

        <Suspense fallback={<StatCardsSkeleton />}>
          <StaffStatCards quizWhere={quizWhere} studentWhere={studentWhere} />
        </Suspense>

        <Suspense fallback={<ChartSectionSkeleton />}>
          <StaffChartSection quizWhere={quizWhere} studentWhere={studentWhere} />
        </Suspense>

        <Suspense fallback={<RecentSectionSkeleton />}>
          <StaffRecentSection quizWhere={quizWhere} studentWhere={studentWhere} isAdmin={userRole === "ADMIN"} />
        </Suspense>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="space-y-6 sm:space-y-8">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[300px] bg-slate-50 rounded-2xl animate-pulse" />)}</div>}>
      <StudentDashboardContent userId={userId} userName={userName} />
    </Suspense>
  );
}

// ============================================
// ENHANCED HELPER COMPONENTS
// ============================================

function StatCard({ 
  icon, 
  label, 
  value, 
  color, 
  subvalue, 
  trend, 
  trendUp = true,
  subtitle
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  color: string;
  subvalue?: string;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
    blue: { 
      bg: "bg-blue-50", 
      text: "text-blue-600", 
      border: "border-blue-100/50",
      gradient: "from-blue-500 to-cyan-500"
    },
    indigo: { 
      bg: "bg-indigo-50", 
      text: "text-indigo-600", 
      border: "border-indigo-100/50",
      gradient: "from-indigo-500 to-violet-500"
    },
    emerald: { 
      bg: "bg-emerald-50", 
      text: "text-emerald-600", 
      border: "border-emerald-100/50",
      gradient: "from-emerald-500 to-teal-500"
    },
    amber: { 
      bg: "bg-amber-50", 
      text: "text-amber-600", 
      border: "border-amber-100/50",
      gradient: "from-amber-500 to-orange-500"
    },
    red: { 
      bg: "bg-red-50", 
      text: "text-red-600", 
      border: "border-red-100/50",
      gradient: "from-red-500 to-rose-500"
    },
    slate: { 
      bg: "bg-slate-50", 
      text: "text-slate-500", 
      border: "border-slate-100/50",
      gradient: "from-slate-500 to-slate-600"
    },
  };

  const colors = colorMap[color] || colorMap.slate;

  return (
    <div className="group bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-slate-300/80 transition-all duration-300 flex items-start justify-between relative overflow-hidden">
      {/* Subtle hover gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-[0.02] transition-opacity duration-300`} />
      
      <div className="flex items-start gap-4 relative z-10">
        <div className={`p-2.5 ${colors.bg} rounded-xl ${colors.text} border ${colors.border} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight group-hover:text-indigo-700 transition-colors">
            {value}
          </p>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
          {subvalue && <p className="text-xs text-slate-500 mt-1 font-medium">{subvalue}</p>}
          {subtitle && !subvalue && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
      </div>
      
      {trend && (
        <span className={`relative z-10 text-xs font-bold px-2.5 py-1 rounded-lg border ${
          trendUp 
            ? "text-emerald-600 bg-emerald-50 border-emerald-100" 
            : "text-red-600 bg-red-50 border-red-100"
        }`}>
          {trendUp ? "↑" : "↓"} {trend}
        </span>
      )}
    </div>
  );
}
