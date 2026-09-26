"use client";
import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import {
  Users, Search, Loader2, GraduationCap, BookOpen,
  Filter, ArrowRight, School, Layers
} from "lucide-react";
import Link from "next/link";
import { fetcher } from "@/lib/fetcher";

interface Student {
  id: string;
  name: string;
  email: string;
  gradeLevel: number | null;
  className: string | null;
  completedQuizzes: number;
  avgScore: number | null;
}

export default function StudentReportsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  const [subject, setSubject] = useState("Math");
  const [gradeLevel, setGradeLevel] = useState("6");
  const [classId, setClassId] = useState("");

  const { data: gradesData } = useSWR("/api/grades", fetcher);
  const { data: classesData } = useSWR(
    classId !== "__all" ? `/api/classes?gradeLevel=${gradeLevel}` : null,
    fetcher
  );
  const { data, error, isLoading } = useSWR(
    `/api/student-reports?subject=${encodeURIComponent(subject)}&grade=${gradeLevel}${classId && classId !== "__all" ? `&classId=${classId}` : ""}`,
    fetcher
  );

  const [searchQuery, setSearchQuery] = useState("");

  const subjects = ["Math", "English", "Science"];
  const grades = [3, 6, 9];

  const filteredStudents = (data?.students || []).filter((s: Student) =>
    !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Users size={28} className="text-indigo-600" /> Student Reports
        </h1>
        <p className="text-slate-500 mt-1">View performance reports for any student, filtered by subject and grade.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-slate-400" />
          <span className="font-semibold text-slate-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Subject</label>
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            >
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Grade</label>
            <select
              value={gradeLevel}
              onChange={e => { setGradeLevel(e.target.value); setClassId(""); }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            >
              {grades.map(g => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Class (optional)</label>
            <select
              value={classId}
              onChange={e => setClassId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            >
              <option value="">All Classes</option>
              {(classesData || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name} (Grade {c.grade?.level})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Student name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">Failed to load students.</div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-semibold">No students found</p>
          <p className="text-sm">Try different filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Student</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Grade</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Class</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Completed</th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Avg Score</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student: Student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-800">{student.name}</p>
                        <p className="text-xs text-slate-400">{student.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                        <GraduationCap size={14} className="text-indigo-400" />
                        Grade {student.gradeLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                        <School size={14} className="text-amber-400" />
                        {student.className || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-semibold text-slate-700">{student.completedQuizzes}</span>
                    </td>
                    <td className="px-6 py-4">
                      {student.avgScore !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[100px] bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                student.avgScore >= 70 ? "bg-emerald-500" :
                                student.avgScore >= 50 ? "bg-amber-500" :
                                "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(student.avgScore, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${
                            student.avgScore >= 70 ? "text-emerald-700" :
                            student.avgScore >= 50 ? "text-amber-700" :
                            "text-red-700"
                          }`}>
                            {student.avgScore}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 ml-2">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/student-reports/${student.id}?subject=${encodeURIComponent(subject)}&grade=${gradeLevel}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        View Report <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
