import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;

    const userId = user!.id;

    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: userId },
      include: { 
        subject: { select: { id: true, name: true } }, 
        grade: { select: { id: true, level: true } } 
      },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("TEACHER_ASSIGNMENTS_ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" }, 
      { status: 500 }
    );
  }
}