// src/components/Navbar.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { BookOpen, LogOut, LogIn, User, Shield, GraduationCap, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [studentStats, setStudentStats] = useState<{ totalScore: number; quizzesTaken: number } | null>(null);
  const userRole = (session?.user as any)?.role;
  const userName = session?.user?.name;

  // Fetch student stats for the score badge
  useEffect(() => {
    if (userRole === "STUDENT" && session?.user?.id) {
      fetch(`/api/students/stats/${session.user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data) setStudentStats(data);
        })
        .catch(console.error);
    }
  }, [userRole, session?.user?.id]);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-indigo-600 hover:scale-105 transition-transform">
          <BookOpen size={28} />
          <span className="text-xl font-bold tracking-tight">NAFS Portal</span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Student Achievement Score Badge */}
          {status === "authenticated" && userRole === "STUDENT" && studentStats && (
            <div className="hidden md:flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-4 py-2 rounded-2xl shadow-sm">
              <Trophy size={18} className="text-amber-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Achievement Score</span>
                <span className="text-sm font-bold text-amber-700">
                  {studentStats.totalScore.toFixed(0)} pts • {studentStats.quizzesTaken} quizzes
                </span>
              </div>
            </div>
          )}

          {/* Role Badge */}
          {status === "authenticated" && (
            <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
              {userRole === "ADMIN" && <Shield size={14} className="text-indigo-500" />}
              {userRole === "TEACHER" && <User size={14} className="text-emerald-500" />}
              {userRole === "STUDENT" && <GraduationCap size={14} className="text-blue-500" />}
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {userRole}
              </span>
            </div>
          )}

          {status === "authenticated" ? (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800">{userName}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider md:hidden">
                  {userRole}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-700 transition-colors bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl"
              >
                <LogOut size={18} /> <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md active:scale-95"
              >
                <LogIn size={18} /> {status === "loading" ? "..." : "Sign In"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}