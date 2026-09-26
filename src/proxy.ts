import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
type RouteRule = {
  roles: string[];
  methods?: Record<string, string[]>;
};

const roleAccess: Record<string, RouteRule> = {
  // ── API: teachers ──
  "/api/teachers/me/assignments": { roles: ["ADMIN", "TEACHER"] },
  "/api/teachers/me": { roles: ["ADMIN", "TEACHER"] },
  "/api/teachers/assignments": { roles: ["ADMIN", "TEACHER"] },
  "/api/teachers": { roles: ["ADMIN"] },

  // ── API: students ──
  "/api/students/import": { roles: ["ADMIN", "TEACHER"] },
  "/api/students/stats": { roles: ["ADMIN", "TEACHER", "STUDENT"] },
  "/api/students/completed-quizzes": { roles: ["STUDENT"] },
  "/api/students/all-quizzes": { roles: ["STUDENT"] },
  "/api/students/quiz-attempts": { roles: ["STUDENT"] },
  "/api/students": { roles: ["ADMIN", "TEACHER"] },

  // ── API: quizzes ──
  "/api/quizzes/save": { roles: ["ADMIN", "TEACHER"] },
  "/api/quizzes/import": { roles: ["ADMIN", "TEACHER"] },
  "/api/quizzes/export": { roles: ["ADMIN", "TEACHER"] },
  "/api/quizzes/": {
    roles: ["ADMIN", "TEACHER", "STUDENT"],
    methods: {
      PUT: ["ADMIN", "TEACHER"],
      DELETE: ["ADMIN", "TEACHER"],
      POST: ["ADMIN", "TEACHER"],
    },
  },
  "/api/quizzes": {
    roles: ["ADMIN", "TEACHER", "STUDENT"],
    methods: { POST: ["ADMIN", "TEACHER"] },
  },

  // ── API: outcomes ──
  "/api/outcomes/upload": { roles: ["ADMIN", "TEACHER"] },
  "/api/outcomes": { roles: ["ADMIN", "TEACHER", "STUDENT"] },

  // ── API: reference data ──
  "/api/subjects": { roles: ["ADMIN"] },
  "/api/grades": {
    roles: ["ADMIN", "TEACHER", "STUDENT"],
    methods: { POST: ["ADMIN"] },
  },
  "/api/classes": {
    roles: ["ADMIN", "TEACHER", "STUDENT"],
    methods: { POST: ["ADMIN", "TEACHER"] },
  },

  // ── API: reports / stats ──
  "/api/stats": { roles: ["ADMIN", "TEACHER"] },
  "/api/student-reports/": { roles: ["ADMIN", "TEACHER"] },
  "/api/student-reports": { roles: ["ADMIN", "TEACHER"] },

  // ── API: challenges ──
  "/api/challenges/completed": { roles: ["STUDENT"] },
  "/api/challenges/[id]/participate": {
    roles: ["ADMIN", "TEACHER", "STUDENT"],
    methods: {
      POST: ["STUDENT"],
      PATCH: ["ADMIN", "TEACHER"],
    },
  },
  "/api/challenges/": {
    roles: ["ADMIN", "TEACHER", "STUDENT"],
    methods: {
      POST: ["ADMIN", "TEACHER"],
      PUT: ["ADMIN", "TEACHER"],
      DELETE: ["ADMIN", "TEACHER"],
    },
  },
  "/api/challenges": {
    roles: ["ADMIN", "TEACHER", "STUDENT"],
    methods: { POST: ["ADMIN", "TEACHER"] },
  },

  // ── API: misc ──
  "/api/trophies": { roles: ["ADMIN", "TEACHER", "STUDENT"] },
  "/api/account": { roles: ["ADMIN", "TEACHER", "STUDENT"] },
  "/api/results/save": { roles: ["STUDENT"] },
  "/api/learning-path/generate": { roles: ["STUDENT"] },
  "/api/learning-path": { roles: ["STUDENT"] },
  "/api/diagnostics": { roles: ["ADMIN", "TEACHER", "STUDENT"] },
  "/api/remediation/generate": { roles: ["ADMIN", "TEACHER"] },
  "/api/generate-quiz": { roles: ["ADMIN", "TEACHER"] },
  "/api/generate-image": { roles: ["ADMIN", "TEACHER"] },
  "/api/admin": { roles: ["ADMIN"] },

  // ── Pages ──
  "/dashboard/teachers": { roles: ["ADMIN"] },
  "/dashboard/students/profile": { roles: ["ADMIN", "TEACHER"] },
  "/dashboard/students": { roles: ["ADMIN", "TEACHER"] },
  "/dashboard/student-reports": { roles: ["ADMIN", "TEACHER"] },
  "/dashboard/statistics": { roles: ["ADMIN", "TEACHER"] },
  "/dashboard/subjects": { roles: ["ADMIN", "TEACHER"] },
  "/dashboard/quizzes/completed": { roles: ["STUDENT"] },
  "/dashboard/quizzes/solve": { roles: ["ADMIN", "TEACHER", "STUDENT"] },
  "/dashboard/quizzes/edit": { roles: ["ADMIN", "TEACHER"] },
  "/dashboard/quizzes": { roles: ["ADMIN", "TEACHER", "STUDENT"] },
  "/dashboard/learning-path": { roles: ["STUDENT"] },
  "/dashboard/diagnostics": { roles: ["STUDENT"] },
  "/dashboard/report": { roles: ["STUDENT"] },
  "/dashboard/achievements": { roles: ["STUDENT"] },
  "/dashboard/certificates": { roles: ["ADMIN", "TEACHER", "STUDENT"] },
  "/dashboard/settings": { roles: ["ADMIN", "TEACHER", "STUDENT"] },
  "/dashboard/challenges": { roles: ["ADMIN", "TEACHER", "STUDENT"] },
  "/dashboard": { roles: ["ADMIN", "TEACHER", "STUDENT"] },

  "/docs": { roles: ["ADMIN"] },

  "/image-generator": { roles: ["ADMIN", "TEACHER"] },
  "/preparation": { roles: ["ADMIN", "TEACHER", "STUDENT"] },
};

// Public API paths that must never require a token.
const publicPaths = ["/api/auth", "/api/register"];

function getAllowedRoles(rule: RouteRule, method: string): string[] {
  if (rule.methods && rule.methods[method]) {
    return rule.methods[method];
  }
  return rule.roles;
}

/**
 * Converts a route key into a matcher.
 * - Exact keys match themselves or anything beneath them (prefix match).
 * - Keys containing "[...]" (e.g. "/api/challenges/[id]/participate")
 *   match any single path segment at that position.
 */
function compileRoutePattern(key: string): (pathname: string) => boolean {
  if (!key.includes("[")) {
    return (pathname) =>
      pathname === key || (key.endsWith("/") ? pathname.startsWith(key) : pathname.startsWith(`${key}/`));
  }

  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    "^" + escaped.replace(/\\\[[^\]]*\]/g, "[^/]+") + "(?:/.*)?$"
  );

  return (pathname) => pattern.test(pathname);
}

// Resolve the most specific matching rule (longest key wins).
function resolveRule(
  pathname: string,
  method: string
): RouteRule | null {
  const sortedRoutes = Object.keys(roleAccess).sort(
    (a, b) => b.length - a.length
  );

  for (const key of sortedRoutes) {
    if (compileRoutePattern(key)(pathname)) {
      return roleAccess[key];
    }
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Skip auth + public self-registration endpoints.
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const rule = resolveRule(pathname, method);

  // Route handlers are public HTTP endpoints. Default to authenticated access
  // for any future API route that has not yet been added to the role matrix.
  if (!rule) {
    if (pathname.startsWith("/api/") && !token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Requires authentication.
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(
      new URL(
        `/login?callbackUrl=${encodeURIComponent(pathname)}`,
        request.url
      )
    );
  }

  const userRole = token.role as string;
  const allowed = getAllowedRoles(rule, method);

  if (!allowed.includes(userRole)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(
      new URL(
        userRole === "STUDENT" ? "/dashboard" : "/unauthorized",
        request.url
      )
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/preparation/:path*",
    "/image-generator/:path*",
    "/docs/:path*",
    "/api/:path*",
  ],
};
