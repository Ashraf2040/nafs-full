// src/app/dashboard/statistics/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { SystemStatsChart } from "@/components/SystemStatsChart";
import { 
  Users, CheckCircle, TrendingUp, BarChart3, AlertTriangle, 
  BookOpen, Trophy, Filter
} from "lucide-react";
import StatFilters from "./StatFilters";
import GenerateRemediationBtn from "./GenerateRemediationBtn";
import { ScoreTrendsChart, GradePieChart, SubjectBarChart } from "./Charts";

export const revalidate = 0;

// ─── Helpers ───
function getRiskLevel(avg: number) {
  if (avg < 40) return { label: "Critical", icon: AlertTriangle, text: "text-red-600", bg: "bg-red-50", border: "border-red-200", progressColor: "bg-red-500" };
  if (avg < 60) return { label: "At Risk", icon: AlertTriangle, text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", progressColor: "bg-amber-500" };
  return { label: "Needs Work", icon: AlertTriangle, text: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", progressColor: "bg-orange-500" };
}

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ tab?: string; subject?: string; grade?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;
  const params = await searchParams;
  const filterSubject = params.subject;
  const filterGrade = params.grade ? parseInt(params.grade) : null;

  if (userRole === "STUDENT") redirect("/dashboard");

  // ─── Build filters ───
  const resultWhere: any = {};
  const quizWhere: any = {};
  
  if (filterSubject) {
    resultWhere.quiz = { subject: { name: filterSubject } };
    quizWhere.subject = { name: filterSubject };
  }
  if (filterGrade) {
    resultWhere.quiz = { ...resultWhere.quiz, grade: { level: filterGrade } };
    quizWhere.grade = { level: filterGrade };
  }

  // TEACHER SCOPE: only see their own subject/grade data
  let teacherSubjects: string[] = [];
  let teacherGrades: number[] = [];
  if (userRole === "TEACHER") {
    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: userId },
      include: { subject: true, grade: true },
    });
    teacherSubjects = assignments.map(a => a.subject.name);
    teacherGrades = assignments.map(a => a.grade.level);
    
    if (!filterSubject) {
      resultWhere.quiz = { ...resultWhere.quiz, subject: { name: { in: teacherSubjects } } };
      quizWhere.subject = { name: { in: teacherSubjects } };
    }
    if (!filterGrade) {
      resultWhere.quiz = { ...resultWhere.quiz, grade: { level: { in: teacherGrades } } };
      quizWhere.grade = { level: { in: teacherGrades } };
    }
  }

  // ─── Fetch data ───
  const totalStudents = await prisma.user.count({ where: { role: "STUDENT" } });
  const totalTeachers = await prisma.user.count({ where: { role: "TEACHER" } });
  const totalQuizzes = await prisma.quiz.count({ where: quizWhere });
  const publishedQuizzes = await prisma.quiz.count({ where: { ...quizWhere, isPublished: true } });

  const allResults = await prisma.result.findMany({
    where: Object.keys(resultWhere).length > 0 ? resultWhere : undefined,
    include: { 
      quiz: { include: { subject: true, grade: true } }, 
      student: true 
    },
  });

  const averageScore = allResults.length > 0 ? allResults.reduce((acc, curr) => acc + curr.score, 0) / allResults.length : 0;
  const totalSubmissions = allResults.length;
  const uniqueStudents = new Set(allResults.map((r) => r.studentId)).size;
  const completionRate = totalStudents > 0 ? (uniqueStudents / totalStudents) * 100 : 0;

  // ─── Subject Performance ───
  const subjectMap: Record<string, { totalScore: number; count: number; passed: number; failed: number }> = {};
  allResults.forEach((r) => {
    const subName = r.quiz.subject.name;
    if (!subjectMap[subName]) subjectMap[subName] = { totalScore: 0, count: 0, passed: 0, failed: 0 };
    subjectMap[subName].totalScore += r.score;
    subjectMap[subName].count++;
    if (r.score >= 50) subjectMap[subName].passed++;
    else subjectMap[subName].failed++;
  });

  const subjectChartData = Object.entries(subjectMap).map(([name, data]) => ({
    name,
    avg: Math.round(data.totalScore / data.count),
    submissions: data.count,
    passed: data.passed,
    failed: data.failed,
  }));

  // ─── Grade distribution for pie chart ───
  const gradeDistMap: Record<string, number> = {};
  allResults.forEach(r => {
    const level = r.quiz.grade?.level;
    if (level == null) return;
    const g = `Grade ${level}`;
    gradeDistMap[g] = (gradeDistMap[g] || 0) + 1;
  });
  const pieData = Object.entries(gradeDistMap).map(([name, value]) => ({ name, value }));

  // ─── Monthly trend (last 6 months) ───
  const months: Record<string, { score: number; count: number }> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months[`${d.toLocaleString('default', { month: 'short' })}`] = { score: 0, count: 0 };
  }
  allResults.forEach(r => {
    const m = r.completedAt.toLocaleString('default', { month: 'short' });
    if (months[m]) {
      months[m].score += r.score;
      months[m].count++;
    }
  });
  const trendData = Object.entries(months).map(([name, data]) => ({
    name,
    avg: data.count > 0 ? Math.round(data.score / data.count) : 0,
    submissions: data.count,
  }));

  // ─── Student rankings (scoped) ───
  const studentWhere: any = { role: "STUDENT" };
  if (userRole === "TEACHER") {
    const studentIds = [...new Set(allResults.map(r => r.studentId))];
    studentWhere.id = { in: studentIds };
  }
  
  const allStudents = await prisma.user.findMany({
    where: studentWhere,
    include: {
      submissions: {
        where: resultWhere.quiz ? { quiz: resultWhere.quiz } : undefined,
        include: { quiz: { include: { subject: true, grade: true } } },
      }
    }
  });

  const rankedStudents = allStudents
    .map(s => {
      const scores = s.submissions.map(sub => sub.score);
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const subjectAvgs: Record<string, number[]> = {};
      s.submissions.forEach(sub => {
        const sn = sub.quiz.subject.name;
        if (!subjectAvgs[sn]) subjectAvgs[sn] = [];
        subjectAvgs[sn].push(sub.score);
      });
      return {
        ...s,
        avgScore: avg,
        totalQuizzes: scores.length,
        highestScore: scores.length > 0 ? Math.max(...scores) : 0,
        strengths: Object.entries(subjectAvgs)
          .filter(([_, arr]) => arr.reduce((a,b)=>a+b,0)/arr.length >= 70)
          .map(([k, arr]) => ({ subject: k, avg: arr.reduce((a,b)=>a+b,0)/arr.length })),
        weaknesses: Object.entries(subjectAvgs)
          .filter(([_, arr]) => arr.reduce((a,b)=>a+b,0)/arr.length < 70)
          .map(([k, arr]) => ({ subject: k, avg: arr.reduce((a,b)=>a+b,0)/arr.length })),
      };
    })
    .filter(s => s.totalQuizzes > 0)
    .sort((a, b) => b.avgScore - a.avgScore);

  // ─── Struggling quizzes ───
  const quizMap: Record<string, { quiz: any; scores: number[]; lowScorers: any[] }> = {};
  allResults.forEach(r => {
    const key = r.quiz.id;
    if (!quizMap[key]) quizMap[key] = { quiz: r.quiz, scores: [], lowScorers: [] };
    quizMap[key].scores.push(r.score);
    if (r.score < 70) quizMap[key].lowScorers.push({ student: r.student, score: r.score });
  });
  const strugglingQuizzes = Object.values(quizMap)
    .map(q => ({ ...q, avg: q.scores.reduce((a, b) => a + b, 0) / q.scores.length }))
    .filter(q => q.avg < 70)
    .sort((a, b) => a.avg - b.avg);

  const allSubjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
  const allGrades = [...new Set(Object.keys(gradeDistMap).map(k => parseInt(k.replace("Grade ", ""))))].sort((a, b) => a - b);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <BarChart3 className="text-indigo-600" size={32} /> {userRole === "ADMIN" ? "Platform Analytics" : "My Class Analytics"}
        </h1>
        <p className="text-slate-500">Real-time performance metrics and actionable insights.</p>
      </header>

      <StatFilters subjects={allSubjects} grades={allGrades} defaultSubject={filterSubject} defaultGrade={filterGrade} />

      {/* KPI Cards */}
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

      {/* Charts Row */}
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

      {/* Subject Performance Bars */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Subject Performance</h2>
        <SubjectBarChart data={subjectChartData} />
      </div>

      {/* Rankings Table */}
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
                <th className="p-4">Strengths</th>
                <th className="p-4">Weaknesses</th>
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
                    <span className={`font-bold ${s.avgScore >= 80 ? "text-emerald-600" : s.avgScore >= 50 ? "text-amber-600" : "text-red-500"}`}>
                      {s.avgScore.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {s.strengths.map((str: any, i: number) => (
                        <span key={i} className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">{str.subject}</span>
                      ))}
                      {s.strengths.length === 0 && <span className="text-xs text-slate-400">-</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {s.weaknesses.map((w: any, i: number) => (
                        <span key={i} className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-md">{w.subject}</span>
                      ))}
                      {s.weaknesses.length === 0 && <span className="text-xs text-slate-400">-</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {rankedStudents.length === 0 && (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400">No student data available for the selected filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Struggling Quizzes */}
      {strugglingQuizzes.length > 0 && (
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
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-white/60 ${risk.text}`}>{sq.scores.length} submissions</span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-slate-900 text-lg mb-1">{sq.quiz.title}</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      {sq.quiz.subject.name} • Grade {sq.quiz.grade?.level ?? "?"}
                    </p>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-medium text-slate-600">Class Average</span>
                      <span className={`text-3xl font-black ${risk.text}`}>{sq.avg.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden border border-slate-200/50 mb-4">
                      <div className={`${risk.progressColor} h-3 rounded-full`} style={{ width: `${Math.min(sq.avg, 100)}%` }} />
                    </div>
                    <GenerateRemediationBtn quizId={sq.quiz.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}