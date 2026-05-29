// src/app/dashboard/certificates/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import CertificateButton from "@/components/CertificateButton";
import { Award, CheckCircle, TrendingUp, BookOpen, GraduationCap } from "lucide-react";

export const revalidate = 300;

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as any)?.role;
  const userId = (session.user as any)?.id;

  let achievements: any[] = [];

  if (userRole === "STUDENT") {
    // Get student's completed quizzes with score >= 80
    const results = await prisma.result.findMany({
      where: { 
        studentId: userId,
        score: { gte: 80 }
      },
      include: { quiz: { include: { subject: true } } },
      orderBy: { completedAt: "desc" },
    });

    achievements = results.map((r) => ({
      id: r.id,
      studentName: session.user?.name || "Student",
      subject: r.quiz.subject.name,
      score: r.score,
      date: new Date(r.completedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      teacherName: "Ashraf Elsayed",
    }));
  } else {
    // For teachers, show all student achievements
    const results = await prisma.result.findMany({
      where: { score: { gte: 80 } },
      include: { quiz: { include: { subject: true } }, student: true },
      orderBy: { completedAt: "desc" },
      take: 20,
    });

    achievements = results.map((r) => ({
      id: r.id,
      studentName: r.student.name || "Student",
      subject: r.quiz.subject.name,
      score: r.score,
      date: new Date(r.completedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      teacherName: "Ashraf Elsayed",
    }));
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="mb-10 flex items-center gap-4 border-b border-slate-200 pb-6">
        <div className="bg-amber-100 p-4 rounded-2xl text-amber-600">
          <Award size={40} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            {userRole === "STUDENT" ? "Your Achievements" : "Student Achievements"}
          </h1>
          <p className="text-slate-500">
            {userRole === "STUDENT" 
              ? "Download and print certificates for quizzes you have mastered." 
              : "View and manage certificates for high-performing students."}
          </p>
        </div>
      </header>

      {achievements.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
          <Award size={64} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-600 mb-2">No Certificates Yet</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {userRole === "STUDENT" 
              ? "Complete quizzes with a score of 80% or higher to earn certificates." 
              : "Students will appear here once they achieve 80% or higher on quizzes."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {achievements.map((cert) => (
            <div key={cert.id} className="bg-white p-8 rounded-3xl shadow-md border border-slate-100 relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute -right-10 -top-10 text-amber-50 opacity-50 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
                <Award size={200} />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <CheckCircle size={20} />
                    Passed with {cert.score.toFixed(0)}%
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <TrendingUp size={16} />
                    <span className="text-xs font-bold">Excellence</span>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-1">
                  NAFS {cert.subject} Assessment
                </h2>
                <div className="flex items-center gap-2 text-slate-500 mb-8">
                  <BookOpen size={16} />
                  <span>Completed on {cert.date}</span>
                </div>

                {userRole === "STUDENT" && (
                  <div className="flex items-center gap-3">
                    <CertificateButton
                      studentName={cert.studentName}
                      subject={cert.subject}
                      date={cert.date}
                      teacherName={cert.teacherName}
                      score={cert.score}
                    />
                  </div>
                )}

                {userRole !== "STUDENT" && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl">
                      <GraduationCap size={18} className="text-indigo-500" />
                      <span className="text-sm font-bold text-slate-700">{cert.studentName}</span>
                    </div>
                    <CertificateButton
                      studentName={cert.studentName}
                      subject={cert.subject}
                      date={cert.date}
                      teacherName={cert.teacherName}
                      score={cert.score}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}