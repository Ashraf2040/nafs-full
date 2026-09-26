// src/components/Sidebar.tsx — ENHANCED
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, BookOpen, Users, BarChart3, Settings,
  FileText, Award, GraduationCap, ClipboardList, Home,
  Shield, UserCog, CheckCircle2, History, ChevronRight,
  Route, Trophy, Gamepad2, Target
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  const getMenuItems = () => {
    const items = [
      { name: "Overview", icon: <LayoutDashboard size={20} />, href: "/dashboard", roles: ["ADMIN", "TEACHER", "STUDENT"] },
      { name: "My Quizzes", icon: <FileText size={20} />, href: "/dashboard/quizzes", roles: ["ADMIN", "TEACHER"] },
      { name: "Available Quizzes", icon: <ClipboardList size={20} />, href: "/dashboard/quizzes", roles: ["STUDENT"] },
      { name: "Completed Quizzes", icon: <CheckCircle2 size={20} />, href: "/dashboard/quizzes/completed", roles: ["STUDENT"] },
      { name: "Learning Path", icon: <Route size={20} />, href: "/dashboard/learning-path", roles: ["STUDENT"] },
      { name: "Diagnostics", icon: <BarChart3 size={20} />, href: "/dashboard/diagnostics", roles: ["STUDENT"] },
      { name: "Report", icon: <Target size={20} />, href: "/dashboard/report", roles: ["STUDENT"] },
      { name: "Achievements", icon: <Trophy size={20} />, href: "/dashboard/achievements", roles: ["STUDENT"] },
      { name: "Subjects", icon: <BookOpen size={20} />, href: "/dashboard/subjects", roles: ["ADMIN", "TEACHER"] },
      { name: "Challenges", icon: <Gamepad2 size={20} />, href: "/dashboard/challenges", roles: ["ADMIN", "TEACHER", "STUDENT"] },
      { name: "Students", icon: <Users size={20} />, href: "/dashboard/students", roles: ["ADMIN", "TEACHER"] },
      { name: "Student Reports", icon: <BarChart3 size={20} />, href: "/dashboard/student-reports", roles: ["ADMIN", "TEACHER"] },
      { name: "Statistics", icon: <BarChart3 size={20} />, href: "/dashboard/statistics", roles: ["ADMIN", "TEACHER"] },
      { name: "Certificates", icon: <Award size={20} />, href: "/dashboard/certificates", roles: ["ADMIN", "TEACHER", "STUDENT"] },
      { name: "Settings", icon: <Settings size={20} />, href: "/dashboard/settings", roles: ["ADMIN", "TEACHER", "STUDENT"] },
    ];

    if (userRole === "ADMIN") {
      items.splice(1, 0, { 
        name: "Manage Teachers", 
        icon: <UserCog size={20} />, 
        href: "/dashboard/teachers", 
        roles: ["ADMIN"] 
      });
    }

    return items.filter((item) => item.roles.includes(userRole || ""));
  };

  const menuItems = getMenuItems();

  const getActiveHref = (): string | null => {
    if (!pathname) return null;
    const matches = menuItems.filter((item) => {
      if (pathname === item.href) return true;
      if (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) return true;
      return false;
    });
    if (matches.length === 0) return null;
    return matches.reduce((a, b) => a.href.length >= b.href.length ? a : b).href;
  };

  const activeHref = getActiveHref();

  return (
    <aside className="hidden w-64 bg-slate-900 text-slate-300 flex-shrink-0 min-h-[calc(100vh-4rem)] shadow-inner lg:flex flex-col relative">
      {/* Subtle top gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      
      <div className="p-6">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
          {userRole === "STUDENT" ? "Student Portal" : userRole === "ADMIN" ? "Administration" : "Teacher Portal"}
        </p>
        <nav className="space-y-1">
          {menuItems.map((item, i) => {
            const isActive = activeHref === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative ${
                  isActive 
                    ? "text-white font-semibold" 
                    : "hover:bg-slate-800 hover:text-white font-medium"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarItem"
                    className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-900/50"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
                  {item.icon}
                </span>
                <span className="relative z-10 text-sm">{item.name}</span>
                {isActive && (
                  <ChevronRight size={14} className="relative z-10 ml-auto opacity-60" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {userRole === "STUDENT" && (
        <div className="px-6 py-4 mt-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Quick Links</p>
          <nav className="space-y-1">
            {["science", "english", "math"].map((sub) => (
              <Link 
                key={sub} 
                href={`/preparation/${sub}`} 
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition-all text-sm font-medium capitalize group"
              >
                <BookOpen size={16} className="text-slate-500 group-hover:text-indigo-400 transition-colors" /> 
                {sub}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {userRole === "ADMIN" && <div className="p-6 mt-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 text-center border border-slate-700/50 hover:border-slate-600 transition-colors">
          <p className="text-xs text-slate-400 mb-2">Need help?</p>
          <Link href="/docs" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1">
            View Documentation
            <ChevronRight size={12} />
          </Link>
        </div>
      </div>}
    </aside>
  );
}
