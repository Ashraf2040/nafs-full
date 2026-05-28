import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      email,
      password,
      role,
      gradeLevel,
      className,
    } = body;

    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Find grade
    let gradeId: string | null = null;

    if (gradeLevel) {
      const grade = await prisma.grade.findFirst({
        where: {
          level: Number(gradeLevel),
        },
      });

      gradeId = grade?.id || null;
    }

    // Find class
    let classId: string | null = null;

    if (className && gradeId) {
      const existingClass = await prisma.class.findFirst({
        where: {
          name: className,
          gradeId,
        },
      });

      classId = existingClass?.id || null;
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        gradeId,
        classId,
      },
    });

    return NextResponse.json(user);

  } catch (error) {
    console.error("REGISTER_ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}