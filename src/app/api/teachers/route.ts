import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    include: {
      assignments: { include: { subject: true, grade: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(teachers);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, password, assignments } = await req.json();
  if (!name || !email || !password || !assignments?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  for (const a of assignments) {
    if (!a.gradeIds?.length) {
      return NextResponse.json({ error: "Select grades for each subject" }, { status: 400 });
    }
  }

  // Validate IDs exist in DB
  const subjectIds = assignments.map((a: any) => a.subjectId);
  const gradeIds = assignments.flatMap((a: any) => a.gradeIds);

  const [dbSubjects, dbGrades] = await Promise.all([
    prisma.subject.findMany({ where: { id: { in: subjectIds } } }),
    prisma.grade.findMany({ where: { id: { in: gradeIds } } }),
  ]);

  if (dbSubjects.length !== new Set(subjectIds).size) {
    return NextResponse.json({ error: "One or more invalid subjects" }, { status: 400 });
  }
  if (dbGrades.length !== new Set(gradeIds).size) {
    return NextResponse.json({ error: "One or more invalid grades" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

  // Flatten to one TeacherAssignment per subject-grade pair
  const assignmentData = assignments.flatMap((a: any) =>
    a.gradeIds.map((gradeId: string) => ({
      subjectId: a.subjectId,
      gradeId,
    }))
  );

  const hashed = await bcrypt.hash(password, 12);
  const teacher = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: "TEACHER",
      assignments: { create: assignmentData },
    },
    include: {
      assignments: { include: { subject: true, grade: true } },
    },
  });

  return NextResponse.json(teacher, { status: 201 });
}