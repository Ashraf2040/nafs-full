import { NextResponse } from "next/server";
import { requireRole, canViewStudent } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { getTeacherScope } from "@/lib/teacher-scope";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const subjectName = searchParams.get("subject");
    const gradeLevel = searchParams.get("grade");

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

    const grade = gradeLevel ? await prisma.grade.findFirst({ where: { level: Number(gradeLevel) } }) : student.grade;
    if (!grade || grade.id !== student.gradeId) return NextResponse.json({ error: "Invalid grade" }, { status: 400 });
    const subject = subjectName && subjectName !== "All" ? await prisma.subject.findFirst({ where: { name: subjectName } }) : null;
    if (subjectName && subjectName !== "All" && !subject) return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
    const teacherScope = user!.role === "TEACHER" ? await getTeacherScope(user!.id) : null;
    if (teacherScope && !teacherScope.assignments.some((assignment) => assignment.gradeId === grade.id && (!subject || assignment.subjectId === subject.id))) {
        return NextResponse.json({ error: "Forbidden: Subject and grade are not assigned to you" }, { status: 403 });
    }

    const scopeWhere = { gradeId: grade.id, ...(subject ? { subjectId: subject.id } : {}) };

    const allQuizzes = await prisma.quiz.findMany({
      where: teacherScope
        ? { AND: [teacherScope.quizWhere, { ...scopeWhere, isPublished: true, assessmentType: "QUIZ" }] }
        : { ...scopeWhere, isPublished: true, assessmentType: "QUIZ" },
      include: {
        _count: { select: { questions: true } },
        results: { where: { studentId: id } },
      },
      orderBy: { createdAt: "desc" },
    });

    const allPractices = await prisma.quiz.findMany({
      where: teacherScope
        ? { AND: [teacherScope.quizWhere, { ...scopeWhere, isPublished: true, assessmentType: "PRACTICE" }] }
        : { ...scopeWhere, isPublished: true, assessmentType: "PRACTICE" },
      include: { _count: { select: { questions: true } }, practiceCompletions: { where: { studentId: id } } },
      orderBy: { createdAt: "desc" },
    });
    const completedPractices = allPractices.filter(p => p.practiceCompletions.length > 0).map(p => ({ id: p.id, title: p.title, completedAt: p.practiceCompletions[0].completedAt, questionsCount: p._count.questions }));
    const incompletePractices = allPractices.filter(p => p.practiceCompletions.length === 0).map(p => ({ id: p.id, title: p.title, questionsCount: p._count.questions, createdAt: p.createdAt }));

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
      practiceSummary: { total: allPractices.length, completed: completedPractices.length, missing: incompletePractices.length },
      completedPractices,
      incompletePractices,
    });
  } catch (error) {
    console.error("STUDENT_REPORT_ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}
