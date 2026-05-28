"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, ArrowLeft, CheckCircle2, XCircle, RefreshCcw,
  Trophy, BookOpen, GraduationCap, Clock, Calendar,
  FileText, AlertCircle, PlayCircle, LayoutGrid
} from "lucide-react";

interface CompletedQuiz {
  id: string;
  title: string;
  subject: { name: string };
  grade: { level: number };
  questions: any[];
  createdAt: string;
  isPublished: boolean;
  result: {
    id: string;
    score: number;
    totalPoints: number;
    createdAt: string;
    attemptNumber: number;
  } | null;
  attemptsUsed: number;
}

const MAX_ATTEMPTS = 3;

export default function CompletedQuizzesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  const [quizzes, setQuizzes] = useState<CompletedQuiz[]>([]);
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

    const fetchCompletedQuizzes = async () => {
      try {
        const res = await fetch(`/api/students/completed-quizzes?studentId=${userId}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch completed quizzes");
        }
        const data = await res.json();
        setQuizzes(data.quizzes || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedQuizzes();
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

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium">Loading your completed assessments...</p>
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

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50">
              <CheckCircle2 size={22} />
            </div>
            Completed Assessments
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm ml-[46px]">
            Review your past attempts and retake quizzes to improve your scores
          </p>
        </div>

        <Link
          href="/dashboard/quizzes"
          className="flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
        >
          <ArrowLeft size={16} /> Back to Available Quizzes
        </Link>
      </div>

      {/* Stats Summary */}
      {quizzes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{quizzes.length}</p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Quizzes Taken</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {Math.round(quizzes.reduce((acc, q) => acc + (q.result?.score || 0), 0) / quizzes.length)}%
              </p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Average Score</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <RefreshCcw size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {quizzes.filter((q) => (q.attemptsUsed || 0) < MAX_ATTEMPTS).length}
              </p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Retakes Available</p>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
        {quizzes.map((quiz) => {
          const score = quiz.result?.score || 0;
          const attemptsUsed = quiz.attemptsUsed || 1;
          const attemptsLeft = MAX_ATTEMPTS - attemptsUsed;
          const canRetake = attemptsLeft > 0;
          const questionsList = Array.isArray(quiz.questions) ? quiz.questions : [];

          return (
            <div
              key={quiz.id}
              className="relative bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col overflow-hidden group"
            >
              {/* Top Accent Bar - color based on score */}
              <div className={`h-1.5 w-full ${
                score >= 80
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : score >= 60
                  ? "bg-gradient-to-r from-amber-400 to-orange-400"
                  : "bg-gradient-to-r from-red-400 to-rose-500"
              }`} />

              <div className="p-5 sm:p-6 flex-1 flex flex-col">
                {/* Top Row: Score Badge & Status */}
                <div className="flex justify-between items-start mb-5">
                  <div className={`p-2.5 rounded-xl border transition-colors duration-300 ${getScoreColor(score)}`}>
                    {getScoreIcon(score)}
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {/* Score Percentage Badge */}
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-lg border flex items-center gap-1.5 ${getScoreColor(score)}`}>
                      {getScoreIcon(score)} {score.toFixed(0)}% — {getScoreLabel(score)}
                    </span>
                    {/* Attempts Badge */}
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-lg border ${
                      canRetake
                        ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {attemptsUsed}/{MAX_ATTEMPTS} Attempts Used
                    </span>
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
                </div>

                {/* Score Progress Bar */}
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

                {/* Spacer to push footer down */}
                <div className="mt-auto" />

                {/* Footer Actions */}
                <div className="pt-5 mt-2 border-t border-slate-100 flex gap-2">
                  {canRetake ? (
                    <Link
                      href={`/dashboard/quizzes/solve/${quiz.id}`}
                      className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98]"
                    >
                      <RefreshCcw size={16} /> Retake ({attemptsLeft} left)
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="flex-1 bg-slate-100 text-slate-400 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <CheckCircle2 size={16} /> Max Attempts Reached
                    </button>
                  )}

                  <Link
                    href={`/dashboard/quizzes/solve/${quiz.id}`}
                    className="px-4 py-3 bg-slate-50 text-slate-600 rounded-xl font-semibold text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center border border-slate-100 hover:border-indigo-100"
                    title="Review Quiz"
                  >
                    <PlayCircle size={16} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {quizzes.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="inline-flex p-5 bg-slate-50 rounded-2xl border border-slate-100 mb-5">
              <LayoutGrid size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Completed Quizzes Yet</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              You haven&apos;t taken any quizzes yet. Head over to the available quizzes to start your first assessment!
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
    </div>
  );
}