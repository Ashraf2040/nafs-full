// src/app/api/students/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET - Fetch single student
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const student = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      include: {
        grade: true,
        class: true,
        submissions: {
          include: { quiz: { include: { subject: true } } },
          orderBy: { completedAt: "desc" }
        }
      }
    });

    if (!student || student.role !== "STUDENT") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...student,
      gradeLevel: student.grade?.level ?? null,
      className: student.class?.name ?? null
    });
  } catch (error) {
    console.error("STUDENT_GET_ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 });
  }
}

// PUT - Update student (grade & class)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    
    // Accept either gradeLevel or gradeId
    const { gradeLevel, gradeId, classId } = body;

    let finalGradeId = gradeId;
    
    // If gradeLevel provided, find the grade ID
    if (gradeLevel && !gradeId) {
      const grade = await prisma.grade.findFirst({
        where: { level: parseInt(gradeLevel.toString()) }
      });
      if (grade) finalGradeId = grade.id;
    }

    // Validate class belongs to grade if both provided
    if (classId && finalGradeId) {
      const classExists = await prisma.class.findFirst({
        where: { 
          id: classId, 
          gradeId: finalGradeId 
        }
      });
      if (!classExists) {
        return NextResponse.json(
          { error: "Selected class does not belong to the chosen grade" },
          { status: 400 }
        );
      }
    }

    // Build update data dynamically - only include fields that exist in schema
    const updateData: any = {};
    
    if (finalGradeId !== undefined) {
      updateData.grade = { connect: finalGradeId ? { id: finalGradeId } : undefined };
      if (!finalGradeId) updateData.grade = { disconnect: true };
    }
    
    if (classId !== undefined) {
      updateData.class = { connect: classId ? { id: classId } : undefined };
      if (!classId) updateData.class = { disconnect: true };
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        grade: true,
        class: true
      }
    });

    return NextResponse.json({
      ...updated,
      gradeLevel: updated.grade?.level ?? null,
      className: updated.class?.name ?? null
    });
  } catch (error) {
    console.error("STUDENT_UPDATE_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update student" }, 
      { status: 500 }
    );
  }
}

// DELETE - Remove student
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;
    
    await prisma.user.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("STUDENT_DELETE_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete student" }, 
      { status: 500 }
    );
  }
}