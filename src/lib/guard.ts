// src/lib/guard.ts
// Shared authentication & authorization helpers for API routes.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Role } from "@prisma/client";

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  gradeId?: string | null;
  classId?: string | null;
  className?: string | null;
};

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) return null;

  // JWT sessions can outlive role, grade, or class changes. Always resolve the
  // current database record at the authorization boundary so a demoted or
  // disabled account cannot keep stale privileges until its token expires.
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      gradeId: true,
      classId: true,
      class: { select: { name: true } },
    },
  });

  if (!currentUser) return null;

  return {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    role: currentUser.role,
    gradeId: currentUser.gradeId,
    classId: currentUser.classId,
    className: currentUser.class?.name ?? null,
  };
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Requires an authenticated user. Returns `{ user, response }`.
 * If `response` is non-null, return it immediately from the route.
 */
export async function requireAuth(): Promise<{
  user: AuthUser | null;
  response: NextResponse | null;
}> {
  const user = await getAuthUser();
  if (!user) return { user: null, response: unauthorized() };
  return { user, response: null };
}

/**
 * Requires an authenticated user whose role is one of `roles`.
 */
export async function requireRole(
  ...roles: Role[]
): Promise<{ user: AuthUser | null; response: NextResponse | null }> {
  const { user, response } = await requireAuth();
  if (response) return { user, response };
  if (!roles.includes(user!.role)) {
    return { user, response: forbidden() };
  }
  return { user, response: null };
}

/** Grade IDs a teacher is assigned to teach. */
export async function getTeacherGradeIds(teacherId: string): Promise<string[]> {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId },
    select: { gradeId: true },
  });
  return assignments.map((a) => a.gradeId);
}

/** Subject names a teacher is assigned to teach. */
export async function getTeacherSubjectNames(teacherId: string): Promise<string[]> {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId },
    include: { subject: { select: { name: true } } },
  });
  return [...new Set(assignments.map((a) => a.subject.name))];
}

/**
 * True when a teacher may view a given student record.
 * Admins always may. Teachers may only access students whose grade
 * they are assigned to teach.
 */
export async function canViewStudent(
  user: AuthUser,
  student: { gradeId?: string | null }
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role === "STUDENT") return false;
  const gradeIds = await getTeacherGradeIds(user.id);
  if (gradeIds.length === 0) return false;
  return Boolean(student.gradeId && gradeIds.includes(student.gradeId));
}
