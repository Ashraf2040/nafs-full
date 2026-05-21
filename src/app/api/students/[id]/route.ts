import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRole = (session.user as any).role;
  const userId = (session.user as any).id;
  const { id } = await params;

  // Students can only edit themselves; admins/teachers can edit any student
  if (userRole === "STUDENT" && userId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { gradeLevel, className } = await req.json();

  // Convert grade level → grade id
  let gradeId: string | null = null;
  if (gradeLevel) {
    const grade = await prisma.grade.findUnique({
      where: { level: parseInt(gradeLevel.toString()) },
    });
    if (grade) gradeId = grade.id;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      gradeId: gradeId || null,
      className: className?.trim() || null,
    },
    include: { grade: true },
  });

  return NextResponse.json(updated);
}