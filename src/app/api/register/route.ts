import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";

// Self-registration may NEVER elevate privileges. Public sign-up always
// creates a STUDENT account; admin/teacher accounts are created by admins
// through the protected management routes only.
const ALLOWED_ROLES = ["STUDENT"] as const;

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

    // Force role to STUDENT — never trust the client for role assignment
    const requestedRole = typeof role === "string" ? role.toUpperCase() : "STUDENT";
    if (!ALLOWED_ROLES.includes(requestedRole as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json(
        { error: "Invalid role for self-registration" },
        { status: 400 }
      );
    }

    if (!name || !email || !password || !gradeLevel) {
      return NextResponse.json(
        { error: "Name, email, password, and grade are required" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
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

    const grade = await prisma.grade.findFirst({ where: { level: Number(gradeLevel) } });
    if (!grade) return NextResponse.json({ error: "Selected grade is unavailable" }, { status: 400 });
    gradeId = grade.id;

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
        email: String(email).toLowerCase(),
        password: hashedPassword,
        role: "STUDENT",
        gradeId,
        classId,
      },
    });

    // Never leak the password hash back to the client
    const { password: _pw, ...safeUser } = user;

    return NextResponse.json(safeUser);

  } catch (error) {
    console.error("REGISTER_ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
