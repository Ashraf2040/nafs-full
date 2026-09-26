"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, ArrowLeft, CheckCircle2, XCircle, RefreshCcw,
  Trophy, BookOpen, GraduationCap, Clock, Calendar,
  FileText, AlertCircle, PlayCircle, LayoutGrid, Lock,
  Mail, MessageCircle, AlertTriangle
} from "lucide-react";

interface QuizWithStatus {
  id: string;
  title: string;
  subject: { name: string };
  grade: { level: number };
  questions: any[];
  createdAt: string;
  isPublished: boolean;
  dueDate: string | null;
  result: {
    id: string;
    score: number;
    totalPoints: number;
    createdAt: string;
    attemptNumber: number;
  } | null;
  attemptsUsed: number;
  status: "completed" | "expired" | "active";
}

const MAX_ATTEMPTS = 3;

export default function CompletedQuizzesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  const [quizzes, setQuizzes] = useState<QuizWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Redirect non-students
  useEffect(() => {
    if (status === "authenticated" && userRole !== "STUDENT") {
      router.push("/dashboard/quizzes");
    }
  }, [status, userRole, router]);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;

    const fetchQuizzes = async () => {
      try {
        // Fetch all quizzes for this student with their results
        const res = await fetch(`/api/students/all-quizzes?studentId=${userId}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch quizzes");
        }
        const data = await res.json();
        setQuizzes(data.quizzes || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [status, userId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Trophy size={16} className="text-emerald-500" />;
    if (score >= 60) return <CheckCircle2 size={16} className="text-amber-500" />;
    return <XCircle size={16} className="text-red-500" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Needs Practice";
  };

  const handleAskReset = (quizTitle: string) => {
    // In a real app, this would send a notification to the teacher
    // For now, we show an alert/toast
    alert(`Reset request sent to your teacher for: "${quizTitle}"`);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium">Loading your assessments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-slate-500 max-w-md">{error}</p>
        </div>
        <Link
          href="/dashboard/quizzes"
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} /> Back to Quizzes
        </Link>
      </div>
    );
  }

  const completedQuizzes = quizzes.filter((q) => q.status === "completed");
  const expiredQuizzes = quizzes.filter((q) => q.status === "expired");
  const activeQuizzes = quizzes.filter((q) => q.status === "active");

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50">
              <LayoutGrid size={22} />
            </div>
            My Assessments
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm ml-[46px]">
            View all your assessments — completed, active, and expired
          </p>
        </div>

        <Link
          href="/dashboard/quizzes"
          className="flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
        >
          <ArrowLeft size={16} /> Back to Quizzes
        </Link>
      </div>

      {/* Stats Summary */}
      {quizzes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{quizzes.length}</p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{completedQuizzes.length}</p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Completed</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <PlayCircle size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{activeQuizzes.length}</p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-slate-50 rounded-xl text-slate-600">
              <Lock size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{expiredQuizzes.length}</p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Expired</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Quizzes Section */}
      {activeQuizzes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <div className="w-2 h-6 bg-indigo-500 rounded-full" />
            Active Assessments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {activeQuizzes.map((quiz) => (
              <QuizCard 
                key={quiz.id} 
                quiz={quiz} 
                variant="active" 
                getScoreColor={getScoreColor}
                getScoreIcon={getScoreIcon}
                getScoreLabel={getScoreLabel}
                onAskReset={handleAskReset}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Quizzes Section */}
      {completedQuizzes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <div className="w-2 h-6 bg-emerald-500 rounded-full" />
            Completed Assessments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {completedQuizzes.map((quiz) => (
              <QuizCard 
                key={quiz.id} 
                quiz={quiz} 
                variant="completed" 
                getScoreColor={getScoreColor}
                getScoreIcon={getScoreIcon}
                getScoreLabel={getScoreLabel}
                onAskReset={handleAskReset}
              />
            ))}
          </div>
        </div>
      )}

      {/* Expired Quizzes Section */}
      {expiredQuizzes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <div className="w-2 h-6 bg-slate-400 rounded-full" />
            Expired Assessments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {expiredQuizzes.map((quiz) => (
              <QuizCard 
                key={quiz.id} 
                quiz={quiz} 
                variant="expired" 
                getScoreColor={getScoreColor}
                getScoreIcon={getScoreIcon}
                getScoreLabel={getScoreLabel}
                onAskReset={handleAskReset}
              />
            ))}
          </div>
        </div>
      )}

      {quizzes.length === 0 && (
        <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="inline-flex p-5 bg-slate-50 rounded-2xl border border-slate-100 mb-5">
            <LayoutGrid size={32} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Assessments Yet</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
            You don&apos;t have any assessments yet. Head over to the available quizzes to start your first assessment!
          </p>
          <Link
            href="/dashboard/quizzes"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md"
          >
            <PlayCircle size={18} /> Browse Available Quizzes
          </Link>
        </div>
      )}
    </div>
  );
}

// Reusable Quiz Card Component
function QuizCard({ 
  quiz, 
  variant, 
  getScoreColor, 
  getScoreIcon, 
  getScoreLabel,
  onAskReset 
}: { 
  quiz: QuizWithStatus; 
  variant: "completed" | "expired" | "active";
  getScoreColor: (s: number) => string;
  getScoreIcon: (s: number) => React.ReactNode;
  getScoreLabel: (s: number) => string;
  onAskReset: (title: string) => void;
}) {
  const score = quiz.result?.score || 0;
  const questionsList = Array.isArray(quiz.questions) ? quiz.questions : [];

  const accentColor = variant === "completed" 
    ? "from-emerald-500 to-teal-500"
    : variant === "expired"
      ? "from-slate-400 to-slate-500"
      : "from-indigo-500 to-violet-500";

  const iconBg = variant === "completed"
    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
    : variant === "expired"
      ? "bg-slate-100 text-slate-500 border-slate-200"
      : "bg-slate-50 text-slate-500 border-slate-100";

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col overflow-hidden group">
      <div className={`h-1.5 w-full bg-gradient-to-r ${accentColor}`} />

      <div className="p-5 sm:p-6 flex-1 flex flex-col">
        {/* Top Row: Icon & Status */}
        <div className="flex justify-between items-start mb-5">
          <div className={`p-2.5 rounded-xl border transition-colors duration-300 ${iconBg}`}>
            {variant === "completed" ? <CheckCircle2 size={20} /> : variant === "expired" ? <Lock size={20} /> : <FileText size={20} />}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {variant === "completed" && (
              <span className={`text-[11px] font-bold px-3 py-1 rounded-lg border flex items-center gap-1.5 ${getScoreColor(score)}`}>
                {getScoreIcon(score)} {score.toFixed(0)}% — {getScoreLabel(score)}
              </span>
            )}
            {variant === "expired" && (
              <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                <AlertTriangle size={12} /> Deadline Passed
              </span>
            )}
            {variant === "active" && (
              <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1.5">
                <PlayCircle size={12} /> Active
              </span>
            )}
          </div>
        </div>

        {/* Title & Metadata */}
        <h3 className="text-lg font-bold text-slate-900 mb-3 leading-snug line-clamp-2 min-h-[48px] group-hover:text-indigo-600 transition-colors">
          {quiz.title}
        </h3>

        <div className="space-y-2.5 mb-5 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <BookOpen size={15} className="text-slate-400 flex-shrink-0" />
            <span className="font-medium">{quiz.subject.name}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <GraduationCap size={15} className="text-slate-400 flex-shrink-0" />
            <span className="font-medium">Grade {quiz.grade.level}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock size={15} className="text-slate-400 flex-shrink-0" />
              <span className="font-medium">{questionsList?.length || 0} Qs</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Calendar size={13} className="text-slate-300 flex-shrink-0" />
              <span>{new Date(quiz.result?.createdAt || quiz.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {quiz.dueDate && (
            <div className="flex items-center gap-2 text-xs">
              <Calendar size={13} className={`flex-shrink-0 ${variant === "expired" ? "text-red-400" : "text-amber-400"}`} />
              <span className={`font-medium ${variant === "expired" ? "text-red-500" : "text-amber-600"}`}>
                Due: {new Date(quiz.dueDate).toLocaleDateString()}
                {variant === "expired" && " (Expired)"}
              </span>
            </div>
          )}
        </div>

        {/* Score Progress Bar (for completed) */}
        {variant === "completed" && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-500">Score</span>
              <span className={`font-bold ${
                score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600"
              }`}>
                {score.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  score >= 80
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                    : score >= 60
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : "bg-gradient-to-r from-red-400 to-rose-500"
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto" />

        {/* Footer Actions */}
        <div className="pt-5 mt-2 border-t border-slate-100 flex gap-2">
          {variant === "active" && (
            <Link
              href={`/dashboard/quizzes/solve/${quiz.id}`}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98]"
            >
              <PlayCircle size={16} /> Start Assessment
            </Link>
          )}

          {variant === "completed" && (
            <>
              <button
                disabled
                className="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-default border border-emerald-100"
              >
                <CheckCircle2 size={16} /> Completed — {score.toFixed(0)}%
              </button>
              <Link
                href={`/dashboard/quizzes/solve/${quiz.id}`}
                className="px-4 py-3 bg-slate-50 text-slate-600 rounded-xl font-semibold text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center border border-slate-100 hover:border-indigo-100"
                title="Review Quiz"
              >
                <PlayCircle size={16} />
              </Link>
            </>
          )}

          {variant === "expired" && (
            <>
              <button
                onClick={() => onAskReset(quiz.title)}
                className="flex-1 bg-amber-50 text-amber-700 py-3 rounded-xl font-semibold text-sm hover:bg-amber-100 transition-all flex items-center justify-center gap-2 border border-amber-200 hover:border-amber-300"
              >
                <MessageCircle size={16} /> Ask Teacher to Reset
              </button>
              <Link
                href={`/dashboard/quizzes/solve/${quiz.id}`}
                className="px-4 py-3 bg-slate-50 text-slate-400 rounded-xl font-semibold text-sm flex items-center justify-center border border-slate-100 cursor-not-allowed"
                title="Quiz Expired"
                onClick={(e) => e.preventDefault()}
              >
                <Lock size={16} />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}