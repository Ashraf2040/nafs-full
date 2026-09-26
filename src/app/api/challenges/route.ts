import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { parseChallengeCriteria } from "@/lib/challenges";

function buildChallengeOptions(rows: Array<{ subject: string; grade: number; subDomain: string | null }>) {
  const options = new Map<string, { subject: string; grade: number; domains: string[] }>();
  for (const row of rows) {
    const key = `${row.subject}::${row.grade}`;
    const option = options.get(key) ?? { subject: row.subject, grade: row.grade, domains: [] };
    if (row.subDomain && !option.domains.includes(row.subDomain)) option.domains.push(row.subDomain);
    options.set(key, option);
  }
  return [...options.values()].map((option) => ({ ...option, domains: option.domains.sort() }));
}

export async function GET(req: Request) {
  try {
    const { user, response } = await requireRole("STUDENT", "TEACHER", "ADMIN");
    if (response) return response;
    const userId = user!.id;
    const userRole = user!.role;

    if (userRole === "STUDENT") {
      const now = new Date();
      const studentGrade = user!.gradeId
        ? await prisma.grade.findUnique({ where: { id: user!.gradeId }, select: { level: true } })
        : null;
      if (!studentGrade) return NextResponse.json({ challenges: [], options: null });
      const challenges = await prisma.challenge.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
          criteria: { path: ["grade"], equals: studentGrade.level },
        },
        include: {
          participations: { where: { studentId: userId } },
          _count: { select: { participations: true } },
        },
        orderBy: { startDate: "desc" },
      });
      return NextResponse.json({ challenges, options: null });
    }

    const participationsInclude = {
      participations: {
        include: { student: { select: { id: true, name: true } } },
        orderBy: { progress: "desc" } as const,
      },
    };

    if (userRole === "TEACHER") {
      const [challenges, assignments] = await Promise.all([
        prisma.challenge.findMany({
          where: { teacherId: userId },
          include: {
            ...participationsInclude,
            _count: { select: { participations: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.teacherAssignment.findMany({
          where: { teacherId: userId },
          select: {
            subject: { select: { name: true } },
            grade: { select: { level: true } },
          },
          orderBy: [{ subject: { name: "asc" } }, { grade: { level: "asc" } }],
        }),
      ]);
      const outcomeRows = assignments.length > 0
        ? await prisma.learningOutcome.findMany({
            where: {
              OR: assignments.map((assignment) => ({
                subject: { equals: assignment.subject.name, mode: "insensitive" as const },
                grade: assignment.grade.level,
              })),
            },
            distinct: ["subject", "grade", "subDomain"],
            select: { subject: true, grade: true, subDomain: true },
          })
        : [];
      return NextResponse.json({ challenges, options: buildChallengeOptions(outcomeRows) });
    }

    // ADMIN: see all challenges
    const [challenges, outcomeRows] = await Promise.all([
      prisma.challenge.findMany({
        include: {
          ...participationsInclude,
          _count: { select: { participations: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.learningOutcome.findMany({
        distinct: ["subject", "grade", "subDomain"],
        select: { subject: true, grade: true, subDomain: true },
        orderBy: [{ subject: "asc" }, { grade: "asc" }, { subDomain: "asc" }],
      }),
    ]);
    return NextResponse.json({
      challenges,
      options: buildChallengeOptions(outcomeRows),
    });
  } catch (error: any) {
    console.error("CHALLENGES_GET_ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;
    const userId = user!.id;
    const body = await req.json();
    const { title, description, rewardBadge, startDate, endDate } = body;
    const criteria = parseChallengeCriteria(body.criteria);

    if (typeof title !== "string" || !title.trim() || !criteria || !startDate) {
      return NextResponse.json({ message: "title, criteria, and startDate are required" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) {
      return NextResponse.json({ message: "Enter valid challenge dates" }, { status: 400 });
    }
    if (end && end < start) {
      return NextResponse.json({ message: "End date must be after the start date" }, { status: 400 });
    }

    const subject = await prisma.subject.findFirst({
      where: { name: { equals: criteria.subject, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    const grade = await prisma.grade.findUnique({
      where: { level: criteria.grade },
      select: { id: true, level: true },
    });
    if (!subject || !grade) {
      return NextResponse.json({ message: "The selected subject or grade does not exist" }, { status: 400 });
    }

    if (user!.role === "TEACHER") {
      const assignment = await prisma.teacherAssignment.findUnique({
        where: {
          teacherId_subjectId_gradeId: {
            teacherId: userId,
            subjectId: subject.id,
            gradeId: grade.id,
          },
        },
        select: { id: true },
      });
      if (!assignment) {
        return NextResponse.json({ message: "You can only create challenges for your assigned subject and grade" }, { status: 403 });
      }
    }

    const matchingOutcomes = await prisma.learningOutcome.count({
      where: {
        subject: { equals: subject.name, mode: "insensitive" },
        grade: grade.level,
        ...(criteria.domain
          ? { subDomain: { equals: criteria.domain, mode: "insensitive" } }
          : {}),
      },
    });
    if (matchingOutcomes === 0) {
      return NextResponse.json({ message: "No indicators match the selected challenge criteria" }, { status: 400 });
    }

    const normalizedCriteria = { ...criteria, subject: subject.name, grade: grade.level };

    const challenge = await prisma.challenge.create({
      data: {
        teacherId: userId,
        title: title.trim(),
        description: typeof description === "string" && description.trim() ? description.trim() : null,
        criteria: normalizedCriteria,
        rewardBadge: typeof rewardBadge === "string" && rewardBadge.trim() ? rewardBadge.trim() : null,
        startDate: start,
        endDate: end,
      },
    });
    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error: any) {
    console.error("CHALLENGES_POST_ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
