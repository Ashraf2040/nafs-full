// src/app/preparation/[subject]/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  PlayCircle,
  ChevronRight,
  GraduationCap,
  CheckCircle2,
  Lock,
  AlertCircle,
} from "lucide-react";
import { notFound } from "next/navigation";

export const revalidate = 600;

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;

  const subjectName =
    resolvedParams.subject.charAt(0).toUpperCase() +
    resolvedParams.subject.slice(1);

  // ✅ FIXED QUERY (added _count.questions instead of quiz.questions)
  const subjectData = await prisma.subject.findUnique({
    where: { name: subjectName },
    include: {
      quizzes: {
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              questions: true,
            },
          },
        },
      },
    },
  });

  if (!subjectData) {
    return notFound();
  }

  let completedQuizIds: Set<string> = new Set();
  let overdueQuizIds: Set<string> = new Set();
  const now = new Date();

  if (session?.user) {
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole === "STUDENT") {
      const results = await prisma.result.findMany({
        where: { studentId: userId },
        select: { quizId: true },
      });

      completedQuizIds = new Set(results.map((r) => r.quizId));

      subjectData.quizzes.forEach((quiz) => {
        if (
          quiz.dueDate &&
          new Date(quiz.dueDate) < now &&
          !completedQuizIds.has(quiz.id)
        ) {
          overdueQuizIds.add(quiz.id);
        }
      });
    }
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto py-12 px-6 lg:px-12 space-y-10">
      {/* HEADER */}
      <header
        className={`rounded-[2.5rem] bg-gradient-to-br ${
          subjectData.colorCode || "from-indigo-600 to-purple-700"
        } p-10 lg:p-12 text-white shadow-xl relative overflow-hidden`}
      >
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 p-8 opacity-10 pointer-events-none">
          <BookOpen size={240} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
            <nav className="flex items-center gap-2 text-white/70 text-sm font-bold uppercase tracking-widest">
              <Link href="/" className="hover:text-white transition-colors">
                Portal
              </Link>
              <ChevronRight size={14} />
              <span>Preparation</span>
            </nav>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight">
              {subjectData.name}
            </h1>

            <p className="text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed">
              {subjectData.description ||
                `Master your ${subjectData.name} skills with our AI-powered NAFS practice assessments.`}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-3xl text-center min-w-[140px]">
            <p className="text-4xl font-black">{subjectData.quizzes.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">
              Active Quizzes
            </p>
          </div>
        </div>
      </header>

      {/* QUIZZES */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            Practice Exams
          </h2>
          <div className="h-[2px] flex-grow mx-6 bg-slate-100 rounded-full hidden md:block" />
        </div>

        {subjectData.quizzes.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-16 text-center border-2 border-dashed border-slate-200">
            <BookOpen size={32} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg font-medium">
              New assessments are being prepared. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {subjectData.quizzes.map((quiz) => {
              const isCompleted = completedQuizIds.has(quiz.id);
              const isOverdue = overdueQuizIds.has(quiz.id);

              return (
                <div
                  key={quiz.id}
                  className={`bg-white rounded-[1.5rem] p-6 border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full ${
                    isCompleted
                      ? "border-emerald-200"
                      : isOverdue
                      ? "border-red-200"
                      : "border-slate-100"
                  }`}
                >
                  <div className="flex-grow space-y-3">
                    <div className="flex justify-between items-start mb-2">
                      <div
                        className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-indigo-50 text-indigo-600"
                        }`}
                      >
                        {isCompleted ? "Completed" : "Assessment"}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                        <Clock size={14} />
                        {new Date(quiz.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-800">
                      {quiz.title}
                    </h3>

                    <p className="text-slate-500 text-sm">
                      {quiz.description || "Practice assessment"}
                    </p>

                    {isOverdue && (
                      <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded-md">
                        <AlertCircle size={12} /> Due date passed
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-50">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
                        <GraduationCap size={14} />
                        Grade {quiz.gradeId}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
                        <BookOpen size={14} />
                        {quiz._count?.questions || 0} Questions
                      </div>
                    </div>

                    {isCompleted ? (
                      <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Done
                      </div>
                    ) : isOverdue ? (
                      <button
                        disabled
                        className="bg-slate-100 text-slate-400 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed"
                      >
                        <Lock size={14} /> Ask Teacher
                      </button>
                    ) : (
                      <Link
                        href={`/dashboard/quizzes/solve/${quiz.id}`}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold"
                      >
                        Start <PlayCircle size={16} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}