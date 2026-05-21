// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  Users, FileText, TrendingUp, AlertCircle, CheckCircle2,
  BarChart3, Calendar, ChevronRight, PlayCircle
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

  // Fetch user with grade relation (new schema uses gradeId, not gradeLevel)
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

    // Recent activity
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

    // Performance by subject
    const subjectStats = await prisma.subject.findMany({
      include: {
        quizzes: {
          include: {
            results: true,
            grade: true,
          },
        },
      },
    });

    const subjectPerformance = subjectStats.map((s) => {
      const allScores = s.quizzes.flatMap((q) => q.results.map((r) => r.score));
      const avg = allScores.length > 0
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length
        : 0;
      return {
        name: s.name,
        quizzes: s.quizzes.length,
        submissions: allScores.length,
        avgScore: Math.round(avg),
      };
    }).filter((s) => s.submissions > 0);

    // Grade distribution — group by grade.level
    const gradeDistribution = await prisma.user.groupBy({
      by: ["gradeId"],
      where: { role: "STUDENT", gradeId: { not: null } },
      _count: { id: true },
    });

    // Fetch grade levels for the distribution data
    const gradeIds = gradeDistribution.map(g => g.gradeId).filter(Boolean) as string[];
    const grades = await prisma.grade.findMany({
      where: { id: { in: gradeIds } },
    });
    const gradeLevelMap = new Map(grades.map(g => [g.id, g.level]));

    // Monthly submissions trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySubmissions = await prisma.result.groupBy({
      by: ["completedAt"],
      where: { completedAt: { gte: sixMonthsAgo } },
      _count: { id: true },
    });

    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <header className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-2">Teacher Dashboard</p>
            <h1 className="text-3xl md:text-4xl font-black">Welcome back, {userName}!</h1>
            <p className="text-indigo-100 mt-2 max-w-xl">Monitor student progress, manage assessments, and track NAFS preparation performance across all grades.</p>
          </div>
        </header>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users size={24} />} label="Total Students" value={totalStudents} color="blue" />
          <StatCard icon={<FileText size={24} />} label="Total Quizzes" value={totalQuizzes} color="indigo" subvalue={`${publishedQuizzes} published`} />
          <StatCard icon={<CheckCircle2 size={24} />} label="Total Submissions" value={totalSubmissions} color="emerald" />
          <StatCard icon={<TrendingUp size={24} />} label="Average Score" value={`${Math.round(avgScore._avg?.score || 0)}%`} color="amber" />
        </div>

        {/* Charts & Analytics */}
        <DashboardCharts 
          subjectPerformance={subjectPerformance}
          gradeDistribution={gradeDistribution.map(g => ({
            gradeLevel: gradeLevelMap.get(g.gradeId!) || 0,
            count: g._count.id,
          }))}
          monthlyData={monthlySubmissions}
        />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Quizzes */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-indigo-600" size={20} /> Recent Assessments
              </h3>
              <Link href="/dashboard/quizzes" className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1">
                View All <ChevronRight size={16} />
              </Link>
            </div>
            <div className="space-y-3">
              {recentQuizzes.map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${quiz.isPublished ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"}`}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{quiz.title}</p>
                      <p className="text-xs text-slate-500">{quiz.subject.name} • Grade {quiz.grade?.level ?? "?"} • {quiz._count.results} submissions</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${quiz.isPublished ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"}`}>
                    {quiz.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
              ))}
              {recentQuizzes.length === 0 && (
                <p className="text-center text-slate-400 py-8">No quizzes created yet.</p>
              )}
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/dashboard/quizzes" className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors">
                  <PlusIcon /> Create New Quiz
                </Link>
                <Link href="/dashboard/students" className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors">
                  <Users size={18} /> Manage Students
                </Link>
                <Link href="/dashboard/teachers" className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl text-amber-700 font-semibold hover:bg-amber-100 transition-colors">
                  <Users size={18} /> Manage Teachers
                </Link>
              </div>
            </div>

            {/* Recent Submissions */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Submissions</h3>
              <div className="space-y-3">
                {recentSubmissions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                        {sub.student.name?.[0] || "S"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{sub.student.name}</p>
                        <p className="text-xs text-slate-400">{sub.quiz.title}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${sub.score >= 80 ? "text-emerald-600" : sub.score >= 50 ? "text-amber-600" : "text-red-600"}`}>
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
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold text-amber-800 mb-2">Grade Not Assigned</h2>
          <p className="text-amber-700">Please contact your administrator to assign you to a grade.</p>
        </div>
      </div>
    );
  }

  // Fetch student's quizzes and results
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

  // Upcoming quizzes (not completed) — no dueDate, so use createdAt desc
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

  // Subject-wise performance
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
      return {
        name: s.name,
        completed: scores.length,
        total: s.quizzes.length,
        avgScore: Math.round(avg),
      };
    })
    .filter((s) => s.total > 0);

  // Recent results for chart
  const recentScores = completedResults.slice(0, 10).map((r) => ({
    quiz: r.quiz.title,
    score: r.score,
    subject: r.quiz.subject.name,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <header className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <p className="text-emerald-100 text-sm font-bold uppercase tracking-widest mb-2">Student Dashboard</p>
          <h1 className="text-3xl md:text-4xl font-black">Hello, {userName}!</h1>
          <p className="text-emerald-100 mt-2 max-w-xl">Track your NAFS preparation progress, complete assessments, and review your performance.</p>
        </div>
      </header>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FileText size={24} />} label="Available" value={availableQuizzes} color="indigo" subvalue={`Grade ${userGradeLevel}`} />
        <StatCard icon={<CheckCircle2 size={24} />} label="Completed" value={completedCount} color="emerald" />
        <StatCard icon={<TrendingUp size={24} />} label="Average Score" value={`${Math.round(avgScore)}%`} color="amber" />
        <StatCard icon={<AlertCircle size={24} />} label="Pending" value={availableQuizzes - completedCount} color={availableQuizzes > completedCount ? "amber" : "slate"} />
      </div>

      {/* Charts & Progress */}
      <DashboardCharts 
        subjectPerformance={subjectStats}
        recentScores={recentScores}
        isStudent={true}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Quizzes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="text-indigo-600" size={20} /> Available Assessments
            </h3>
            <Link href="/dashboard/quizzes" className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingQuizzes.map((quiz) => (
              <Link 
                key={quiz.id} 
                href={`/dashboard/quizzes/solve/${quiz.id}`}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-indigo-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <PlayCircle size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{quiz.title}</p>
                    <p className="text-xs text-slate-500">{quiz.subject.name} • {quiz._count.questions} questions</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700">
                  Start
                </span>
              </Link>
            ))}
            {upcomingQuizzes.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 size={40} className="mx-auto text-emerald-300 mb-3" />
                <p className="text-slate-500 font-medium">All caught up! No pending assessments.</p>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Performance Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Subject Breakdown</h3>
            <div className="space-y-4">
              {subjectStats.map((sub) => (
                <div key={sub.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-700">{sub.name}</span>
                    <span className="font-bold text-slate-900">{sub.avgScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        sub.avgScore >= 80 ? "bg-emerald-500" : 
                        sub.avgScore >= 60 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${sub.avgScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{sub.completed} of {sub.total} completed</p>
                </div>
              ))}
              {subjectStats.length === 0 && (
                <p className="text-center text-slate-400 py-4 text-sm">No completed assessments yet.</p>
              )}
            </div>
          </div>

          {/* Recent Results */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Results</h3>
            <div className="space-y-3">
              {completedResults.slice(0, 5).map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{result.quiz.title}</p>
                    <p className="text-xs text-slate-400">{result.quiz.subject.name}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    result.score >= 80 ? "bg-emerald-100 text-emerald-700" :
                    result.score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                  }`}>
                    {result.score.toFixed(0)}%
                  </div>
                </div>
              ))}
              {completedResults.length === 0 && (
                <p className="text-center text-slate-400 py-4 text-sm">Start taking quizzes to see results!</p>
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

function StatCard({ icon, label, value, color, subvalue }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  color: string;
  subvalue?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-600" },
    red: { bg: "bg-red-50", text: "text-red-600" },
    slate: { bg: "bg-slate-50", text: "text-slate-600" },
  };

  const colors = colorMap[color] || colorMap.slate;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`p-3 ${colors.bg} rounded-xl ${colors.text}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900">{value}</p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        {subvalue && <p className="text-xs text-slate-500 mt-0.5">{subvalue}</p>}
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}