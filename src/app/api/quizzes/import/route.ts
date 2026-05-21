// src/app/api/quizzes/import/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Papa from "papaparse";

/**
 * Generates a unique quiz title.
 * If title exists:
 * Quiz
 * Quiz T1
 * Quiz T2
 * etc...
 */
async function getUniqueQuizTitle(baseTitle: string): Promise<string> {
  const existing = await prisma.quiz.findFirst({
    where: { title: baseTitle },
  });

  if (!existing) return baseTitle;

  let counter = 1;

  while (true) {
    const candidate = `${baseTitle} T${counter}`;

    const exists = await prisma.quiz.findFirst({
      where: { title: candidate },
    });

    if (!exists) {
      return candidate;
    }

    counter++;

    // Safety guard
    if (counter > 1000) {
      throw new Error(
        `Unable to generate unique title for "${baseTitle}"`
      );
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // =========================
    // AUTH
    // =========================

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    if (userRole === "STUDENT") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // =========================
    // FILE
    // =========================

    const formData = await req.formData();

    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    const text = new TextDecoder().decode(bytes);

    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });

    const records = parsed.data as any[];

    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: "CSV is empty or invalid" },
        { status: 400 }
      );
    }

    // =========================
    // GROUP ROWS
    // =========================
    // IMPORTANT:
    // Some CSV files contain repeated titles.
    // We first group by:
    // title + subject + grade
    //
    // THEN split into quizzes
    // of 10 questions each.
    // =========================

    const groupedRows: Record<string, any[]> = {};

    for (const row of records) {
      const title = row.quiz_title?.toString().trim();
      const subject = row.subject?.toString().trim();
      const grade = row.grade?.toString().trim();

      const key = `${title}|${subject}|${grade}`;

      if (!groupedRows[key]) {
        groupedRows[key] = [];
      }

      groupedRows[key].push(row);
    }

    // =========================
    // SPLIT INTO QUIZZES
    // =========================
    // Every 10 questions = 1 quiz
    // =========================

    const quizGroups: any[][] = [];

    for (const rows of Object.values(groupedRows)) {
      for (let i = 0; i < rows.length; i += 10) {
        const chunk = rows.slice(i, i + 10);

        // Ignore incomplete empty chunks
        if (chunk.length > 0) {
          quizGroups.push(chunk);
        }
      }
    }

    // =========================
    // CREATE QUIZZES
    // =========================

    const createdQuizzes: string[] = [];

    for (const rows of quizGroups) {
      const firstRow = rows[0];

      if (!firstRow) continue;

      const gradeLevel = parseInt(firstRow.grade);

      if (isNaN(gradeLevel)) {
        throw new Error(
          `Invalid grade value: ${firstRow.grade}`
        );
      }

      // =========================
      // GRADE
      // =========================

      const gradeRecord = await prisma.grade.findUnique({
        where: { level: gradeLevel },
      });

      if (!gradeRecord) {
        throw new Error(
          `Grade ${gradeLevel} not found`
        );
      }

      // =========================
      // TEACHER CHECK
      // =========================

      if (userRole === "TEACHER") {
        const assignment =
          await prisma.teacherAssignment.findFirst({
            where: {
              teacherId: userId,
              subject: {
                name: firstRow.subject,
              },
              grade: {
                level: gradeLevel,
              },
            },
          });

        if (!assignment) {
          throw new Error(
            `Not assigned to ${firstRow.subject} Grade ${gradeLevel}`
          );
        }
      }

      // =========================
      // SUBJECT
      // =========================

      const subject = await prisma.subject.upsert({
        where: {
          name: firstRow.subject,
        },
        update: {},
        create: {
          name: firstRow.subject,
        },
      });

      // =========================
      // QUESTIONS
      // =========================

      const questions = rows.map((row: any) => {
        const options = [
          row.option_1,
          row.option_2,
          row.option_3,
          row.option_4,
        ].filter(Boolean);

        return {
          questionText: row.question?.toString().trim(),

          questionType: "MULTIPLE_CHOICE",

          correctAnswer:
            row.answer?.toString().trim(),

          options,

          explanation:
            row.explanation?.toString().trim() || null,

          imageUrl:
            row.image_url?.toString().trim() || null,

          bloomLevel:
            row.bloom_level?.toString().trim() || null,

          difficulty:
            row.difficulty?.toString().trim() || null,
        };
      });

      // =========================
      // UNIQUE TITLE
      // =========================

      const uniqueTitle =
        await getUniqueQuizTitle(
          firstRow.quiz_title?.toString().trim()
        );

      // =========================
      // CREATE QUIZ
      // =========================

      const newQuiz = await prisma.quiz.create({
        data: {
          title: uniqueTitle,

          description:
            firstRow.description?.toString().trim() ||
            null,

          isPublished:
            firstRow.is_published
              ?.toString()
              .toLowerCase() === "true",

          dueDate: firstRow.due_date
            ? new Date(firstRow.due_date)
            : null,

          subjectId: subject.id,

          gradeId: gradeRecord.id,

          creatorId: userId,

          questions: {
            create: questions,
          },
        },
      });

      createdQuizzes.push(newQuiz.id);
    }

    // =========================
    // RESPONSE
    // =========================

    return NextResponse.json({
      success: true,
      count: createdQuizzes.length,
      quizIds: createdQuizzes,
    });
  } catch (error: any) {
    console.error("CSV_IMPORT_ERROR:", error);

    return NextResponse.json(
      {
        error: "Import failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}