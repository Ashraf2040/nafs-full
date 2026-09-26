"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const items = [
  { label: "Overview", href: "/dashboard", roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Teachers", href: "/dashboard/teachers", roles: ["ADMIN"] },
  { label: "Quizzes", href: "/dashboard/quizzes", roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Completed", href: "/dashboard/quizzes/completed", roles: ["STUDENT"] },
  { label: "Learning Path", href: "/dashboard/learning-path", roles: ["STUDENT"] },
  { label: "Diagnostics", href: "/dashboard/diagnostics", roles: ["STUDENT"] },
  { label: "Report", href: "/dashboard/report", roles: ["STUDENT"] },
  { label: "Achievements", href: "/dashboard/achievements", roles: ["STUDENT"] },
  { label: "Subjects", href: "/dashboard/subjects", roles: ["ADMIN", "TEACHER"] },
  { label: "Challenges", href: "/dashboard/challenges", roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Students", href: "/dashboard/students", roles: ["ADMIN", "TEACHER"] },
  { label: "Reports", href: "/dashboard/student-reports", roles: ["ADMIN", "TEACHER"] },
  { label: "Statistics", href: "/dashboard/statistics", roles: ["ADMIN", "TEACHER"] },
  { label: "Certificates", href: "/dashboard/certificates", roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Settings", href: "/dashboard/settings", roles: ["ADMIN", "TEACHER", "STUDENT"] },
];

export default function DashboardMobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const visibleItems = items.filter((item) => role && item.roles.includes(role));
  const activeHref = visibleItems
    .filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="Dashboard navigation" className="sticky top-16 z-40 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleItems.map((item) => (
          <Link
            key={`${item.label}-${item.href}`}
            href={item.href}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeHref === item.href
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
