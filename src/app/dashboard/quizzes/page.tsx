// src/app/dashboard/quizzes/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import QuizManager from "@/components/QuizManager";
import {
  FileText, Calendar, Clock, Edit, PlayCircle, CheckCircle2,
  GraduationCap, Filter, BookOpen, Eye, Trash2, Upload, Download,
  Sparkles, Search, LayoutGrid, List
} from "lucide-react";
import Link from "next/link";
import QuizFilters from "./QuizFilters";
import QuizActions from "./QuizActions";
import CsvImportButton from "./CsvImportButton";
import QuizManager2 from "@/components/QuizManager";

export const dynamic = "force-dynamic";

export default async function QuizzesPage({
  searchParams,
}: {
  searchParams: Promise<{
    subject?: string;
    grade?: string;
    outcome?: string;
    indicator?: string;
    page?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userRole = (session.user as any)?.role;
  const userId = (session.user as any)?.id;
  if (!userId) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { grade: true },
  });
  if (!currentUser) redirect("/login");

  const params = await searchParams;
  const filterSubject = params.subject;
  const filterGrade = params.grade ? parseInt(params.grade) : null;
  const filterOutcome = params.outcome;
  const filterIndicator = params.indicator;
  const currentPage = Math.max(1, parseInt(params.page || "1"));
  const ITEMS_PER_PAGE = 15;

  const whereClause: any = {};

  /* ─── Role guards ─── */
  if (userRole === "STUDENT" && currentUser?.grade) {
    whereClause.isPublished = true;
    whereClause.gradeId = currentUser.grade.id;
  }

  if (userRole === "TEACHER") {
    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: userId },
      include: { subject: true, grade: true },
    });

    if (assignments.length === 0) {
      whereClause.id = "none";
    } else {
      whereClause.OR = assignments.map((a) => ({
        subjectId: a.subjectId,
        gradeId: a.gradeId,
      }));

      if (filterSubject) {
        const allowedSubjectIds = assignments
          .filter((a) => a.subject.name === filterSubject)
          .map((a) => a.subjectId);
        if (allowedSubjectIds.length === 0) whereClause.id = "none";
        else whereClause.subjectId = { in: allowedSubjectIds };
      }
      if (filterGrade) {
        const allowedGradeIds = assignments
          .filter((a) => a.grade.level === filterGrade)
          .map((a) => a.gradeId);
        if (allowedGradeIds.length === 0) whereClause.id = "none";
        else whereClause.gradeId = { in: allowedGradeIds };
      }
    }
  }

  /* ─── Filters (non-teacher or teacher with valid scope) ─── */
  if (userRole !== "TEACHER" || !whereClause.id) {
    if (filterSubject) whereClause.subject = { name: filterSubject };
    if (filterGrade) whereClause.grade = { level: filterGrade };

    if (filterOutcome || filterIndicator) {
      whereClause.outcomeId = filterOutcome || filterIndicator;
    }
  }

  const quizWhere =
    Object.keys(whereClause).length > 0 ? whereClause : undefined;

  /* ─── Pagination ─── */
  const totalCount = await prisma.quiz.count({ where: quizWhere });
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const skip = (safePage - 1) * ITEMS_PER_PAGE;

  const quizzes = await prisma.quiz.findMany({
    where: quizWhere,
    include: {
      subject: true,
      grade: true,
      questions: true,
      results: userRole === "STUDENT" ? { where: { studentId: userId } } : true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: ITEMS_PER_PAGE,
  });

  /* ─── Dropdown data ─── */
  let allSubjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
  let allGrades = await prisma.grade.findMany({ orderBy: { level: "asc" } });

  if (userRole === "TEACHER") {
    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: userId },
      include: { subject: true, grade: true },
    });
    const allowedSubjectIds = [
      ...new Set(assignments.map((a) => a.subjectId)),
    ];
    const allowedGradeIds = [...new Set(assignments.map((a) => a.gradeId))];
    allSubjects = allSubjects.filter((s) => allowedSubjectIds.includes(s.id));
    allGrades = allGrades.filter((g) => allowedGradeIds.includes(g.id));
  }

  const allQuizzesForGrades = await prisma.quiz.findMany({
    select: { grade: { select: { level: true } } },
  });
  const quizGradeLevels = [
    ...new Set(allQuizzesForGrades.map((q) => q.grade.level)),
  ].sort((a, b) => a - b);

  const allOutcomes = await prisma.learningOutcome.findMany({
    select: {
      id: true,
      outcomeText: true,
      grade: true,
      subject: true,
      indicatorText: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const filteredOutcomes = allOutcomes.filter((o) => {
    if (filterSubject && o.subject !== filterSubject) return false;
    if (filterGrade && o.grade !== filterGrade) return false;
    return true;
  });

  let filteredIndicators: { id: string; indicatorText: string }[] = [];
  if (filterOutcome) {
    const outcomeData = await prisma.learningOutcome.findUnique({
      where: { id: filterOutcome },
      select: { id: true, indicatorText: true },
    });
    if (outcomeData) filteredIndicators = [outcomeData];
  } else {
    filteredIndicators = filteredOutcomes.map((o) => ({
      id: o.id,
      indicatorText: o.indicatorText,
    }));
  }

  /* ─── Student completion tracking ─── */
  let studentResults: Record<string, any> = {};
  let completedQuizIds: Set<string> = new Set();
  if (userRole === "STUDENT") {
    const results = await prisma.result.findMany({
      where: { studentId: userId },
      include: { quiz: true },
    });
    results.forEach((r) => {
      studentResults[r.quizId] = r;
      completedQuizIds.add(r.quizId);
    });
  }

  /* ─── Pagination link builder ─── */
  const buildPageLink = (pageNum: number) => {
    const query = new URLSearchParams();
    if (filterSubject) query.set("subject", filterSubject);
    if (filterGrade) query.set("grade", filterGrade.toString());
    if (filterOutcome) query.set("outcome", filterOutcome);
    if (filterIndicator) query.set("indicator", filterIndicator);
    query.set("page", pageNum.toString());
    return `/dashboard/quizzes?${query.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {(userRole === "ADMIN" || userRole === "TEACHER") && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 lg:p-8">
          {/* <QuizManager /> */}
          <QuizManager2 />
        </div>
      )}

      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50">
                <LayoutGrid size={22} />
              </div>
              {userRole === "STUDENT" ? "Available Assessments" : "Assessment Library"}
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm ml-[46px]">
              Browse, filter, and manage your NAFS preparation materials
            </p>
          </div>

          <div className="flex gap-3 flex-wrap items-center w-full md:w-auto">
            {userRole !== "STUDENT" && (
              <>
                <QuizFilters
                  subjects={allSubjects}
                  grades={quizGradeLevels}
                  outcomes={filteredOutcomes}
                  indicators={filteredIndicators}
                  defaultSubject={filterSubject}
                  defaultGrade={filterGrade}
                  defaultOutcome={filterOutcome}
                  defaultIndicator={filterIndicator}
                />
                <CsvImportButton />
              </>
            )}
            <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 flex items-center gap-2 ml-auto md:ml-0">
              <FileText size={15} className="text-slate-400" />
              {totalCount} <span className="text-slate-400 font-medium hidden sm:inline">total</span>
            </div>
          </div>
        </div>

        {/* Quiz Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {quizzes.map((quiz) => {
            const isCompleted = completedQuizIds.has(quiz.id);
            const result = studentResults[quiz.id];
            const questionsList = Array.isArray(quiz.questions) ? quiz.questions : [];

            if (userRole === "STUDENT" && isCompleted) return null;

            return (
              <div
                key={quiz.id}
                className="relative bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col overflow-hidden group"
              >
                {/* Top Accent Bar */}
                <div className={`h-1.5 w-full ${quiz.isPublished ? "bg-gradient-to-r from-indigo-500 to-violet-500" : "bg-gradient-to-r from-amber-400 to-orange-400"}`} />

                <div className="p-5 sm:p-6 flex-1 flex flex-col">
                  {/* Top Row: Icon & Status */}
                  <div className="flex justify-between items-start mb-5">
                    <div className={`p-2.5 rounded-xl transition-colors duration-300 ${
                      isCompleted 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-slate-50 text-slate-500 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100"
                    }`}>
                      {isCompleted ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5">
                      {isCompleted && (
                        <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1.5">
                          <CheckCircle2 size={12} /> Scored {result.score.toFixed(0)}%
                        </span>
                      )}
                      {!isCompleted && (
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-lg ${
                          quiz.isPublished 
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          {quiz.isPublished ? "Active" : "Draft"}
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
                        <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Spacer to push footer down */}
                  <div className="mt-auto" />

                  {/* Footer Actions */}
                  <div className="pt-5 mt-2 border-t border-slate-100">
                    {userRole === "STUDENT" ? (
                      <Link
                        href={`/dashboard/quizzes/solve/${quiz.id}`}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98]"
                      >
                        <PlayCircle size={18} /> Start Assessment
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/quizzes/solve/${quiz.id}`}
                          className="flex-1 bg-slate-50 text-slate-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center gap-1.5 border border-slate-100 hover:border-indigo-100"
                          title="Preview Quiz"
                        >
                          <Eye size={16} /> Preview
                        </Link>
                        <Link
                          href={`/dashboard/quizzes/edit/${quiz.id}`}
                          className="flex-1 bg-slate-50 text-slate-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center gap-1.5 border border-slate-100 hover:border-indigo-100"
                          title="Edit Quiz"
                        >
                          <Edit size={16} /> Edit
                        </Link>
                        <div className="border-l border-slate-100 h-8 mx-1" />
                        <QuizActions
                          quizId={quiz.id}
                          isPublished={quiz.isPublished}
                          title={quiz.title}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {quizzes.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <div className="inline-flex p-5 bg-slate-50 rounded-2xl border border-slate-100 mb-5">
                <Search size={32} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Assessments Found</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                {userRole === "STUDENT"
                  ? "There are no assessments available for your grade level right now. Check back later!"
                  : userRole === "TEACHER"
                  ? "No quizzes match your assigned subjects/grades or current filters."
                  : "No quizzes match your current filters or database is empty."}
              </p>
              {userRole !== "STUDENT" && (
                <p className="text-slate-400 text-xs mt-3 flex items-center justify-center gap-1.5">
                  <Sparkles size={14} /> Start by using the creator above to generate content
                </p>
              )}
            </div>
          )}
        </div>

        {/* ─── Pagination Navigator ─── */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-6 pb-2">
            {safePage > 1 ? (
              <Link
                href={buildPageLink(safePage - 1)}
                className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all shadow-sm"
              >
                Previous
              </Link>
            ) : (
              <span className="px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-300 text-sm font-semibold cursor-not-allowed">
                Previous
              </span>
            )}

            <div className="hidden sm:flex items-center gap-1.5 mx-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <Link
                    key={pageNum}
                    href={buildPageLink(pageNum)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                      pageNum === safePage
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 shadow-sm"
                    }`}
                  >
                    {pageNum}
                  </Link>
                )
              )}
            </div>
            
            {/* Mobile page indicator */}
            <span className="sm:hidden text-sm font-medium text-slate-600">
              Page {safePage} of {totalPages}
            </span>

            {safePage < totalPages ? (
              <Link
                href={buildPageLink(safePage + 1)}
                className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all shadow-sm"
              >
                Next
              </Link>
            ) : (
              <span className="px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-300 text-sm font-semibold cursor-not-allowed">
                Next
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}