"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  Activity, Award, BarChart3, BookOpen, CheckCircle2, ClipboardList,
  FileText, Gamepad2, GraduationCap, LayoutDashboard, LibraryBig,
  Menu, Settings, Shield, Target, Trophy, UserCog, Users, X,
} from "lucide-react";

const items = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Manage Teachers", href: "/dashboard/teachers", icon: UserCog, roles: ["ADMIN"] },
  { label: "Diagnostic", href: "/dashboard/diagnostic", icon: Target, roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Practices", href: "/dashboard/practices", icon: FileText, roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Quizzes", href: "/dashboard/quizzes", icon: CheckCircle2, roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Simulations", href: "/dashboard/simulations", icon: ClipboardList, roles: ["ADMIN", "STUDENT"] },
  { label: "Tests", href: "/dashboard/simulations", icon: ClipboardList, roles: ["TEACHER"] },
  { label: "Study Guides", href: "/dashboard/study-guides", icon: LibraryBig, roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Completed Quizzes", href: "/dashboard/quizzes/completed", icon: CheckCircle2, roles: ["STUDENT"] },
  { label: "Achievements", href: "/dashboard/achievements", icon: Trophy, roles: ["STUDENT"] },
  { label: "Subjects", href: "/dashboard/subjects", icon: BookOpen, roles: ["ADMIN", "TEACHER"] },
  { label: "Challenges", href: "/dashboard/challenges", icon: Gamepad2, roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Students", href: "/dashboard/students", icon: Users, roles: ["ADMIN", "TEACHER"] },
  { label: "Student Reports", href: "/dashboard/student-reports", icon: Activity, roles: ["ADMIN", "TEACHER"] },
  { label: "Statistics", href: "/dashboard/statistics", icon: BarChart3, roles: ["ADMIN", "TEACHER"] },
  { label: "Certificates", href: "/dashboard/certificates", icon: Award, roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Documentation", href: "/docs", icon: Shield, roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Science Prep", href: "/preparation/science", icon: BookOpen, roles: ["STUDENT"] },
  { label: "English Prep", href: "/preparation/english", icon: BookOpen, roles: ["STUDENT"] },
  { label: "Math Prep", href: "/preparation/math", icon: GraduationCap, roles: ["STUDENT"] },
];

const primaryLabels = ["Overview", "Practices", "Quizzes", "Study Guides"];

export default function DashboardMobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const role = (session?.user as any)?.role as string | undefined;
  const visibleItems = items.filter((item) => role && item.roles.includes(role));
  const activeItem = visibleItems
    .filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const primaryItems = visibleItems.filter((item) => primaryLabels.includes(item.label));
  const moreItems = visibleItems.filter((item) => !primaryLabels.includes(item.label));
  const moreIsActive = moreItems.some((item) => activeItem?.href === item.href);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    menuRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      <nav aria-label="Dashboard navigation" className="dashboard-mobile-nav print:hidden lg:hidden">
        {primaryItems.map(({ label, href, icon: Icon }) => {
          const isActive = activeItem?.href === href;
          return <Link key={href} href={href} aria-current={isActive ? "page" : undefined} className={`dashboard-mobile-link ${isActive ? "is-active" : ""}`}>
            <Icon size={19} strokeWidth={isActive ? 2.4 : 1.9} /><span>{label === "Study Guides" ? "Guides" : label}</span>
          </Link>;
        })}
        <button type="button" aria-expanded={menuOpen} aria-controls="dashboard-mobile-menu" onClick={() => setMenuOpen((open) => !open)} className={`dashboard-mobile-link ${menuOpen || moreIsActive ? "is-active" : ""}`}>
          {menuOpen ? <X size={19} /> : <Menu size={19} />}<span>More</span>
        </button>
      </nav>

      {menuOpen && <div className="dashboard-mobile-backdrop print:hidden" onClick={() => setMenuOpen(false)}>
        <div ref={menuRef} id="dashboard-mobile-menu" role="dialog" aria-modal="true" aria-label="More dashboard sections" tabIndex={-1} className="dashboard-mobile-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-600">Workspace</p><h2 className="mt-1 text-lg font-bold text-slate-900">More sections</h2></div>
            <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X size={19} /></button>
          </div>
          <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {moreItems.map(({ label, href, icon: Icon }) => {
              const isActive = activeItem?.href === href;
              return <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={isActive ? "page" : undefined} className={`dashboard-mobile-sheet-link ${isActive ? "is-active" : ""}`}>
                <span className="dashboard-mobile-sheet-icon"><Icon size={18} /></span><span className="min-w-0 truncate">{label}</span>
              </Link>;
            })}
          </nav>
        </div>
      </div>}
    </>
  );
}
