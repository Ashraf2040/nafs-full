// src/app/api/students/route.ts
import { NextResponse } from "next/server";
import { requireRole, getTeacherGradeIds } from "@/lib/guard";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { user, response } = await requireRole("TEACHER", "ADMIN");
        if (response) return response;

        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "500"), 500);
        const offset = parseInt(searchParams.get("offset") || "0");

        const where: any = { role: "STUDENT" };

        // TEACHERS may only list students in the grades they are assigned to
        if (user!.role === "TEACHER") {
            const gradeIds = await getTeacherGradeIds(user!.id);
            if (gradeIds.length === 0) {
                return NextResponse.json({ students: [], total: 0 });
            }
            where.gradeId = { in: gradeIds };
        }

        const [students, total] = await Promise.all([
            prisma.user.findMany({
                where,
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
            prisma.user.count({ where }),
        ]);

        const studentIds = students.map(s => s.id);
        const teacherAssignments = user!.role === "TEACHER"
            ? await prisma.teacherAssignment.findMany({
                where: { teacherId: user!.id },
                select: { subjectId: true, gradeId: true },
              })
            : [];
        const avgScores = studentIds.length > 0
            ? await prisma.result.groupBy({
                by: ["studentId"],
                where: {
                    studentId: { in: studentIds },
                    ...(user!.role === "TEACHER"
                        ? { quiz: { OR: teacherAssignments.map((assignment) => ({ subjectId: assignment.subjectId, gradeId: assignment.gradeId })) } }
                        : {}),
                },
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
        const { user, response } = await requireRole("TEACHER", "ADMIN");
        if (response) return response;

        const body = await req.json();
        const { name, email, gradeLevel, classId, password } = body;

        if (!name || !email || !gradeLevel) {
            return NextResponse.json(
                { error: "Name, email, and grade level are required" },
                { status: 400 }
            );
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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

        if (user!.role === "TEACHER") {
            const assigned = await prisma.teacherAssignment.findFirst({
                where: { teacherId: user!.id, gradeId: grade.id },
                select: { id: true },
            });
            if (!assigned) {
                return NextResponse.json({ error: "You can only add students to an assigned grade" }, { status: 403 });
            }
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

        if (typeof password !== "string" || password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const student = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                password: hashedPassword,
                role: "STUDENT",
                gradeId: grade.id,
                classId: finalClassId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                gradeId: true,
                classId: true,
                grade: true,
                class: true,
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
