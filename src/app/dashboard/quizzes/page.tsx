import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import QuizManager2 from "@/components/QuizManager";
import QuizFilterBar from "./QuizFilterBar";
import QuizGridSection from "./QuizGridSection";
import BulkDeleteAssessmentsButton from "./BulkDeleteAssessmentsButton";
import { LayoutGrid } from "lucide-react";

export const revalidate = 300;

/* ─── Skeleton components ─── */

function FiltersSkeleton() {
  return (
    <div className="flex gap-3 flex-wrap items-center">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-10 w-40 bg-slate-100 rounded-xl animate-pulse"
        />
      ))}
      <div className="h-10 w-32 bg-slate-100 rounded-xl animate-pulse" />
    </div>
  );
}

function QuizGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="h-10 w-28 bg-slate-100 rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse" />
                <div className="w-16 h-6 bg-slate-100 rounded-lg animate-pulse" />
              </div>
              <div className="h-5 w-3/4 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-5 w-1/2 bg-slate-100 rounded-lg animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ─── */

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

  const userRole = session.user.role;
  const userId = session.user.id;
  if (!userId) redirect("/login");

  const params = await searchParams;
  const filterSubject = params.subject;
  const filterGrade = params.grade ? parseInt(params.grade) : null;
  const filterOutcome = params.outcome;
  const filterIndicator = params.indicator;
  const currentPage = Math.max(1, parseInt(params.page || "1"));

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {(userRole === "ADMIN" || userRole === "TEACHER") && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 lg:p-8">
          <QuizManager2 assessmentType="QUIZ" />
        </div>
      )}

      <div className="space-y-6">
        {/* Header Section — renders instantly (no data fetching) */}
        <header className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="shrink-0 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-indigo-700">
                <LayoutGrid size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{userRole === "STUDENT" ? "Graded Quizzes" : "Quiz Library"}</h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">{userRole === "STUDENT" ? "Take published quizzes for your grade and review your scores and attempts." : userRole === "TEACHER" ? "Create and publish graded quizzes for your assigned classes, then review student results." : "Manage graded quizzes, publication, and student assessment access across the platform."}</p>
            </div>
          </div>
          {(userRole === "ADMIN" || userRole === "TEACHER") && <BulkDeleteAssessmentsButton assessmentType="QUIZ" />}
        </header>

        {/* Filters for admin/teacher — stream independently */}
        {userRole !== "STUDENT" && (
          <Suspense fallback={<FiltersSkeleton />}>
            <QuizFilterBar
              userRole={userRole}
              userId={userId}
              filterSubject={filterSubject}
              filterGrade={filterGrade}
              filterOutcome={filterOutcome}
              filterIndicator={filterIndicator}
            />
          </Suspense>
        )}

        {/* Quiz grid + count badge — streams in last (heaviest queries) */}
        <Suspense fallback={<QuizGridSkeleton />}>
          <QuizGridSection
            userRole={userRole}
            userId={userId}
            filterSubject={filterSubject}
            filterGrade={filterGrade}
            filterOutcome={filterOutcome}
            filterIndicator={filterIndicator}
            currentPage={currentPage}
            assessmentType="QUIZ"
          />
        </Suspense>
      </div>
    </div>
  );
}
