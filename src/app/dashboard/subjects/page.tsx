// src/app/dashboard/subjects/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { BookOpen, Edit, Plus, BarChart3, FileText, Users } from "lucide-react";
import SubjectCreateModal from "@/components/SubjectCreateModal";

export const dynamic = "force-dynamic";

export default async function DashboardSubjectsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as any)?.role;

  if (userRole === "STUDENT") {
    redirect("/dashboard");
  }

  const subjects = await prisma.subject.findMany({
    include: {
      quizzes: {
        include: {
          _count: {
            select: { results: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const subjectsWithStats = subjects.map((subject) => {
  const totalAttempts = subject.quizzes.reduce(
    (acc, q) => acc + (q._count?.results || 0),
    0
  );

  const avgScore =
    subject.quizzes.length > 0
      ? subject.quizzes.reduce((acc, q) => {
          const quizAvg =
            q._count?.results && q._count.results > 0
              ? 0 // ❗ ما عندكش scores هنا، فقط count
              : 0;

          return acc + quizAvg;
        }, 0) / subject.quizzes.length
      : 0;

  return {
    ...subject,
    totalAttempts,
    avgScore: isNaN(avgScore) ? 0 : avgScore,
  };
});

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <BookOpen className="text-indigo-600" /> Subject Management
          </h1>
          <p className="text-slate-500 mt-2">
            Manage curriculum subjects and view associated assessments.
          </p>
        </div>

        {/* ─── WORKING ADD SUBJECT BUTTON ─── */}
        <SubjectCreateModal />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjectsWithStats.map((subject) => (
          <div
            key={subject.id}
            className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all"
          >
            <div
              className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${
                subject.colorCode || "from-slate-400 to-slate-600"
              }`}
            ></div>

            <div className="flex justify-between items-start mb-4 mt-2">
              <h2 className="text-2xl font-bold text-slate-800">{subject.name}</h2>
              <div
                className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  subject.avgScore >= 80
                    ? "bg-emerald-100 text-emerald-700"
                    : subject.avgScore >= 50
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {subject.avgScore > 0
                  ? `${subject.avgScore.toFixed(1)}% avg`
                  : "No data"}
              </div>
            </div>

            <p className="text-slate-500 text-sm mb-6 line-clamp-2 min-h-[40px]">
              {subject.description || "No description provided."}
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-slate-50 p-3 rounded-xl text-center">
                <FileText size={16} className="mx-auto text-indigo-400 mb-1" />
                <p className="text-lg font-bold text-slate-800">
                  {subject.quizzes.length}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Quizzes
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl text-center">
                <Users size={16} className="mx-auto text-indigo-400 mb-1" />
                <p className="text-lg font-bold text-slate-800">
                  {subject.totalAttempts}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Attempts
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl text-center">
                <BarChart3 size={16} className="mx-auto text-indigo-400 mb-1" />
                <p className="text-lg font-bold text-slate-800">
                  {subject.quizzes.filter((q) => q.isPublished).length}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Active
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Link
                href={`/preparation/${subject.name.toLowerCase()}`}
                className="text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors text-sm font-bold"
              >
                View Page →
              </Link>
              <button className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors">
                <Edit size={18} />
              </button>
            </div>
          </div>
        ))}

        {subjectsWithStats.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-400 font-medium">
              No subjects found. Create your first subject!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}