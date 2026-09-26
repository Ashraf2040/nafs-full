import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    if (userRole === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let whereClause: any = {};

    if (userRole === "TEACHER") {
      const assignments = await prisma.teacherAssignment.findMany({
        where: { teacherId: userId },
        select: { subjectId: true, gradeId: true },
      });

      if (assignments.length === 0) {
        return NextResponse.json({ quizzes: [] });
      }

      whereClause.OR = assignments.map((a) => ({
        subjectId: a.subjectId,
        gradeId: a.gradeId,
      }));
    }

    const quizzes = await prisma.quiz.findMany({
      where: whereClause,
      include: {
        subject: true,
        grade: true,
        questions: true,
        outcome: true,
        creator: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const format = req.nextUrl.searchParams.get("format") || "csv";

    if (format === "json") {
      return NextResponse.json({ quizzes });
    }

    const headers = [
      "quiz_title",
      "subject",
      "grade",
      "description",
      "is_published",
      "due_date",
      "creator_name",
      "creator_email",
      "outcome_text",
      "question",
      "question_type",
      "option_1",
      "option_2",
      "option_3",
      "option_4",
      "answer",
      "explanation",
      "difficulty",
      "bloom_level",
    ];

    const rows: string[][] = [headers];

    for (const quiz of quizzes) {
      if (quiz.questions.length === 0) {
        rows.push([
          quiz.title,
          quiz.subject.name,
          String(quiz.grade.level),
          quiz.description || "",
          String(quiz.isPublished),
          quiz.dueDate?.toISOString() || "",
          quiz.creator?.name || "",
          quiz.creator?.email || "",
          quiz.outcome?.outcomeText || "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
      }

      for (const question of quiz.questions) {
        const opts = (question.options as string[]) || [];
        rows.push([
          quiz.title,
          quiz.subject.name,
          String(quiz.grade.level),
          quiz.description || "",
          String(quiz.isPublished),
          quiz.dueDate?.toISOString() || "",
          quiz.creator?.name || "",
          quiz.creator?.email || "",
          quiz.outcome?.outcomeText || "",
          question.questionText,
          question.questionType,
          opts[0] || "",
          opts[1] || "",
          opts[2] || "",
          opts[3] || "",
          question.correctAnswer,
          question.explanation || "",
          question.difficulty || "",
          question.bloomLevel || "",
        ]);
      }
    }

    const csv = rows.map((row) =>
      row.map((cell) => {
        const str = String(cell ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    ).join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="quizzes-export-${Date.now()}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("QUIZ_EXPORT_ERROR:", error);
    return NextResponse.json(
      { error: "Export failed", details: error.message },
      { status: 500 }
    );
  }
}
