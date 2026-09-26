import { NextResponse } from "next/server";
import { requireRole, canViewStudent } from "@/lib/guard";
import prisma from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;

    const { id: studentId } = await params;
    const { quizId } = await req.json();

    if (!quizId) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }

    // Teachers may only republish for students in their assigned grades
    if (user!.role === "TEACHER") {
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true, role: true, gradeId: true },
      });
      if (!student || !(await canViewStudent(user!, student))) {
        return NextResponse.json(
          { error: "Forbidden: Not assigned to this student's grade" },
          { status: 403 }
        );
      }
    }

    const existingResult = await prisma.result.findFirst({
      where: { studentId, quizId },
      select: { id: true },
    });

    if (!existingResult) {
      return NextResponse.json({ message: "No result found for this quiz and student" }, { status: 404 });
    }

    await prisma.studentAnswer.deleteMany({ where: { resultId: existingResult.id } });
    await prisma.result.delete({ where: { id: existingResult.id } });

    return NextResponse.json({ success: true, message: "Quiz republished. Student can now retake it." });
  } catch (error) {
    console.error("REPUBLISH_ERROR:", error);
    return NextResponse.json({ error: "Failed to republish quiz" }, { status: 500 });
  }
}
