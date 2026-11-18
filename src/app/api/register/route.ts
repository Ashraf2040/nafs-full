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
      username,
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

    if (!name || !username || !password || !gradeLevel) {
      return NextResponse.json(
        { error: "Name, username, password, and grade are required" },
        { status: 400 }
      );
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(normalizedUsername)) {
      return NextResponse.json({ error: "Username must be 3–30 characters and use letters, numbers, dots, underscores, or hyphens." }, { status: 400 });
    }

    if (email && (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    const normalizedEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : `${normalizedUsername}@students.nafs.invalid`;

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check existing user
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { username: normalizedUsername }] },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email or username already exists" },
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
        username: normalizedUsername,
        email: normalizedEmail,
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
