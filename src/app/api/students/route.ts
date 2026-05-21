// src/app/api/students/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as any).role;

        if (userRole === "STUDENT") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const students = await prisma.user.findMany({
            where: { role: "STUDENT" },
            include: {
                submissions: {
                    select: {
                        score: true,
                        quizId: true,
                    }
                },
                _count: {
                    select: { submissions: true }
                }
            },
            orderBy: { name: "asc" }
        });

        return NextResponse.json(students);
    } catch (error) {
        console.error("STUDENTS_FETCH_ERROR:", error);
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }
}

// POST - Create student
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        if (userRole === "STUDENT") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { name, email, gradeLevel, className, password } = body;

        if (!name || !email || !gradeLevel) {
            return NextResponse.json(
                { error: "Name, email, and grade level are required" },
                { status: 400 }
            );
        }

        const existing = await prisma.user.findUnique({
            where: { email }
        });

        if (existing) {
            return NextResponse.json(
                { error: "A student with this email already exists" },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password || "Student123!", 10);

        // 🔥 convert gradeLevel → gradeId
        const grade = await prisma.grade.findFirst({
            where: {
                level: Number(gradeLevel),
            },
        });

        if (!grade) {
            return NextResponse.json(
                { error: "Invalid grade level" },
                { status: 400 }
            );
        }

        const student = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "STUDENT",
                gradeId: grade.id,
                className: className || null,
            }
        });

        return NextResponse.json({ success: true, student });

    } catch (error) {
        console.error("STUDENT_CREATE_ERROR:", error);
        return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
    }
}