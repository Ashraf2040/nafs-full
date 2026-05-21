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

      // If specific subject/grade requested, silently filter to allowed ones
      if (subject || grade) {
        const allowed = assignments.some(a => 
          (!subject || a.subject.name === subject) && 
          (!grade || a.grade.level === parseInt(grade))
        );
        if (!allowed) {
          return NextResponse.json({ outcomes: [] }); // Empty, not 403
        }
      } else {
        // No filters: only show outcomes for assigned subjects/grades
        where.OR = assignments.map(a => ({
          subject: a.subject.name,
          grade: a.grade.level,
        }));
      }
    }

    // STUDENT SCOPE (if they ever use this endpoint)
    if (userRole === "STUDENT") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { grade: true },
      });
      if (user?.grade) {
        where.grade = user.grade.level;
      }
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