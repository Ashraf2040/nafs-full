import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Mail, BookOpen, FileText, Users, TrendingUp } from "lucide-react";
import TeacherPerformanceChart from "./TeacherPerformanceChart";

export const dynamic = "force-dynamic";

export default async function TeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const teacher = await prisma.user.findUnique({
    where: { id, role: "TEACHER" },
    include: {
      assignments: { include: { subject: true, grade: true } },
      quizzes: {
        include: {
          subject: true,
          grade: true,
          // Include results with their quiz relation so we can access grade
          results: { 
            include: { 
              student: true,
              quiz: { include: { grade: true } } // <-- FIX: include quiz with grade
            } 
          },
          questions: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!teacher) notFound();

  const allResults = teacher.quizzes.flatMap(q => q.results);
  const avgScore = allResults.length > 0 ? allResults.reduce((a, b) => a + b.score, 0) / allResults.length : 0;
  const uniqueStudents = new Set(allResults.map(r => r.studentId)).size;

  // Group assignments by subject name
  const groupedAssignments = teacher.assignments.reduce((acc, a) => {
    const name = a.subject.name;
    if (!acc[name]) acc[name] = [];
    acc[name].push(a.grade.level);
    return acc;
  }, {} as Record<string, number[]>);

  // Chart data by grade level
  const gradeMap: Record<number, { total: number; count: number }> = {};
  allResults.forEach(r => {
    const level = r.quiz?.grade?.level; // <-- FIX: optional chaining
    if (level == null) return;
    if (!gradeMap[level]) gradeMap[level] = { total: 0, count: 0 };
    gradeMap[level].total += r.score;
    gradeMap[level].count++;
  });
  const chartData = Object.entries(gradeMap).map(([level, data]) => ({
    name: `Grade ${level}`,
    score: Math.round(data.total / data.count),
    students: data.count,
  })).sort((a, b) => parseInt(a.name.split(" ")[1]) - parseInt(b.name.split(" ")[1]));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link href="/dashboard/teachers" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm mb-4">
        <ArrowLeft size={16} /> Back to Teachers
      </Link>

      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-8 text-white shadow-xl">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold backdrop-blur-sm border-2 border-white/40">
            {teacher.name?.[0] || "T"}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{teacher.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-indigo-100">
              <span className="flex items-center gap-1"><Mail size={16} /> {teacher.email}</span>
              <span className="flex items-center gap-1"><BookOpen size={16} /> {Object.keys(groupedAssignments).length} Subjects</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<FileText size={24} />} label="Quizzes Created" value={teacher.quizzes.length} color="indigo" />
        <StatCard icon={<Users size={24} />} label="Total Students" value={uniqueStudents} color="blue" />
        <StatCard icon={<TrendingUp size={24} />} label="Avg Class Score" value={`${avgScore.toFixed(1)}%`} color="emerald" />
        <StatCard icon={<BookOpen size={24} />} label="Total Submissions" value={allResults.length} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4">Performance by Grade</h3>
          <TeacherPerformanceChart data={chartData} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4">Assigned Subjects</h3>
          <div className="space-y-3">
            {Object.entries(groupedAssignments).map(([subjName, levels]) => (
              <div key={subjName} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-700">{subjName}</span>
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg">Grades: {levels.join(", ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-4">Recent Quizzes</h3>
        <div className="space-y-3">
          {teacher.quizzes.slice(0, 10).map(q => (
            <div key={q.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-bold text-slate-800 text-sm">{q.title}</p>
                <p className="text-xs text-slate-500">
                  {q.subject?.name || "Unknown"} • Grade {q.grade?.level || "?"} • {q.questions.length} Qs • {q.results.length} submissions
                </p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${q.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {q.isPublished ? "Published" : "Draft"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-black text-slate-900">{value}</p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}