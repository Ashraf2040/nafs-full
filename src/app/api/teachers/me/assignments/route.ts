import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "No user ID in session" }, { status: 400 });
    }

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