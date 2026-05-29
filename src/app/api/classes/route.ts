// src/app/api/classes/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET - Fetch classes (optionally filtered by grade)
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const gradeId = searchParams.get("gradeId");
        const gradeLevel = searchParams.get("gradeLevel");

        const where: any = {};
        
        if (gradeId) {
            where.gradeId = gradeId;
        } else if (gradeLevel) {
            const grade = await prisma.grade.findFirst({
                where: { level: parseInt(gradeLevel) }
            });
            if (grade) where.gradeId = grade.id;
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
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        if (userRole === "STUDENT") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

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