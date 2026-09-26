import { NextResponse } from "next/server";
import { requireRole, canViewStudent } from "@/lib/guard";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const subjectName = searchParams.get("subject");
    const gradeLevel = searchParams.get("grade");

    if (!subjectName || !gradeLevel) {
      return NextResponse.json({ error: "subject and grade are required" }, { status: 400 });
    }

    const student = await prisma.user.findUnique({
      where: { id },
      include: { grade: true, class: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (!(await canViewStudent(user!, student))) {
      return NextResponse.json(
        { error: "Forbidden: Not assigned to this student's grade" },
        { status: 403 }
      );
    }

    const subject = await prisma.subject.findFirst({ where: { name: subjectName } });
    const grade = await prisma.grade.findFirst({ where: { level: Number(gradeLevel) } });
    if (!subject || !grade) {
      return NextResponse.json({ error: "Invalid subject or grade" }, { status: 400 });
    }

    if (user!.role === "TEACHER") {
      const assignment = await prisma.teacherAssignment.findUnique({
        where: {
          teacherId_subjectId_gradeId: {
            teacherId: user!.id,
            subjectId: subject.id,
            gradeId: grade.id,
          },
        },
        select: { id: true },
      });
      if (!assignment) {
        return NextResponse.json({ error: "Forbidden: Subject and grade are not assigned to you" }, { status: 403 });
      }
    }

    const subjectId = subject.id;
    const gradeId = grade.id;

    const allQuizzes = await prisma.quiz.findMany({
      where: { subjectId, gradeId, isPublished: true },
      include: {
        _count: { select: { questions: true } },
        results: { where: { studentId: id } },
      },
      orderBy: { createdAt: "desc" },
    });

    const completedQuizzes = allQuizzes.filter(q => q.results.length > 0).map(q => ({
      id: q.id,
      title: q.title,
      score: q.results[0].score,
      totalPoints: q.results[0].totalPoints,
      completedAt: q.results[0].completedAt,
      questionsCount: q._count.questions,
      timeSpentSeconds: q.results[0].timeSpentSeconds,
      resultId: q.results[0].id,
    }));

    const incompleteQuizzes = allQuizzes.filter(q => q.results.length === 0).map(q => ({
      id: q.id,
      title: q.title,
      questionsCount: q._count.questions,
      createdAt: q.createdAt,
    }));

    const totalQuizzes = allQuizzes.length;
    const totalCompleted = completedQuizzes.length;
    const totalScore = completedQuizzes.reduce((sum, q) => sum + q.score, 0);
    const totalPoints = completedQuizzes.reduce((sum, q) => sum + q.totalPoints, 0);
    const avgScore = totalCompleted > 0 ? Math.round(totalScore / totalCompleted) : null;

    const completedWithPct = completedQuizzes.map(q => ({
      ...q,
      percentage: Math.round(q.score),
    }));

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        gradeLevel: student.grade?.level,
        className: student.class?.name,
      },
      summary: {
        totalQuizzes,
        totalCompleted,
        totalIncomplete: totalQuizzes - totalCompleted,
        avgScore,
        totalScore,
        totalPoints,
      },
      completedQuizzes: completedWithPct,
      incompleteQuizzes,
    });
  } catch (error) {
    console.error("STUDENT_REPORT_ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}
