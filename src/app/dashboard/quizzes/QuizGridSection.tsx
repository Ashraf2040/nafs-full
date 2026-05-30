import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  FileText, Calendar, Clock, Edit, PlayCircle, CheckCircle2,
  GraduationCap, BookOpen, Eye, Sparkles, Search, History, ArrowRight,
} from "lucide-react";
import QuizActions from "./QuizActions";

const ITEMS_PER_PAGE = 15;

interface QuizGridSectionProps {
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
}: QuizGridSectionProps) {
  const whereClause: any = {};

  if (userRole === "STUDENT") {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { grade: { select: { id: true } } },
    });
    if (currentUser?.grade) {
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
    if (filterOutcome || filterIndicator) {
      whereClause.outcomeId = filterOutcome || filterIndicator;
    }
  }

  const quizWhere =
    Object.keys(whereClause).length > 0 ? whereClause : undefined;

  const pageSkip =
    (Math.min(currentPage, Math.max(1, Math.ceil(1 / ITEMS_PER_PAGE))) - 1) *
    ITEMS_PER_PAGE;

  const [totalCount, quizzes, studentResultsData] = await Promise.all([
    prisma.quiz.count({ where: quizWhere }),
    prisma.quiz.findMany({
      where: quizWhere,
      include: {
        subject: true,
        grade: true,
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: pageSkip,
      take: ITEMS_PER_PAGE,
    }),
    userRole === "STUDENT"
      ? prisma.result.findMany({
          where: { studentId: userId },
          select: { id: true, quizId: true, score: true },
        })
      : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));

  let studentResults: Record<string, any> = {};
  let completedQuizIds: Set<string> = new Set();
  if (userRole === "STUDENT") {
    studentResultsData.forEach((r) => {
      studentResults[r.quizId] = r;
      completedQuizIds.add(r.quizId);
    });
  }
  const completedCount = completedQuizIds.size;

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
    <>
      {/* Info bar: completed link (student) + total count */}
      <div className="flex items-center gap-3 justify-end flex-wrap">
        {userRole === "STUDENT" && completedCount > 0 && (
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
        {quizzes.map((quiz) => {
          const isCompleted = completedQuizIds.has(quiz.id);
          const result = studentResults[quiz.id];

          if (userRole === "STUDENT" && isCompleted) return null;

          return (
            <div
              key={quiz.id}
              className="relative bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col overflow-hidden group"
            >
              <div
                className={`h-1.5 w-full ${quiz.isPublished ? "bg-gradient-to-r from-indigo-500 to-violet-500" : "bg-gradient-to-r from-amber-400 to-orange-400"}`}
              />

              <div className="p-5 sm:p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-5">
                  <div
                    className={`p-2.5 rounded-xl transition-colors duration-300 ${isCompleted ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-500 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100"}`}
                  >
                    {isCompleted ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {isCompleted && (
                      <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1.5">
                        <CheckCircle2 size={12} /> Scored {result.score.toFixed(0)}%
                      </span>
                    )}
                    {!isCompleted && (
                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-lg ${quiz.isPublished ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}
                      >
                        {quiz.isPublished ? "Active" : "Draft"}
                      </span>
                    )}
                  </div>
                </div>

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
                      <span className="font-medium">{quiz._count?.questions ?? 0} Qs</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <Calendar size={13} className="text-slate-300 flex-shrink-0" />
                      <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto" />

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
                  className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${pageNum === safePage ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 shadow-sm"}`}
                >
                  {pageNum}
                </Link>
              ),
            )}
          </div>

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
    </>
  );
}
