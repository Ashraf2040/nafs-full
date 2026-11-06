import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  FileText, Calendar, Clock, Edit, PlayCircle, CheckCircle2,
  GraduationCap, BookOpen, Eye, Sparkles, Search, History, ArrowRight,
  Lock, AlertTriangle, Mail, ChevronLeft, ChevronRight
} from "lucide-react";
import QuizActions from "./QuizActions";

const ITEMS_PER_PAGE = 15;

interface QuizGridSectionProps {
  assessmentType?: "PRACTICE" | "QUIZ";
  userRole: string;
  userId: string;
  filterSubject?: string;
  filterGrade?: number | null;
  filterOutcome?: string;
  filterIndicator?: string;
  currentPage: number;
}

export default async function QuizGridSection({
  userRole,
  userId,
  filterSubject,
  filterGrade,
  filterOutcome,
  filterIndicator,
  currentPage,
  assessmentType = "PRACTICE",
}: QuizGridSectionProps) {
  const whereClause: any = { assessmentType };

  if (userRole === "STUDENT") {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { grade: { select: { id: true } } },
    });
    if (currentUser?.grade) {
      // Students see published quizzes for their grade
      whereClause.isPublished = true;
      whereClause.gradeId = currentUser.grade.id;
    }
  }

  let teacherAssignments: any[] | null = null;
  if (userRole === "TEACHER") {
    teacherAssignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: userId },
      include: { subject: true, grade: true },
    });

    if (teacherAssignments.length === 0) {
      whereClause.id = "none";
    } else {
      whereClause.OR = teacherAssignments.map((a) => ({
        subjectId: a.subjectId,
        gradeId: a.gradeId,
      }));

      if (filterSubject) {
        const allowedSubjectIds = teacherAssignments
          .filter((a) => a.subject.name === filterSubject)
          .map((a) => a.subjectId);
        if (allowedSubjectIds.length === 0) whereClause.id = "none";
        else whereClause.subjectId = { in: allowedSubjectIds };
      }
      if (filterGrade) {
        const allowedGradeIds = teacherAssignments
          .filter((a) => a.grade.level === filterGrade)
          .map((a) => a.gradeId);
        if (allowedGradeIds.length === 0) whereClause.id = "none";
        else whereClause.gradeId = { in: allowedGradeIds };
      }
    }
  }

  if (userRole !== "TEACHER" || !whereClause.id) {
    if (filterSubject) whereClause.subject = { name: filterSubject };
    if (filterGrade) whereClause.grade = { level: filterGrade };
  }

  let learningOutcomeIds: string[] = [];
  if (filterIndicator) {
    // An indicator maps to exactly one LearningOutcome row.
    learningOutcomeIds = [filterIndicator];
  } else if (filterOutcome) {
    // Outcomes are stored as one row per indicator. Selecting an outcome must
    // therefore match every row that shares its subject, grade, and text.
    const selectedOutcome = await prisma.learningOutcome.findUnique({
      where: { id: filterOutcome },
      select: { subject: true, grade: true, outcomeText: true },
    });

    if (selectedOutcome) {
      const matchingOutcomes = await prisma.learningOutcome.findMany({
        where: {
          subject: selectedOutcome.subject,
          grade: selectedOutcome.grade,
          outcomeText: selectedOutcome.outcomeText,
        },
        select: { id: true },
      });
      learningOutcomeIds = matchingOutcomes.map((outcome) => outcome.id);
    }
  }

  if (filterOutcome || filterIndicator) {
    const outcomeCondition = {
      OR: [
        { outcomeId: { in: learningOutcomeIds } },
        {
          questions: {
            some: { learningOutcomeId: { in: learningOutcomeIds } },
          },
        },
      ],
    };
    if (whereClause.OR) {
      const existingOR = whereClause.OR;
      delete whereClause.OR;
      whereClause.AND = [{ OR: existingOR }, outcomeCondition];
    } else {
      whereClause.AND = [outcomeCondition];
    }
  }

  const quizWhere =
    Object.keys(whereClause).length > 0 ? whereClause : undefined;

  const [totalCount, studentResultsData, practiceCompletionData] = await Promise.all([
    prisma.quiz.count({ where: quizWhere }),
    userRole === "STUDENT" && assessmentType === "QUIZ"
      ? prisma.result.findMany({
          where: { studentId: userId, quiz: { assessmentType: "QUIZ" } },
          select: { id: true, quizId: true, score: true },
        })
      : Promise.resolve([]),
    userRole === "STUDENT" && assessmentType === "PRACTICE"
      ? prisma.practiceCompletion.findMany({ where: { studentId: userId }, select: { quizId: true } })
      : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const pageSkip = (safePage - 1) * ITEMS_PER_PAGE;
  const quizzes = await prisma.quiz.findMany({
    where: quizWhere,
    include: {
      subject: true,
      grade: true,
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: pageSkip,
    take: ITEMS_PER_PAGE,
  });

  let studentResults: Record<string, any> = {};
  let completedQuizIds: Set<string> = new Set();
  if (userRole === "STUDENT") {
    studentResultsData.forEach((r) => {
      studentResults[r.quizId] = r;
      completedQuizIds.add(r.quizId);
    });
    practiceCompletionData.forEach((completion) => completedQuizIds.add(completion.quizId));
  }
  const completedCount = completedQuizIds.size;

  // Check if quiz is expired (past due date)
  const isExpired = (quiz: any) => {
    if (!quiz.dueDate) return false;
    return new Date(quiz.dueDate) < new Date();
  };

  const buildPageLink = (pageNum: number) => {
    const query = new URLSearchParams();
    if (filterSubject) query.set("subject", filterSubject);
    if (filterGrade) query.set("grade", filterGrade.toString());
    if (filterOutcome) query.set("outcome", filterOutcome);
    if (filterIndicator) query.set("indicator", filterIndicator);
    query.set("page", pageNum.toString());
    const basePath = assessmentType === "PRACTICE" ? "/dashboard/practices" : "/dashboard/quizzes";
    return `${basePath}?${query.toString()}`;
  };

  const pagePoints = [...new Set([1, safePage - 1, safePage, safePage + 1, totalPages])]
    .filter((pageNum) => pageNum >= 1 && pageNum <= totalPages)
    .sort((a, b) => a - b);
  const paginationItems: Array<number | null> = [];
  pagePoints.forEach((pageNum, index) => {
    if (index > 0) {
      const gap = pageNum - pagePoints[index - 1];
      if (gap === 2) paginationItems.push(pageNum - 1);
      else if (gap > 2) paginationItems.push(null);
    }
    paginationItems.push(pageNum);
  });

  return (
    <>
      {/* Info bar: completed link (student) + total count */}
      <div className="flex items-center gap-3 justify-end flex-wrap">
        {userRole === "STUDENT" && assessmentType === "QUIZ" && completedCount > 0 && (
          <Link
            href="/dashboard/quizzes/completed"
            className="flex items-center gap-2 bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
          >
            <History size={16} />
            Completed Quizzes
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {completedCount}
            </span>
            <ArrowRight size={14} className="ml-0.5" />
          </Link>
        )}
        <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 flex items-center gap-2">
          <FileText size={15} className="text-slate-400" />
          {totalCount}{" "}
          <span className="text-slate-400 font-medium hidden sm:inline">
            total
          </span>
        </div>
      </div>

      {/* Quiz Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
        {quizzes.map((quiz) => {
          const isCompleted = completedQuizIds.has(quiz.id);
          const result = studentResults[quiz.id];
          const expired = isExpired(quiz);
          const isDisabled = userRole === "STUDENT" && (isCompleted || expired);

          return (
            <div
              key={quiz.id}
              className={`relative bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden group ${
                isDisabled 
                  ? "opacity-75" 
                  : "hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
              }`}
            >
              <div
                className={`h-1.5 w-full ${
                  isCompleted 
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                    : expired 
                      ? "bg-gradient-to-r from-slate-400 to-slate-500"
                      : quiz.isPublished 
                        ? "bg-gradient-to-r from-indigo-500 to-violet-500" 
                        : "bg-gradient-to-r from-amber-400 to-orange-400"
                }`}
              />

              <div className="p-5 sm:p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-5">
                  <div
                    className={`p-2.5 rounded-xl transition-colors duration-300 ${
                      isCompleted 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : expired
                          ? "bg-slate-100 text-slate-500 border border-slate-200"
                          : "bg-slate-50 text-slate-500 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={20} /> : expired ? <Lock size={20} /> : <FileText size={20} />}
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {isCompleted && (
                      <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1.5">
                        <CheckCircle2 size={12} /> {assessmentType === "PRACTICE" ? "Completed" : `Scored ${result.score.toFixed(0)}%`}
                      </span>
                    )}
                    {expired && !isCompleted && (
                      <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                        <AlertTriangle size={12} /> Expired
                      </span>
                    )}
                    {!isCompleted && !expired && (
                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-lg ${
                          quiz.isPublished 
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}
                      >
                        {quiz.isPublished ? "Active" : "Draft"}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className={`text-lg font-bold mb-3 leading-snug line-clamp-2 min-h-[48px] ${
                  isDisabled ? "text-slate-500" : "text-slate-900 group-hover:text-indigo-600 transition-colors"
                }`}>
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
                      <span className="font-medium">{quiz._count?.questions ?? 0} Qs</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <Calendar size={13} className="text-slate-300 flex-shrink-0" />
                      <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {quiz.dueDate && (
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar size={13} className={`flex-shrink-0 ${expired ? "text-red-400" : "text-amber-400"}`} />
                      <span className={`font-medium ${expired ? "text-red-500" : "text-amber-600"}`}>
                        Due: {new Date(quiz.dueDate).toLocaleDateString()}
                        {expired && " (Expired)"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-auto" />

                <div className="pt-5 mt-2 border-t border-slate-100">
                  {userRole === "STUDENT" ? (
                    isCompleted ? (
                      <button
                        disabled
                        className="w-full bg-emerald-50 text-emerald-600 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-default border border-emerald-100"
                      >
                        <CheckCircle2 size={18} /> {assessmentType === "PRACTICE" ? "Completed" : `Completed — ${result.score.toFixed(0)}%`}
                      </button>
                    ) : expired ? (
                      <button
                        disabled
                        className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                      >
                        <Lock size={18} /> Deadline Passed
                      </button>
                    ) : (
                      <Link
                        href={assessmentType === "PRACTICE" ? `/dashboard/practices/solve/${quiz.id}` : `/dashboard/quizzes/solve/${quiz.id}`}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98]"
                      >
                        <PlayCircle size={18} /> Start Assessment
                      </Link>
                    )
                  ) : (
                    <div className="flex items-center gap-2">
                      <Link
                        href={assessmentType === "PRACTICE" ? `/dashboard/practices/solve/${quiz.id}` : `/dashboard/quizzes/solve/${quiz.id}`}
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
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              No Assessments Found
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              {userRole === "STUDENT"
                ? "There are no assessments available for your grade level right now. Check back later!"
                : userRole === "TEACHER"
                  ? "No quizzes match your assigned subjects/grades or current filters."
                  : "No quizzes match your current filters or database is empty."}
            </p>
            {userRole !== "STUDENT" && (
              <p className="text-slate-400 text-xs mt-3 flex items-center justify-center gap-1.5">
                <Sparkles size={14} /> Start by using the creator above to
                generate content
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex justify-center items-center gap-1.5 pt-6 pb-2">
          {safePage > 1 ? (
            <Link
              href={buildPageLink(safePage - 1)}
              aria-label="Previous page"
              title="Previous page"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all shadow-sm"
            >
              <ChevronLeft size={18} />
            </Link>
          ) : (
            <span aria-disabled="true" aria-label="Previous page" className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-300">
              <ChevronLeft size={18} />
            </span>
          )}

          <span className="sr-only" aria-live="polite">Page {safePage} of {totalPages}</span>
          <div className="flex items-center gap-1" aria-label={`Page ${safePage} of ${totalPages}`}>
            {paginationItems.map((pageNum, index) => pageNum === null ? (
              <span key={`ellipsis-${index}`} aria-hidden="true" className="flex h-10 w-7 items-center justify-center text-slate-400">…</span>
            ) : (
              <Link
                key={pageNum}
                href={buildPageLink(pageNum)}
                aria-current={pageNum === safePage ? "page" : undefined}
                aria-label={`Page ${pageNum}`}
                className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-bold transition-all ${pageNum === safePage ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 shadow-sm"}`}
              >
                {pageNum}
              </Link>
            ))}
          </div>

          {safePage < totalPages ? (
            <Link
              href={buildPageLink(safePage + 1)}
              aria-label="Next page"
              title="Next page"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all shadow-sm"
            >
              <ChevronRight size={18} />
            </Link>
          ) : (
            <span aria-disabled="true" aria-label="Next page" className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-300">
              <ChevronRight size={18} />
            </span>
          )}
        </nav>
      )}
    </>
  );
}
