// src/components/Navbar.tsx — ENHANCED
"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import useSWR from "swr";
import { BookOpen, LogOut, LogIn, User, Shield, GraduationCap, Trophy } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const { data: session, status } = useSession();
  const userRole = (session?.user as any)?.role;
  const userName = session?.user?.name;

  const { data: studentStats } = useSWR(
    userRole === "STUDENT" && session?.user?.id
      ? `/api/students/stats/${session.user.id}`
      : null,
    fetcher
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_1px_8px_rgba(15,23,42,.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5 lg:px-7">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5 text-indigo-600 transition-opacity hover:opacity-85">
          <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-2 shadow-md shadow-indigo-600/20">
            <BookOpen size={18} className="text-white" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">NAFS <span className="font-semibold text-indigo-600">Portal</span></span>
        </Link>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Student Achievement Score Badge */}
          {status === "authenticated" && userRole === "STUDENT" && studentStats && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hidden items-center gap-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 shadow-sm lg:flex"
            >
              <Trophy size={18} className="text-amber-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Achievement Score</span>
                <span className="text-sm font-bold text-amber-700">
                  {studentStats.averagePercentage.toFixed(0)}% average • {studentStats.quizzesTaken} quizzes
                </span>
              </div>
            </motion.div>
          )}

          {/* Role Badge */}
          {status === "authenticated" && (
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">
              {userRole === "ADMIN" && <Shield size={14} className="text-indigo-500" />}
              {userRole === "TEACHER" && <User size={14} className="text-emerald-500" />}
              {userRole === "STUDENT" && <GraduationCap size={14} className="text-blue-500" />}
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {userRole}
              </span>
            </div>
          )}

          {status === "authenticated" ? (
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div className="flex min-w-0 flex-col items-end">
                <span className="max-w-[34vw] truncate text-xs font-bold text-slate-800 sm:max-w-[220px] sm:text-sm">{userName}</span>
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider sm:hidden">
                  {userRole}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:px-3.5"
              >
                <LogOut size={17} /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shadow-indigo-500/20 active:scale-95"
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
