"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

const items = [
  { label: "Overview", href: "/dashboard", roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Teachers", href: "/dashboard/teachers", roles: ["ADMIN"] },
  { label: "Diagnostic", href: "/dashboard/diagnostic", roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Practices", href: "/dashboard/practices", roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Quizzes", href: "/dashboard/quizzes", roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Simulations", href: "/dashboard/simulations", roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Study Guides", href: "/dashboard/study-guides", roles: ["ADMIN", "TEACHER", "STUDENT"] },
  { label: "Completed", href: "/dashboard/quizzes/completed", roles: ["STUDENT"] },
  { label: "Learning Path", href: "/dashboard/learning-path", roles: ["STUDENT"] },
  { label: "Analysis", href: "/dashboard/diagnostic/analysis", roles: ["STUDENT"] },
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
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const visibleItems = items.filter((item) => role && item.roles.includes(role));
  const activeHref = visibleItems
    .filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeHref]);

  return (
    <nav aria-label="Dashboard navigation" className="print:hidden sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden sm:px-3">
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleItems.map((item) => (
          <Link
            key={`${item.label}-${item.href}`}
            href={item.href}
            ref={activeHref === item.href ? activeLinkRef : undefined}
            aria-current={activeHref === item.href ? "page" : undefined}
            className={`shrink-0 snap-start rounded-full px-3.5 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:px-4 sm:text-sm ${
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
