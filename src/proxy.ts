import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Route permissions — MOST SPECIFIC routes must be listed FIRST
const roleAccess: Record<string, string[]> = {
  "/api/teachers/me/assignments": ["ADMIN", "TEACHER"],
  "/api/teachers/me": ["ADMIN", "TEACHER"],

  "/api/quizzes/save": ["ADMIN", "TEACHER"],
  "/api/quizzes/": ["ADMIN", "TEACHER", "STUDENT"],

  "/api/teachers": ["ADMIN"],
  "/api/quizzes": ["ADMIN", "TEACHER"],
  "/api/students/import": ["ADMIN", "TEACHER"],
  "/api/outcomes/upload": ["ADMIN", "TEACHER"],
  "/api/outcomes": ["ADMIN", "TEACHER"],

  "/dashboard/teachers": ["ADMIN"],
  "/dashboard/subjects": ["ADMIN", "TEACHER"],
  "/dashboard/students": ["ADMIN", "TEACHER"],
  "/dashboard/statistics": ["ADMIN", "TEACHER"],
  "/dashboard/certificates": ["ADMIN", "TEACHER", "STUDENT"],
  "/dashboard/settings": ["ADMIN", "TEACHER", "STUDENT"],
  "/dashboard/quizzes/solve": ["ADMIN", "TEACHER", "STUDENT"],
  "/dashboard/quizzes": ["ADMIN", "TEACHER", "STUDENT"],
  "/dashboard": ["ADMIN", "TEACHER", "STUDENT"],
};

const protectedRoutes = Object.keys(roleAccess);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isProtected = protectedRoutes.some((r) =>
    pathname.startsWith(r)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.redirect(
      new URL(
        `/login?callbackUrl=${encodeURIComponent(pathname)}`,
        request.url
      )
    );
  }

  const userRole = token.role as string;

  const sortedRoutes = Object.entries(roleAccess).sort(
    ([a], [b]) => b.length - a.length
  );

  for (const [route, allowed] of sortedRoutes) {
    if (pathname.startsWith(route)) {
      if (!allowed.includes(userRole)) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
          );
        }

        return NextResponse.redirect(
          new URL(
            userRole === "STUDENT"
              ? "/dashboard"
              : "/unauthorized",
            request.url
          )
        );
      }

      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/preparation/:path*",
    "/api/teachers/:path*",
    "/api/quizzes/:path*",
    "/api/quizzes/save",
    "/api/students/import",
    "/api/outcomes/upload",
    "/api/outcomes/:path*",
  ],
};