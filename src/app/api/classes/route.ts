// src/app/api/classes/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

// GET - Fetch classes (optionally filtered by grade)
export async function GET(req: Request) {
    try {
        const { user, response } = await requireRole("STUDENT", "TEACHER", "ADMIN");
        if (response) return response;

        const { searchParams } = new URL(req.url);
        const gradeId = searchParams.get("gradeId");
        const gradeLevel = searchParams.get("gradeLevel");

        const allowedGradeIds = user!.role === "TEACHER"
            ? (await prisma.teacherAssignment.findMany({ where: { teacherId: user!.id }, select: { gradeId: true } })).map((a) => a.gradeId)
            : user!.role === "STUDENT" && user!.gradeId
                ? [user!.gradeId]
                : null;
        const where: any = allowedGradeIds ? { gradeId: { in: allowedGradeIds } } : {};
        
        if (gradeId) {
            if (!allowedGradeIds || allowedGradeIds.includes(gradeId)) where.gradeId = gradeId;
            else return NextResponse.json([]);
        } else if (gradeLevel) {
            const grade = await prisma.grade.findFirst({
                where: { level: parseInt(gradeLevel) }
            });
            if (grade && (!allowedGradeIds || allowedGradeIds.includes(grade.id))) where.gradeId = grade.id;
            else return NextResponse.json([]);
        }

        const classes = await prisma.class.findMany({
            where,
            include: {
                grade: true,
                _count: { select: { users: true } }
            },
            orderBy: { name: "asc" }
        });

        return NextResponse.json(classes);
    } catch (error) {
        console.error("CLASSES_FETCH_ERROR:", error);
        return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
    }
}

// POST - Create a new class
export async function POST(req: Request) {
    try {
        const { user, response } = await requireRole("TEACHER", "ADMIN");
        if (response) return response;

        const body = await req.json();
        const { name, gradeId, gradeLevel } = body;

        if (!name || name.trim() === "") {
            return NextResponse.json({ error: "Class name is required" }, { status: 400 });
        }

        let finalGradeId = gradeId;
        
        if (!finalGradeId && gradeLevel) {
            const grade = await prisma.grade.findFirst({
                where: { level: parseInt(gradeLevel) }
            });
            if (!grade) {
                return NextResponse.json({ error: "Invalid grade level" }, { status: 400 });
            }
            finalGradeId = grade.id;
        }

        if (!finalGradeId) {
            return NextResponse.json({ error: "Grade is required" }, { status: 400 });
        }

        if (user!.role === "TEACHER") {
            const assignment = await prisma.teacherAssignment.findFirst({
                where: { teacherId: user!.id, gradeId: finalGradeId },
                select: { id: true },
            });
            if (!assignment) {
                return NextResponse.json({ error: "You can only create classes in an assigned grade" }, { status: 403 });
            }
        }

        const existing = await prisma.class.findFirst({
            where: { name: name.trim(), gradeId: finalGradeId }
        });

        if (existing) {
            return NextResponse.json(
                { error: "Class already exists in this grade" }, 
                { status: 409 }
            );
        }

        const newClass = await prisma.class.create({
            data: {
                name: name.trim(),
                gradeId: finalGradeId
            },
            include: { grade: true }
        });

        return NextResponse.json({ success: true, class: newClass });
    } catch (error) {
        console.error("CLASS_CREATE_ERROR:", error);
        return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
    }
}
