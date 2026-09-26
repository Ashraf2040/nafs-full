import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";

export async function GET() {
  const { user, response } = await requireRole("TEACHER", "ADMIN");
  if (response) return response;

  const userId = user!.id;
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId: userId },
    include: { subject: true, grade: true },
  });
  return NextResponse.json({ assignments });
}