"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, BookOpen, Users, BarChart3, Settings,
  FileText, Award, GraduationCap, ClipboardList, Home,
  Shield, UserCog, CheckCircle2, History
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
      { name: "Subjects", icon: <BookOpen size={20} />, href: "/dashboard/subjects", roles: ["ADMIN", "TEACHER"] },
      { name: "Students", icon: <Users size={20} />, href: "/dashboard/students", roles: ["ADMIN", "TEACHER"] },
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

  // Compute active item with "most specific match wins" logic
  // This prevents parent routes from being highlighted when child routes are active
  const getActiveHref = (): string | null => {
    if (!pathname) return null;

    // Filter items whose href matches the current pathname
    // An item matches if: pathname equals href exactly, OR pathname starts with href + "/"
    const matches = menuItems.filter((item) => {
      if (pathname === item.href) return true;
      if (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) return true;
      return false;
    });

    if (matches.length === 0) return null;

    // If multiple match, pick the one with the longest href (most specific)
    // e.g. /dashboard/quizzes/completed beats /dashboard/quizzes
    return matches.reduce((a, b) => a.href.length >= b.href.length ? a : b).href;
  };

  const activeHref = getActiveHref();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 min-h-[calc(100vh-4rem)] shadow-inner flex flex-col">
      <div className="p-6">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          {userRole === "STUDENT" ? "Student Portal" : userRole === "ADMIN" ? "Administration" : "Teacher Portal"}
        </p>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = activeHref === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive ? "bg-indigo-600 text-white shadow-md font-semibold" : "hover:bg-slate-800 hover:text-white font-medium"
                }`}
              >
                {item.icon}
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {userRole === "STUDENT" && (
        <div className="p-6 mt-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Quick Links</p>
          <nav className="space-y-1">
            {["science", "english", "math"].map((sub) => (
              <Link key={sub} href={`/preparation/${sub}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-white transition-all text-sm font-medium capitalize">
                <BookOpen size={18} /> {sub}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <div className="p-6 mt-auto">
        <div className="bg-slate-800 rounded-xl p-4 text-center border border-slate-700">
          <p className="text-xs text-slate-400 mb-2">Need help?</p>
          <Link href="/docs" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            View Documentation
          </Link>
        </div>
      </div>
    </aside>
  );
}