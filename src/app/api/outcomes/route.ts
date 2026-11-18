import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const grade = searchParams.get("grade");

    // Build base where clause
    const where: any = {};
    if (subject) where.subject = subject;
    if (grade) where.grade = parseInt(grade);

    // TEACHER SCOPE: restrict to their assignments
    if (userRole === "TEACHER") {
      const assignments = await prisma.teacherAssignment.findMany({
        where: { teacherId: userId },
        include: { subject: true, grade: true },
      });

      if (assignments.length === 0) {
        return NextResponse.json({ outcomes: [] });
      }

      where.AND = [{ OR: assignments.map(a => ({ subject: a.subject.name, grade: a.grade.level })) }];
    }

    // STUDENT SCOPE (if they ever use this endpoint)
    if (userRole === "STUDENT") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { grade: true },
      });
      where.grade = user?.grade?.level ?? -1;
    }

    const outcomes = await prisma.learningOutcome.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ outcomes });
  } catch (error) {
    console.error("Error fetching outcomes:", error);
    return NextResponse.json({ error: "Failed to fetch outcomes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as any;
    if (user.role !== "ADMIN" && user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json();
    const subjectName = typeof body.subject === "string" ? body.subject.trim() : "";
    const gradeLevel = Number(body.grade);
    const outcomeText = typeof body.outcomeText === "string" ? body.outcomeText.trim() : "";
    const indicators: string[] = Array.isArray(body.indicators) ? body.indicators.map((value: unknown) => String(value).trim()).filter((value: string) => value.length > 0) : [];
    const subDomain = typeof body.subDomain === "string" ? body.subDomain.trim() : "";
    if (!subjectName || !Number.isInteger(gradeLevel) || gradeLevel < 1 || !outcomeText || indicators.length === 0) {
      return NextResponse.json({ error: "Choose a grade and subject, then add an outcome and at least one indicator." }, { status: 400 });
    }
    const subject = await prisma.subject.findFirst({ where: { name: { equals: subjectName, mode: "insensitive" } }, select: { id: true, name: true } });
    const grade = await prisma.grade.findUnique({ where: { level: gradeLevel }, select: { id: true, level: true } });
    if (!subject || !grade) return NextResponse.json({ error: "Choose a valid subject and grade." }, { status: 400 });
    if (user.role === "TEACHER") {
      const assignment = await prisma.teacherAssignment.findFirst({ where: { teacherId: user.id, subjectId: subject.id, gradeId: grade.id }, select: { id: true } });
      if (!assignment) return NextResponse.json({ error: "You are not assigned to this subject and grade." }, { status: 403 });
    }
    const existing = await prisma.learningOutcome.findMany({ where: { subject: subject.name, grade: gradeLevel, outcomeText }, select: { indicatorText: true } });
    const existingIndicators = new Set(existing.map((item) => item.indicatorText.trim().toLocaleLowerCase()));
    const uniqueIndicators = [...new Map(indicators.map((indicator: string) => [indicator.toLocaleLowerCase(), indicator])).values()];
    const newIndicators = uniqueIndicators.filter((indicator) => !existingIndicators.has(indicator.toLocaleLowerCase()));
    if (newIndicators.length) await prisma.learningOutcome.createMany({ data: newIndicators.map((indicatorText) => ({ grade: gradeLevel, subject: subject.name, subjectRefId: subject.id, subDomain: subDomain || null, outcomeText, indicatorText })) });
    return NextResponse.json({ count: newIndicators.length, skippedDuplicates: indicators.length - newIndicators.length });
  } catch (error) {
    console.error("CREATE_OUTCOME_ERROR:", error);
    return NextResponse.json({ error: "Could not save this outcome." }, { status: 500 });
  }
}
