import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Users, FileText, TrendingUp, AlertCircle, CheckCircle2,
  BarChart3, Calendar, ChevronRight, PlayCircle, Plus,
  Clock, Award, BookOpen, Sparkles, ArrowUpRight
} from "lucide-react";
import DashboardCharts from "@/components/DashboardCharts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as any)?.role;
  const userId = (session.user as any)?.id;
  const userName = (session.user as any)?.name || "User";

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { grade: true },
  });
  const userGradeLevel = currentUser?.grade?.level;

  // ============================================
  // TEACHER / ADMIN DASHBOARD DATA
  // ============================================
  if (userRole === "ADMIN" || userRole === "TEACHER") {
    const totalStudents = await prisma.user.count({ where: { role: "STUDENT" } });
    const totalQuizzes = await prisma.quiz.count();
    const publishedQuizzes = await prisma.quiz.count({ where: { isPublished: true } });

    const totalSubmissions = await prisma.result.count();
    const avgScore = await prisma.result.aggregate({
      _avg: { score: true },
    });

    const recentQuizzes = await prisma.quiz.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { subject: true, grade: true, _count: { select: { results: true } } },
    });

    const recentSubmissions = await prisma.result.findMany({
      take: 5,
      orderBy: { completedAt: "desc" },
      include: { student: true, quiz: { include: { subject: true } } },
    });

    const subjectStats = await prisma.subject.findMany({
      include: {
        quizzes: {
          include: { results: true, grade: true },
        },
      },
    });

    const subjectPerformance = subjectStats.map((s) => {
      const allScores = s.quizzes.flatMap((q) => q.results.map((r) => r.score));
      const avg = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
      return { name: s.name, quizzes: s.quizzes.length, submissions: allScores.length, avgScore: Math.round(avg) };
    }).filter((s) => s.submissions > 0);

    const gradeDistribution = await prisma.user.groupBy({
      by: ["gradeId"],
      where: { role: "STUDENT", gradeId: { not: null } },
      _count: { id: true },
    });

    const gradeIds = gradeDistribution.map(g => g.gradeId).filter(Boolean) as string[];
    const grades = await prisma.grade.findMany({ where: { id: { in: gradeIds } } });
    const gradeLevelMap = new Map(grades.map(g => [g.id, g.level]));

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySubmissions = await prisma.result.groupBy({
      by: ["completedAt"],
      where: { completedAt: { gte: sixMonthsAgo } },
      _count: { id: true },
    });

    return (
      <div className="space-y-6 sm:space-y-8">
        {/* Welcome Header */}
        <header className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-6 sm:p-8 lg:p-10 text-white shadow-2xl shadow-indigo-500/20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/[0.08] rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-400/[0.1] rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold uppercase tracking-wider border border-white/10 mb-4">
                <Sparkles size={14} /> Teacher Dashboard
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Welcome back, {userName}!</h1>
              <p className="text-indigo-100 mt-2 max-w-lg text-sm sm:text-base">Monitor student progress, manage assessments, and track NAFS preparation performance.</p>
            </div>
            <Link 
              href="/dashboard/quizzes" 
              className="inline-flex items-center gap-2 bg-white text-indigo-700 px-5 py-3 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-indigo-500/20 transition-all group"
            >
              <Plus size={18} /> Create Assessment 
              <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </header>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard icon={<Users size={22} />} label="Total Students" value={totalStudents} color="blue" trend="+12%" />
          <StatCard icon={<FileText size={22} />} label="Total Quizzes" value={totalQuizzes} color="indigo" subvalue={`${publishedQuizzes} published`} />
          <StatCard icon={<CheckCircle2 size={22} />} label="Total Submissions" value={totalSubmissions} color="emerald" />
          <StatCard icon={<TrendingUp size={22} />} label="Average Score" value={`${Math.round(avgScore._avg?.score || 0)}%`} color="amber" />
        </div>

        {/* Charts & Analytics */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart3 size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Analytics Overview</h2>
              <p className="text-sm text-slate-500">Platform performance across subjects</p>
            </div>
          </div>
          <DashboardCharts 
            subjectPerformance={subjectPerformance}
            gradeDistribution={gradeDistribution.map(g => ({
              gradeLevel: gradeLevelMap.get(g.gradeId!) || 0,
              count: g._count.id,
            }))}
            monthlyData={monthlySubmissions}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Quizzes */}
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
                <div key={quiz.id} className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl hover:bg-slate-100/80 transition-colors border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-semibold ${quiz.isPublished ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"}`}>
                      {quiz.subject.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{quiz.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{quiz.subject.name} • Grade {quiz.grade?.level ?? "?"} • {quiz._count.results} submissions</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${quiz.isPublished ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                    {quiz.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
              ))}
              {recentQuizzes.length === 0 && (
                <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No quizzes created yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h3>
              <div className="space-y-2.5">
                <Link href="/dashboard/quizzes" className="flex items-center gap-3 p-3.5 bg-indigo-50/80 rounded-xl text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors border border-indigo-100/50 group">
                  <Plus size={18} /> Create New Quiz <ArrowUpRight size={14} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link href="/dashboard/students" className="flex items-center gap-3 p-3.5 bg-emerald-50/80 rounded-xl text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors border border-emerald-100/50 group">
                  <Users size={18} /> Manage Students <ArrowUpRight size={14} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                </Link>
                <Link href="/dashboard/teachers" className="flex items-center gap-3 p-3.5 bg-amber-50/80 rounded-xl text-amber-700 font-semibold hover:bg-amber-100 transition-colors border border-amber-100/50 group">
                  <Users size={18} /> Manage Teachers <ArrowUpRight size={14} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                </Link>
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
                      sub.score >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
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
      </div>
    );
  }

  // ============================================
  // STUDENT DASHBOARD DATA
  // ============================================

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

  const availableQuizzes = await prisma.quiz.count({
    where: { isPublished: true, grade: { level: userGradeLevel } },
  });

  const completedResults = await prisma.result.findMany({
    where: { studentId: userId },
    include: { quiz: { include: { subject: true, grade: true } } },
    orderBy: { completedAt: "desc" },
  });

  const completedCount = completedResults.length;
  const avgScore = completedCount > 0
    ? completedResults.reduce((sum, r) => sum + r.score, 0) / completedCount
    : 0;

  const upcomingQuizzes = await prisma.quiz.findMany({
    where: {
      isPublished: true,
      grade: { level: userGradeLevel },
      NOT: { results: { some: { studentId: userId } } },
    },
    include: { subject: true, grade: true, _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const subjectPerformance = await prisma.subject.findMany({
    include: {
      quizzes: {
        where: { grade: { level: userGradeLevel } },
        include: {
          results: { where: { studentId: userId } },
          grade: true,
        },
      },
    },
  });

  const subjectStats = subjectPerformance
    .map((s) => {
      const scores = s.quizzes.flatMap((q) => q.results.map((r) => r.score));
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return { name: s.name, completed: scores.length, total: s.quizzes.length, avgScore: Math.round(avg) };
    })
    .filter((s) => s.total > 0);

  const recentScores = completedResults.slice(0, 10).map((r) => ({
    quiz: r.quiz.title,
    score: r.score,
    subject: r.quiz.subject.name,
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Header */}
      <header className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-3xl p-6 sm:p-8 lg:p-10 text-white shadow-2xl shadow-emerald-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/[0.08] rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-400/[0.1] rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold uppercase tracking-wider border border-white/10 mb-4">
              <Award size={14} /> Student Dashboard
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Hello, {userName}!</h1>
            <p className="text-emerald-100 mt-2 max-w-lg text-sm sm:text-base">Track your NAFS preparation progress, complete assessments, and review your performance.</p>
          </div>
          <Link 
            href="/dashboard/quizzes" 
            className="inline-flex items-center gap-2 bg-white text-emerald-700 px-5 py-3 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/20 transition-all group"
          >
            <PlayCircle size={18} /> Browse Assessments 
            <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </header>

      {/* Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard icon={<BookOpen size={22} />} label="Available" value={availableQuizzes} color="indigo" subvalue={`Grade ${userGradeLevel}`} />
        <StatCard icon={<CheckCircle2 size={22} />} label="Completed" value={completedCount} color="emerald" />
        <StatCard icon={<TrendingUp size={22} />} label="Average Score" value={`${Math.round(avgScore)}%`} color="amber" />
        <StatCard icon={<Clock size={22} />} label="Pending" value={Math.max(0, availableQuizzes - completedCount)} color={availableQuizzes > completedCount ? "amber" : "slate"} />
      </div>

      {/* Charts & Progress */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <BarChart3 size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Performance Overview</h2>
            <p className="text-sm text-slate-500">Your recent activity and subject breakdown</p>
          </div>
        </div>
        <DashboardCharts 
          subjectPerformance={subjectStats}
          recentScores={recentScores}
          isStudent={true}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Quizzes */}
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
              <Link 
                key={quiz.id} 
                href={`/dashboard/quizzes/solve/${quiz.id}`}
                className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl hover:bg-emerald-50/50 hover:border-emerald-100 transition-all border border-slate-100 group"
              >
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

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Performance Summary */}
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
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        sub.avgScore >= 80 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : 
                        sub.avgScore >= 60 ? "bg-gradient-to-r from-amber-400 to-yellow-300" : "bg-gradient-to-r from-red-500 to-rose-400"
                      }`}
                      style={{ width: `${Math.max(sub.avgScore, 5)}%` }}
                    />
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
                <div key={result.id} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-semibold text-slate-800 truncate">{result.quiz.title}</p>
                    <p className="text-xs text-slate-500">{result.quiz.subject.name}</p>
                  </div>
                  <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                    result.score >= 80 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                    result.score >= 60 ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-red-50 text-red-700 border border-red-100"
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
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function StatCard({ icon, label, value, color, subvalue, trend }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  color: string;
  subvalue?: string;
  trend?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100/50" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100/50" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100/50" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100/50" },
    red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-100/50" },
    slate: { bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-100/50" },
  };

  const colors = colorMap[color] || colorMap.slate;

  return (
    <div className={`bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex items-start justify-between`}>
      <div className="flex items-start gap-4">
        <div className={`p-2.5 ${colors.bg} rounded-xl ${colors.text} border ${colors.border}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight">{value}</p>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
          {subvalue && <p className="text-xs text-slate-500 mt-1 font-medium">{subvalue}</p>}
        </div>
      </div>
      {trend && (
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
          {trend}
        </span>
      )}
    </div>
  );
}