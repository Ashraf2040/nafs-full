import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { UserCog, Mail, BarChart3 } from "lucide-react";
import TeacherCreateModal from "./TeacherCreateModal";
import TeacherEditButton from "@/components/TeacherEditButton";

export const revalidate = 600;

export default async function TeachersManagementPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") redirect("/dashboard");

  const [teachers, subjects, grades] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEACHER" },
      include: {
        assignments: { include: { subject: true, grade: true } },
        quizzes: { select: { id: true, _count: { select: { results: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subject.findMany({
      where: { name: { in: ["Science", "Math", "English"] } },
      orderBy: { name: "asc" },
    }),
    prisma.grade.findMany({
      where: { level: { in: [3, 6, 9] } },
      orderBy: { level: "asc" },
    }),
  ]);

  const teacherIds = teachers.map(t => t.id);
  const quizStats = teacherIds.length > 0
    ? await prisma.result.groupBy({
        by: ["quizId"],
        where: { quiz: { creatorId: { in: teacherIds } } },
        _avg: { score: true },
      })
    : [];
  const quizStatMap = new Map(quizStats.map(q => [q.quizId, q._avg.score]));
  // Map teacherId -> [quizIds] from the already-loaded quizzes
  const teacherQuizMap = new Map<string, string[]>();
  for (const t of teachers) {
    teacherQuizMap.set(t.id, t.quizzes.map(q => q.id));
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <UserCog className="text-indigo-600" size={32} /> Teacher Management
          </h1>
          <p className="text-slate-500 mt-1">
            Create teachers, assign subjects/grades, and monitor performance.
          </p>
        </div>
        <TeacherCreateModal subjects={subjects} grades={grades} />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {teachers.map((teacher) => {
          const totalQuizzes = teacher.quizzes.length;
          let totalSubmissions = 0;
          let scoreSum = 0;
          for (const q of teacher.quizzes) {
            totalSubmissions += q._count.results;
            scoreSum += (quizStatMap.get(q.id) || 0) * q._count.results;
          }
          const avgScore = totalSubmissions > 0 ? scoreSum / totalSubmissions : 0;

          const grouped = teacher.assignments.reduce((acc, a) => {
            const name = a.subject.name;
            if (!acc[name]) acc[name] = [];
            acc[name].push(a.grade.level);
            return acc;
          }, {} as Record<string, number[]>);

          return (
            <div
              key={teacher.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {teacher.name?.[0] || "T"}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">
                      {teacher.name || "Unnamed Teacher"}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Mail size={12} /> {teacher.email}
                    </p>
                  </div>
                </div>

                {/* ─── EDIT ASSIGNMENTS BUTTON ─── */}
                <TeacherEditButton
                  teacher={teacher}
                  subjects={subjects}
                  grades={grades}
                />
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(grouped).map(([subjName, levels]) => (
                  <span
                    key={subjName}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    {subjName} (Grades: {levels.join(", ")})
                  </span>
                ))}
                {teacher.assignments.length === 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                    No assignments
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-slate-800">{totalQuizzes}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Quizzes</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-slate-800">{totalSubmissions}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Submissions
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-slate-800">
                    {avgScore.toFixed(0)}%
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Avg Score
                  </p>
                </div>
              </div>

              <Link
                href={`/dashboard/teachers/${teacher.id}`}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
              >
                <BarChart3 size={16} /> View Profile & Stats
              </Link>
            </div>
          );
        })}

        {teachers.length === 0 && (
          <div className="col-span-full py-16 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <UserCog size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 font-medium">
              No teachers found. Create your first teacher above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}