import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export const maxDuration = 120;
const MAX_IMPORT_ROWS = 1_000;

type ImportStudent = {
  name: string;
  username: string;
  email: string;
  gradeLevel: number;
  className: string;
  password: string;
  passwordHash: string;
};

export async function POST(req: Request) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;
    const body = await req.json();
    const rows = body?.students;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No students provided" }, { status: 400 });
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json({ error: `Import up to ${MAX_IMPORT_ROWS} students at a time` }, { status: 400 });
    }

    const normalized = rows.map((row: any, index: number) => ({
      rowNumber: index + 2,
      name: String(row.name ?? row.Name ?? "").trim(),
      username: String(row.username ?? row.Username ?? row.login ?? "").trim().toLowerCase(),
      email: String(row.email ?? row.Email ?? "").trim().toLowerCase(),
      gradeLevel: Number(row.gradeLevel ?? row.Grade),
      className: String(row.className ?? row.Class ?? "").trim(),
      password: String(row.password ?? row.Password ?? ""),
    }));
    const invalid = normalized.find((student) =>
      !student.name ||
      !/^[a-z0-9][a-z0-9._-]{2,29}$/.test(student.username) ||
      (student.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) ||
      !Number.isInteger(student.gradeLevel) ||
      student.password.length < 6,
    );
    if (invalid) {
      return NextResponse.json(
        { error: `Row ${invalid.rowNumber} needs a name, a 3–30 character username, grade, and password of at least 6 characters. Email is optional.` },
        { status: 400 },
      );
    }
    if (new Set(normalized.map((student) => student.username)).size !== normalized.length) {
      return NextResponse.json({ error: "The import contains duplicate usernames" }, { status: 400 });
    }
    for (const student of normalized) {
      if (!student.email) student.email = `${student.username}@students.nafs.invalid`;
    }
    if (new Set(normalized.map((student) => student.email)).size !== normalized.length) {
      return NextResponse.json({ error: "The import contains duplicate email addresses" }, { status: 400 });
    }

    const gradeLevels = [...new Set(normalized.map((student) => student.gradeLevel))];
    const grades = await prisma.grade.findMany({
      where: { level: { in: gradeLevels } },
      select: { id: true, level: true },
    });
    const gradeByLevel = new Map(grades.map((grade) => [grade.level, grade.id]));
    const missingGrade = gradeLevels.find((level) => !gradeByLevel.has(level));
    if (missingGrade !== undefined) {
      return NextResponse.json({ error: `Grade ${missingGrade} does not exist` }, { status: 400 });
    }

    if (user!.role === "TEACHER") {
      const assignments = await prisma.teacherAssignment.findMany({
        where: { teacherId: user!.id },
        select: { gradeId: true },
      });
      const allowedGradeIds = new Set(assignments.map((assignment) => assignment.gradeId));
      const forbiddenGrade = gradeLevels.find((level) => !allowedGradeIds.has(gradeByLevel.get(level)!));
      if (forbiddenGrade !== undefined) {
        return NextResponse.json(
          { error: `You cannot import students into Grade ${forbiddenGrade}` },
          { status: 403 },
        );
      }
    }

    const existingUsers = await prisma.user.findMany({
      where: { OR: [{ username: { in: normalized.map((student) => student.username) } }, { email: { in: normalized.map((student) => student.email) } }] },
      select: { username: true, email: true, role: true },
    });
    const protectedAccount = existingUsers.find((account) => account.role !== "STUDENT");
    if (protectedAccount) {
      return NextResponse.json(
        { error: `${protectedAccount.username} belongs to a protected non-student account` },
        { status: 409 },
      );
    }
    const emailCollision = existingUsers.find((account) => normalized.some((student) => student.email === account.email && student.username !== account.username));
    if (emailCollision) return NextResponse.json({ error: `Email ${emailCollision.email} is already attached to another username.` }, { status: 409 });

    const prepared: ImportStudent[] = await Promise.all(
      normalized.map(async (student) => ({
        ...student,
        passwordHash: await bcrypt.hash(student.password, 10),
      })),
    );

    await prisma.$transaction(async (tx) => {
      for (const student of prepared) {
        const gradeId = gradeByLevel.get(student.gradeLevel)!;
        let classId: string | null = null;
        if (student.className) {
          const classRow = await tx.class.upsert({
            where: { name_gradeId: { name: student.className, gradeId } },
            update: {},
            create: { name: student.className, gradeId },
            select: { id: true },
          });
          classId = classRow.id;
        }
        await tx.user.upsert({
          where: { username: student.username },
          update: {
            name: student.name,
            username: student.username,
            password: student.passwordHash,
            email: student.email,
            gradeId,
            classId,
          },
          create: {
            name: student.name,
            username: student.username,
            email: student.email,
            password: student.passwordHash,
            role: "STUDENT",
            gradeId,
            classId,
          },
        });
      }
    }, { timeout: 60_000 });

    return NextResponse.json({ success: true, count: prepared.length });
  } catch (error) {
    console.error("STUDENT_IMPORT_ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 },
    );
  }
}
