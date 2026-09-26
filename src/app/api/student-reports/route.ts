import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const subjectName = searchParams.get("subject");
    const gradeLevel = searchParams.get("grade");
    const classId = searchParams.get("classId");

    const where: any = { role: "STUDENT" };

    let teacherAssignments: Array<{ subjectId: string; gradeId: string }> = [];
    // TEACHERS may only report on students and results within exact assignments.
    if (user!.role === "TEACHER") {
      teacherAssignments = await prisma.teacherAssignment.findMany({
        where: { teacherId: user!.id },
        select: { subjectId: true, gradeId: true },
      });
      const gradeIds = [...new Set(teacherAssignments.map((assignment) => assignment.gradeId))];
      if (gradeIds.length === 0) {
        return NextResponse.json({ students: [] });
      }
      where.gradeId = { in: gradeIds };
    }

    if (gradeLevel) {
      const grade = await prisma.grade.findFirst({ where: { level: Number(gradeLevel) } });
      if (!grade) return NextResponse.json({ students: [] });
      if (user!.role === "TEACHER" && !teacherAssignments.some((assignment) => assignment.gradeId === grade.id)) {
        return NextResponse.json({ students: [] });
      }
      where.gradeId = grade.id;
    }

    if (classId) {
      where.classId = classId;
    }

    const students = await prisma.user.findMany({
      where,
      include: {
        grade: true,
        class: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { name: "asc" },
    });

    const studentIds = students.map(s => s.id);
    const avgScoreMap = new Map<string, number | null>();
    let quizCountMap = new Map<string, number>();

    if (studentIds.length > 0) {
      const resultFilter: any = {};
      if (user!.role === "TEACHER") {
        resultFilter.quiz = {
          OR: teacherAssignments.map((assignment) => ({
            subjectId: assignment.subjectId,
            gradeId: assignment.gradeId,
          })),
        };
      }
      if (subjectName) {
        const subject = await prisma.subject.findFirst({ where: { name: subjectName } });
        if (subject) {
          resultFilter.quiz = {
            AND: [resultFilter.quiz || {}, { subjectId: subject.id }],
          };
          if (gradeLevel) {
            const grade = await prisma.grade.findFirst({ where: { level: Number(gradeLevel) } });
            if (grade) resultFilter.quiz.AND.push({ gradeId: grade.id });
          }
        }
      }

      const [sums, counts] = await Promise.all([
        prisma.result.groupBy({
          by: ["studentId"],
          where: { studentId: { in: studentIds }, ...resultFilter },
          _avg: { score: true },
        }),
        prisma.result.groupBy({
          by: ["studentId"],
          where: { studentId: { in: studentIds }, ...resultFilter },
          _count: { id: true },
        }),
      ]);

      for (const s of sums) {
        avgScoreMap.set(s.studentId, s._avg.score == null ? null : Math.round(s._avg.score));
      }
      quizCountMap = new Map(counts.map(a => [a.studentId, a._count.id]));
    }

    const formatted = students.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      gradeLevel: s.grade?.level ?? null,
      className: s.class?.name ?? null,
      completedQuizzes: quizCountMap.get(s.id) ?? 0,
      avgScore: avgScoreMap.get(s.id) ?? null,
    }));

    return NextResponse.json({ students: formatted });
  } catch (error) {
    console.error("STUDENT_REPORTS_FETCH_ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}
