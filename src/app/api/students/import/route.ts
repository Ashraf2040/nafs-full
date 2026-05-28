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

    const results = [];

    for (const s of students) {
      const name = s.name || s.Name;
      const email = s.email || s.Email;
      const gradeLevel = s.gradeLevel !== undefined ? s.gradeLevel : s.Grade;
      const className = s.className !== undefined ? s.className : s.Class;
      const password = s.password || s.Password;

      const hashedPassword = bcrypt.hashSync(password, 10);

      // Find grade
      const grade = await prisma.grade.findFirst({
        where: { level: Number(gradeLevel) },
      });

      if (!grade) {
        throw new Error(`Grade not found for level: ${gradeLevel}`);
      }

      // Handle class
      let classId = null;
      if (className) {
        const existingClass = await prisma.class.findFirst({
          where: { name: className, gradeId: grade.id }
        });
        if (existingClass) {
          classId = existingClass.id;
        } else {
          const newClass = await prisma.class.create({
            data: { name: className, gradeId: grade.id }
          });
          classId = newClass.id;
        }
      }

      const student = await prisma.user.upsert({
        where: { email },
        update: {
          gradeId: grade.id,
          classId,
          name,
          ...(password ? { password: hashedPassword } : {}),
        },
        create: {
          name,
          email,
          password: hashedPassword,
          role: "STUDENT",
          gradeId: grade.id,
          classId,
        },
      });
      
      results.push(student);
    }

    return NextResponse.json({
      success: true,
      count: results.length,
    });
  } catch (error) {
    console.error("IMPORT_ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database error" },
      { status: 500 }
    );
  }
}