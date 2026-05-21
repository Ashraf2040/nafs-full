// src/app/dashboard/students/profile/[id]/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Award, BarChart3, Printer, BookOpen, TrendingUp, Calendar, CheckCircle2, AlertCircle, GraduationCap, FileText } from "lucide-react";
import CertificateButton from "@/components/CertificateButton";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as any)?.role;
  const resolvedParams = await params;

  // Students can only view their own profile
  if (userRole === "STUDENT" && (session.user as any).id !== resolvedParams.id) {
    redirect("/dashboard");
  }

  const student = await prisma.user.findUnique({
  where: { id: resolvedParams.id },
  include: {
    grade: true, // 🔥 لازم ده
    submissions: {
      include: { quiz: { include: { subject: true } } },
      orderBy: { completedAt: "desc" },
    },
  },
});

  if (!student) return <div className="p-10 text-center text-red-500 font-bold">Student not found</div>;

  // Group stats by subject
  const statsBySubject = student.submissions.reduce((acc: any, sub) => {
    const subName = sub.quiz.subject.name;
    if (!acc[subName]) acc[subName] = { count: 0, totalScore: 0, highestScore: 0, lowestScore: 100 };
    acc[subName].count++;
    acc[subName].totalScore += sub.score;
    acc[subName].highestScore = Math.max(acc[subName].highestScore, sub.score);
    acc[subName].lowestScore = Math.min(acc[subName].lowestScore, sub.score);
    return acc;
  }, {});

  // Overall stats
  const overallAverage = student.submissions.length > 0
    ? student.submissions.reduce((acc, s) => acc + s.score, 0) / student.submissions.length
    : 0;

  const totalQuizzesTaken = student.submissions.length;
  const excellentScores = student.submissions.filter((s) => s.score >= 80).length;
  const needsImprovement = student.submissions.filter((s) => s.score < 50).length;

  // Recent submissions
  const recentSubmissions = student.submissions.slice(0, 5);

  return (
    <div id="student-report" className="max-w-5xl mx-auto space-y-8">
      {/* Report Header - Only visible when printing */}
      <div className="hidden print:block mb-8 text-center">
        <h1 className="text-3xl font-black text-slate-900">NAFS Student Progress Report</h1>
        <p className="text-slate-500 mt-2">Generated on {new Date().toLocaleDateString()}</p>
        <div className="w-full h-1 bg-indigo-600 mt-4"></div>
      </div>

      {/* Profile Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold shadow-inner">
            {student.name?.[0] || "S"}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">{student.name}</h1>
            <p className="text-slate-500 flex items-center gap-2 mt-1">
             <Calendar size={16} />
Grade {student.grade?.level ?? "N/A"} • {student.className || "No class"}
            </p>
          </div>
        </div>
        <div className="flex gap-3 no-print">
          <PrintButton />
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-3xl font-black text-indigo-600 mb-1">{totalQuizzesTaken}</div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quizzes Taken</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className={`text-3xl font-black mb-1 ${overallAverage >= 80 ? "text-emerald-600" : overallAverage >= 50 ? "text-amber-600" : "text-red-500"}`}>
            {overallAverage.toFixed(1)}%
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Score</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-3xl font-black text-emerald-600 mb-1">{excellentScores}</div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Excellent (80%+)</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-3xl font-black text-red-500 mb-1">{needsImprovement}</div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Needs Help (&lt;50%)</p>
        </div>
      </div>

      {/* Subject Breakdown */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <BarChart3 size={24} className="text-indigo-600" /> Performance by Subject
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(statsBySubject).map(([subject, data]: any) => {
            const avg = data.totalScore / data.count;
            return (
              <div key={subject} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BookOpen size={18} className="text-indigo-500" /> {subject}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Quizzes Taken</span>
                    <span className="font-bold">{data.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Average Score</span>
                    <span className={`font-bold ${avg >= 80 ? "text-emerald-600" : avg >= 50 ? "text-amber-600" : "text-red-500"}`}>
                      {avg.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Highest</span>
                    <span className="font-bold text-emerald-600">{data.highestScore.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Lowest</span>
                    <span className="font-bold text-red-500">{data.lowestScore.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${avg >= 80 ? "bg-emerald-500" : avg >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(avg, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <TrendingUp size={24} className="text-indigo-600" /> Recent Submissions
        </h2>
        {recentSubmissions.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <AlertCircle size={40} className="mx-auto mb-3" />
            <p>No submissions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSubmissions.map((sub) => (
              <div key={sub.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${
                  sub.score >= 80 ? "bg-emerald-100 text-emerald-700" :
                  sub.score >= 50 ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {sub.score.toFixed(0)}%
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{sub.quiz.title}</p>
                  <p className="text-xs text-slate-500">{sub.quiz.subject.name} • {new Date(sub.completedAt).toLocaleDateString()}</p>
                </div>
                {sub.score >= 80 && <CheckCircle2 size={20} className="text-emerald-500" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certificate Issuance */}
      {overallAverage >= 80 && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row justify-between items-center shadow-lg no-print">
          <div className="mb-6 md:mb-0">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Award size={32} /> Mastery Achievement
            </h2>
            <p className="opacity-90 mt-1">
              {student.name} has achieved an overall average of {overallAverage.toFixed(1)}% across all subjects.
            </p>
          </div>
          <CertificateButton
            studentName={student.name || ""}
            subject="All Subjects"
            date={new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            teacherName="Ashraf Elsayed"
            score={overallAverage}
          />
        </div>
      )}

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-8 border-t-2 border-slate-200 text-center">
        <p className="text-sm text-slate-500">NAFS Preparation Portal • Official Progress Report</p>
        <p className="text-xs text-slate-400 mt-1">This document was generated automatically and is valid without signature.</p>
      </div>
    </div>
  );
}