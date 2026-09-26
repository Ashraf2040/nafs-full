"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, GraduationCap, School, BookOpen,
  CheckCircle2, Clock, AlertCircle, Target,
  RotateCcw, User, BarChart3, PieChart, TrendingUp
} from "lucide-react";
import toast from "react-hot-toast";
import {
  BarChart, Bar, PieChart as RPie, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

const GRADE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function ChartContainer({ children, height = 300 }: { children: React.ReactNode; height?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) {
    return <div style={{ width: '100%', height }} className="animate-pulse bg-slate-100 rounded-xl" />;
  }
  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <ResponsiveContainer width="100%" height={height}>
        {children as any}
      </ResponsiveContainer>
    </div>
  );
}

interface CompletedQuiz {
  id: string;
  title: string;
  score: number;
  totalPoints: number;
  percentage: number;
  completedAt: string;
  questionsCount: number;
  timeSpentSeconds: number | null;
  resultId: string;
}

interface IncompleteQuiz {
  id: string;
  title: string;
  questionsCount: number;
  createdAt: string;
}

export default function StudentReportDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const studentId = params.id as string;
  const subject = searchParams.get("subject") || "Math";
  const grade = searchParams.get("grade") || "6";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [republishing, setRepublishing] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/student-reports/${studentId}?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error("Failed to load report");
      }
    } catch {
      toast.error("Error loading report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [studentId, subject, grade]);

  const handleRepublish = async (quizId: string, quizTitle: string) => {
    if (!confirm(`Republish "${quizTitle}" for ${data?.student?.name}? This will delete their previous result and allow them to retake it.`)) {
      return;
    }
    setRepublishing(quizId);
    try {
      const res = await fetch(`/api/student-reports/${studentId}/republish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId }),
      });
      if (res.ok) {
        toast.success(`"${quizTitle}" republished`);
        fetchReport();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to republish");
      }
    } catch {
      toast.error("Error republishing quiz");
    } finally {
      setRepublishing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-red-500">
        <p className="text-lg font-semibold">Failed to load report</p>
        <button onClick={fetchReport} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl">Retry</button>
      </div>
    );
  }

  const { student, summary, completedQuizzes: cqRaw, iq: iqRaw } = data;
  const cq: CompletedQuiz[] = cqRaw || [];
  const iq: IncompleteQuiz[] = iqRaw || [];

  const completionData = [
    { name: "Completed", value: summary.totalCompleted, color: "#10b981" },
    { name: "Incomplete", value: summary.totalIncomplete, color: "#f59e0b" },
  ];

  const scoreBarData = cq.map((q, i) => ({
    name: q.title.length > 20 ? q.title.slice(0, 20) + "..." : q.title,
    percentage: q.percentage,
    fill: GRADE_COLORS[i % GRADE_COLORS.length],
  }));

  const bandData = [
    { name: "Exceeds (≥90%)", value: cq.filter(q => q.percentage >= 90).length, color: "#10b981" },
    { name: "Meets (70-89%)", value: cq.filter(q => q.percentage >= 70 && q.percentage < 90).length, color: "#6366f1" },
    { name: "Approaching (50-69%)", value: cq.filter(q => q.percentage >= 50 && q.percentage < 70).length, color: "#f59e0b" },
    { name: "Below (<50%)", value: cq.filter(q => q.percentage < 50).length, color: "#ef4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <Link
          href={`/dashboard/student-reports?subject=${encodeURIComponent(subject)}&grade=${grade}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors mb-3"
        >
          <ArrowLeft size={16} /> Back to Student List
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <User size={28} className="text-indigo-600" /> {student.name}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1"><GraduationCap size={14} /> Grade {student.gradeLevel}</span>
              {student.className && (
                <span className="inline-flex items-center gap-1"><School size={14} /> {student.className}</span>
              )}
              <span className="inline-flex items-center gap-1"><BookOpen size={14} /> {subject}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <BookOpen size={20} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{summary.totalQuizzes}</p>
          <p className="text-xs text-slate-500">Total Published Quizzes</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              {summary.totalQuizzes > 0 ? Math.round((summary.totalCompleted / summary.totalQuizzes) * 100) : 0}%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{summary.totalCompleted}</p>
          <p className="text-xs text-slate-500">Completed Quizzes</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertCircle size={20} />
            </div>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
              {summary.totalQuizzes > 0 ? Math.round((summary.totalIncomplete / summary.totalQuizzes) * 100) : 0}%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{summary.totalIncomplete}</p>
          <p className="text-xs text-slate-500">Incomplete Quizzes</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
              <Target size={20} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${summary.avgScore !== null ? (
            summary.avgScore >= 70 ? "text-emerald-600" : summary.avgScore >= 50 ? "text-amber-600" : "text-red-600"
          ) : "text-slate-800"}`}>
            {summary.avgScore !== null ? `${summary.avgScore}%` : "—"}
          </p>
          <p className="text-xs text-slate-500">Average Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <PieChart size={20} className="text-indigo-500" /> Completion Overview
          </h2>
          {summary.totalQuizzes === 0 ? (
            <p className="text-slate-400 text-center py-8">No quizzes published yet.</p>
          ) : (
            <ChartContainer height={260}>
              <RPie>
                <Pie
                  data={completionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"

                >
                  {completionData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RPie>
            </ChartContainer>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-emerald-500" /> Proficiency Bands
          </h2>
          {cq.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No completed quizzes.</p>
          ) : (
            <ChartContainer height={260}>
              <BarChart data={bandData} layout="vertical" margin={{ left: 100, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} width={130} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {bandData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-violet-500" /> Quiz Scores
        </h2>
        {cq.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No quizzes completed yet.</p>
        ) : (
          <ChartContainer height={300}>
            <BarChart data={scoreBarData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} angle={-20} textAnchor="end" height={70} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(value: any) => [`${value}%`, "Score"]} />
              <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                {scoreBarData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-green-500" />
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-500" /> Completed Quizzes
            </h2>
            <p className="text-sm text-slate-500 mb-4">Quizzes the student has submitted</p>

            {cq.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No quizzes completed yet.</p>
            ) : (
              <div className="space-y-3">
                {cq.map((q: CompletedQuiz) => (
                  <div key={q.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                    <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white font-bold ${
                      q.percentage >= 90 ? "bg-emerald-500" :
                      q.percentage >= 70 ? "bg-indigo-500" :
                      q.percentage >= 50 ? "bg-amber-500" :
                      "bg-red-500"
                    }`}>
                      <span className="text-lg leading-none">{q.percentage}</span>
                      <span className="text-[10px] leading-none mt-0.5">%</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{q.title}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span>{q.percentage}% score</span>
                        <span>{q.questionsCount} Qs</span>
                        {q.timeSpentSeconds && <span>{Math.round(q.timeSpentSeconds / 60)} min</span>}
                        <span>{new Date(q.completedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-1.5 w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            q.percentage >= 90 ? "bg-emerald-500" :
                            q.percentage >= 70 ? "bg-indigo-500" :
                            q.percentage >= 50 ? "bg-amber-500" :
                            "bg-red-500"
                          }`}
                          style={{ width: `${q.percentage}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleRepublish(q.id, q.title)}
                      disabled={republishing === q.id}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-50 transition-colors disabled:opacity-50"
                    >
                      {republishing === q.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      Republish
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock size={20} className="text-amber-500" /> Incomplete Quizzes
            </h2>
            <p className="text-sm text-slate-500 mb-4">Published quizzes not yet taken</p>

            {iq.length === 0 ? (
              <p className="text-slate-400 text-center py-8">All quizzes completed!</p>
            ) : (
              <div className="space-y-3">
                {iq.map((q: IncompleteQuiz) => (
                  <div key={q.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <Clock size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{q.title}</p>
                      <p className="text-xs text-slate-400">{q.questionsCount} questions</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
