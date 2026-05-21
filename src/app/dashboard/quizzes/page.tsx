// src/app/dashboard/quizzes/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import QuizManager from "@/components/QuizManager";
import {
  FileText, Calendar, Clock, Edit, PlayCircle, CheckCircle2,
  GraduationCap, Filter, BookOpen, Eye, Trash2, Upload, Download,
} from "lucide-react";
import Link from "next/link";
import QuizFilters from "./QuizFilters";
import QuizActions from "./QuizActions";
import CsvImportButton from "./CsvImportButton";

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

    /* NEW: direct relation filtering — fast & simple */
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

  /* Outcomes shown in dropdown = filtered by current subject + grade */
  const filteredOutcomes = allOutcomes.filter((o) => {
    if (filterSubject && o.subject !== filterSubject) return false;
    if (filterGrade && o.grade !== filterGrade) return false;
    return true;
  });

  /* Indicators shown in dropdown */
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
    <div className="mx-auto max-w-7xl space-y-6">
      {(userRole === "ADMIN" || userRole === "TEACHER") && <QuizManager />}

      <div className="border-t border-slate-200 pt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-indigo-600" size={22} />
            {userRole === "STUDENT" ? "Available Assessments" : "All Assessments"}
          </h2>

          <div className="flex gap-3 flex-wrap items-center">
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
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
              {totalCount} total
            </span>
          </div>
        </div>

        {/* Quiz Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quizzes.map((quiz) => {
            const isCompleted = completedQuizIds.has(quiz.id);
            const result = studentResults[quiz.id];
            const questionsList = Array.isArray(quiz.questions)
              ? quiz.questions
              : [];

            if (userRole === "STUDENT" && isCompleted) return null;

            return (
              <div
                key={quiz.id}
                className="bg-white p-5 rounded-2xl shadow-sm border transition-all group flex flex-col justify-between relative overflow-hidden border-slate-100 hover:shadow-lg hover:border-indigo-100"
              >
                <div
                  className={`absolute top-0 left-0 w-full h-1 ${
                    quiz.isPublished ? "bg-indigo-500" : "bg-amber-400"
                  }`}
                />
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-indigo-50 text-indigo-600"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <FileText size={20} />
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isCompleted && (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Done{" "}
                          {result.score.toFixed(0)}%
                        </span>
                      )}
                      {!isCompleted && (
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                            quiz.isPublished
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {quiz.isPublished ? "Active" : "Draft"}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
                    {quiz.title}
                  </h3>

                  <div className="space-y-1.5 mb-4">
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <BookOpen size={14} className="text-slate-400" />
                      <span className="font-semibold text-slate-700">
                        Subject:
                      </span>{" "}
                      {quiz.subject.name}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-slate-400" />
                      <span className="font-semibold text-slate-700">
                        Grade:
                      </span>{" "}
                      {quiz.grade.level}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />{" "}
                      {questionsList?.length || 0} Questions
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      <span>
                        Created: {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex gap-2">
                  {userRole === "STUDENT" ? (
                    <Link
                      href={`/dashboard/quizzes/solve/${quiz.id}`}
                      className="flex-[2] bg-indigo-600 text-white text-center py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-indigo-200"
                    >
                      <PlayCircle size={16} /> Start Quiz
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/dashboard/quizzes/solve/${quiz.id}`}
                        className="flex-1 bg-slate-50 text-slate-600 text-center py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center gap-1.5"
                        title="Preview Quiz"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        href={`/dashboard/quizzes/edit/${quiz.id}`}
                        className="flex-1 bg-slate-50 text-slate-400 text-center py-2.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center"
                        title="Edit Quiz"
                      >
                        <Edit size={18} />
                      </Link>
                      <QuizActions
                        quizId={quiz.id}
                        isPublished={quiz.isPublished}
                        title={quiz.title}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {quizzes.length === 0 && (
            <div className="col-span-full py-16 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <FileText size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-400 font-medium text-sm">
                {userRole === "STUDENT"
                  ? "No assessments available for your grade level right now."
                  : userRole === "TEACHER"
                  ? "No quizzes found for your assigned subjects/grades."
                  : "No quizzes found."}
              </p>
              {userRole !== "STUDENT" && (
                <p className="text-slate-400 text-xs mt-1">
                  Start by using the creator above!
                </p>
              )}
            </div>
          )}
        </div>

        {/* ─── Pagination Navigator ─── */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            {safePage > 1 ? (
              <Link
                href={buildPageLink(safePage - 1)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
              >
                Previous
              </Link>
            ) : (
              <span className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 text-sm font-semibold cursor-not-allowed">
                Previous
              </span>
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => (
                <Link
                  key={pageNum}
                  href={buildPageLink(pageNum)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                    pageNum === safePage
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                  }`}
                >
                  {pageNum}
                </Link>
              )
            )}

            {safePage < totalPages ? (
              <Link
                href={buildPageLink(safePage + 1)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
              >
                Next
              </Link>
            ) : (
              <span className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 text-sm font-semibold cursor-not-allowed">
                Next
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}