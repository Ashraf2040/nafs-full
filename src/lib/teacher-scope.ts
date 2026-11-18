import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Exact subject/grade assignments and quiz visibility for one teacher. */
export async function getTeacherScope(teacherId: string) {
  const [assignments, admins] = await Promise.all([
    prisma.teacherAssignment.findMany({
      where: { teacherId },
      select: {
        subjectId: true,
        gradeId: true,
        subject: { select: { name: true } },
        grade: { select: { level: true } },
      },
    }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }),
  ]);

  const adminIds = admins.map((admin) => admin.id);
  const creatorIds = [teacherId, ...adminIds];
  const quizWhere: Prisma.QuizWhereInput = assignments.length
    ? {
        AND: [
          { OR: assignments.map(({ subjectId, gradeId }) => ({ subjectId, gradeId })) },
          { OR: [
            { creatorId: teacherId },
            { creatorId: { in: adminIds }, isPublished: true },
            { isShared: true, isPublished: true },
          ] },
        ],
      }
    : { id: "__no_teacher_assignments__" };

  return { assignments, adminIds, creatorIds, quizWhere };
}
