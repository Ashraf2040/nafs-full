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

        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "500"), 500);
        const offset = parseInt(searchParams.get("offset") || "0");

        const [students, total] = await Promise.all([
            prisma.user.findMany({
                where: { role: "STUDENT" },
                include: {
                    grade: true,
                    class: true,
                    _count: {
                        select: { submissions: true }
                    }
                },
                orderBy: { name: "asc" },
                take: limit,
                skip: offset,
            }),
            prisma.user.count({ where: { role: "STUDENT" } }),
        ]);

        const studentIds = students.map(s => s.id);
        const avgScores = studentIds.length > 0
            ? await prisma.result.groupBy({
                by: ["studentId"],
                where: { studentId: { in: studentIds } },
                _avg: { score: true },
            })
            : [];

        const avgScoreMap = new Map(avgScores.map(a => [a.studentId, a._avg.score]));

        const formattedStudents = students.map(s => ({
            id: s.id,
            name: s.name,
            email: s.email,
            gradeLevel: s.grade?.level ?? null,
            gradeId: s.gradeId,
            classId: s.classId,
            className: s.class?.name ?? null,
            role: s.role,
            _count: { submissions: s._count.submissions },
            avgScore: avgScoreMap.get(s.id) ?? null,
        }));

        return NextResponse.json({ students: formattedStudents, total });
    } catch (error) {
        console.error("STUDENTS_FETCH_ERROR:", error);
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }
}

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
        const { name, email, gradeLevel, classId, password } = body;

        if (!name || !email || !gradeLevel) {
            return NextResponse.json(
                { error: "Name, email, and grade level are required" },
                { status: 400 }
            );
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json(
                { error: "A student with this email already exists" },
                { status: 409 }
            );
        }

        const grade = await prisma.grade.findFirst({
            where: { level: Number(gradeLevel) },
        });
        if (!grade) {
            return NextResponse.json({ error: "Invalid grade level" }, { status: 400 });
        }

        let finalClassId = classId || null;
        if (finalClassId) {
            const classExists = await prisma.class.findFirst({
                where: { id: finalClassId, gradeId: grade.id }
            });
            if (!classExists) {
                return NextResponse.json(
                    { error: "Selected class does not belong to the chosen grade" },
                    { status: 400 }
                );
            }
        }

        const hashedPassword = await bcrypt.hash(password || "Student123!", 10);

        const student = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "STUDENT",
                gradeId: grade.id,
                classId: finalClassId,
            },
            include: {
                grade: true,
                class: true
            }
        });

        return NextResponse.json({ 
            success: true, 
            student: {
                ...student,
                gradeLevel: student.grade?.level,
                className: student.class?.name
            }
        });

    } catch (error) {
        console.error("STUDENT_CREATE_ERROR:", error);
        return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
    }
}