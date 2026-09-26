// src/app/api/grades/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

// GET - Fetch all grades or a specific grade by level
export async function GET(req: Request) {
    try {
        const { user, response } = await requireRole("STUDENT", "TEACHER", "ADMIN");
        if (response) return response;

        const { searchParams } = new URL(req.url);
        const level = searchParams.get("level");

        const allowedGradeIds = user!.role === "TEACHER"
            ? (await prisma.teacherAssignment.findMany({ where: { teacherId: user!.id }, select: { gradeId: true } })).map((a) => a.gradeId)
            : user!.role === "STUDENT" && user!.gradeId
                ? [user!.gradeId]
                : null;

        if (level) {
            const grade = await prisma.grade.findFirst({
                where: { level: parseInt(level), ...(allowedGradeIds ? { id: { in: allowedGradeIds } } : {}) },
                include: {
                    _count: { select: { users: true, classes: true } }
                }
            });
            if (!grade) {
                return NextResponse.json({ error: "Grade not found" }, { status: 404 });
            }
            return NextResponse.json(grade);
        }

        const grades = await prisma.grade.findMany({
            where: allowedGradeIds ? { id: { in: allowedGradeIds } } : {},
            include: {
                _count: { select: { users: true, classes: true } }
            },
            orderBy: { level: "asc" }
        });

        return NextResponse.json(grades);
    } catch (error) {
        console.error("GRADES_FETCH_ERROR:", error);
        return NextResponse.json({ error: "Failed to fetch grades" }, { status: 500 });
    }
}

// POST - Create a new grade
export async function POST(req: Request) {
    try {
        const { response } = await requireRole("ADMIN");
        if (response) return response;

        const body = await req.json();
        const { level, name } = body;

        if (level === undefined || level === null) {
            return NextResponse.json({ error: "Grade level is required" }, { status: 400 });
        }

        const levelNum = parseInt(level);
        if (isNaN(levelNum) || levelNum < 1 || levelNum > 12) {
            return NextResponse.json({ error: "Grade level must be between 1 and 12" }, { status: 400 });
        }

        const existing = await prisma.grade.findFirst({
            where: { level: levelNum }
        });

        if (existing) {
            return NextResponse.json(
                { error: `Grade ${levelNum} already exists` }, 
                { status: 409 }
            );
        }

        const newGrade = await prisma.grade.create({
            data: {
                level: levelNum,
                name: name?.trim() || `Grade ${levelNum}`
            }
        });

        return NextResponse.json({ success: true, grade: newGrade });
    } catch (error) {
        console.error("GRADE_CREATE_ERROR:", error);
        return NextResponse.json({ error: "Failed to create grade" }, { status: 500 });
    }
}
