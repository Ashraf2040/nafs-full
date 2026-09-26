import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { isChallengeOpen, parseChallengeCriteria } from "@/lib/challenges";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireRole("STUDENT", "TEACHER", "ADMIN");
    if (response) return response;
    const { id } = await params;

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        teacher: { select: { name: true } },
        participations: user!.role === "STUDENT"
          ? { where: { studentId: user!.id } }
          : {
              include: { student: { select: { id: true, name: true } } },
              orderBy: { progress: "desc" },
            },
        _count: { select: { participations: true } },
      },
    });
    if (!challenge) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    if (user!.role === "TEACHER" && challenge.teacherId !== user!.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    if (user!.role === "STUDENT") {
      const criteria = parseChallengeCriteria(challenge.criteria);
      const grade = user!.gradeId
        ? await prisma.grade.findUnique({ where: { id: user!.gradeId }, select: { level: true } })
        : null;
      if (!criteria || criteria.grade !== grade?.level || !isChallengeOpen(challenge)) {
        return NextResponse.json({ message: "Challenge not available" }, { status: 404 });
      }
    }
    return NextResponse.json({ challenge });
  } catch (error: any) {
    console.error("CHALLENGE_GET_ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;
    const { id } = await params;
    const body = await req.json();
    const { title, description, rewardBadge, startDate, endDate, isActive } = body;

    // TEACHERS may only edit their own challenges
    if (user!.role === "TEACHER") {
      const owned = await prisma.challenge.findFirst({
        where: { id, teacherId: user!.id },
        select: { id: true },
      });
      if (!owned) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    const current = await prisma.challenge.findUnique({
      where: { id },
      select: { startDate: true, endDate: true, criteria: true },
    });
    if (!current) return NextResponse.json({ message: "Challenge not found" }, { status: 404 });

    const criteria = body.criteria === undefined ? undefined : parseChallengeCriteria(body.criteria);
    if (body.criteria !== undefined && !criteria) {
      return NextResponse.json({ message: "Invalid challenge criteria" }, { status: 400 });
    }
    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
      return NextResponse.json({ message: "Challenge title is required" }, { status: 400 });
    }
    if (isActive !== undefined && typeof isActive !== "boolean") {
      return NextResponse.json({ message: "isActive must be true or false" }, { status: 400 });
    }

    let normalizedCriteria = criteria;
    if (criteria) {
      const [subject, grade] = await Promise.all([
        prisma.subject.findFirst({
          where: { name: { equals: criteria.subject, mode: "insensitive" } },
          select: { id: true, name: true },
        }),
        prisma.grade.findUnique({ where: { level: criteria.grade }, select: { id: true, level: true } }),
      ]);
      if (!subject || !grade) {
        return NextResponse.json({ message: "The selected subject or grade does not exist" }, { status: 400 });
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
          return NextResponse.json({ message: "You can only use your assigned subject and grade" }, { status: 403 });
        }
      }
      const outcomeCount = await prisma.learningOutcome.count({
        where: {
          subject: { equals: subject.name, mode: "insensitive" },
          grade: grade.level,
          ...(criteria.domain ? { subDomain: { equals: criteria.domain, mode: "insensitive" } } : {}),
        },
      });
      if (outcomeCount === 0) {
        return NextResponse.json({ message: "No indicators match the selected challenge criteria" }, { status: 400 });
      }
      normalizedCriteria = { ...criteria, subject: subject.name, grade: grade.level };
    }

    const nextStart = startDate === undefined ? current.startDate : new Date(startDate);
    const nextEnd = endDate === undefined ? current.endDate : endDate ? new Date(endDate) : null;
    if (Number.isNaN(nextStart.getTime()) || (nextEnd && Number.isNaN(nextEnd.getTime())) || (nextEnd && nextEnd < nextStart)) {
      return NextResponse.json({ message: "Enter a valid date range" }, { status: 400 });
    }

    const challenge = await prisma.challenge.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: typeof description === "string" && description.trim() ? description.trim() : null }),
        ...(normalizedCriteria !== undefined && normalizedCriteria !== null && { criteria: normalizedCriteria }),
        ...(rewardBadge !== undefined && { rewardBadge: typeof rewardBadge === "string" && rewardBadge.trim() ? rewardBadge.trim() : null }),
        ...(startDate !== undefined && { startDate: nextStart }),
        ...(endDate !== undefined && { endDate: nextEnd }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return NextResponse.json({ challenge });
  } catch (error: any) {
    console.error("CHALLENGE_PUT_ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;
    const { id } = await params;

    // TEACHERS may only delete their own challenges
    if (user!.role === "TEACHER") {
      const owned = await prisma.challenge.findFirst({
        where: { id, teacherId: user!.id },
        select: { id: true },
      });
      if (!owned) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.challenge.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error: any) {
    console.error("CHALLENGE_DELETE_ERROR:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
