// src/app/api/students/import/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  const { students } = await req.json();

  try {
    const invalidStudents = students.filter(
      (s: any) => !s.password || !s.name || !s.email || !s.gradeLevel
    );

    if (invalidStudents.length > 0) {
      return NextResponse.json(
        { error: "All students must have Name, Email, Grade, and Password fields." },
        { status: 400 }
      );
    }

    const operations = students.map(async (s: any) => {
      const name = s.name || s.Name;
      const email = s.email || s.Email;
      const gradeLevel = s.gradeLevel !== undefined ? s.gradeLevel : s.Grade;
      const className = s.className !== undefined ? s.className : s.Class;
      const password = s.password || s.Password;

      const hashedPassword = bcrypt.hashSync(password, 10);

      // 🔥 convert gradeLevel → gradeId
      const grade = await prisma.grade.findFirst({
        where: {
          level: Number(gradeLevel),
        },
      });

      if (!grade) {
        throw new Error(`Grade not found for level: ${gradeLevel}`);
      }

      return prisma.user.upsert({
        where: { email },
        update: {
          gradeId: grade.id,
          className: className || null,
          name,
          ...(password ? { password: hashedPassword } : {}),
        },
        create: {
          name,
          email,
          password: hashedPassword,
          role: "STUDENT",
          gradeId: grade.id,
          className: className || null,
        },
      });
    });

    await Promise.all(operations);

    return NextResponse.json({
      success: true,
      count: students.length,
    });
  } catch (error) {
    console.error("IMPORT_ERROR:", error);
    return NextResponse.json(
      { error: "Database error" },
      { status: 500 }
    );
  }
}