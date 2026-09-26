// src/app/api/quizzes/import/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";
import Papa from "papaparse";
import type { Prisma } from "@prisma/client";

export const maxDuration = 300;

/**
 * Import configuration
 *
 * We intentionally avoid putting the entire CSV into one interactive
 * transaction. Large CSV files can easily exceed Prisma's default
 * interactive transaction timeout.
 */
const QUESTIONS_PER_QUIZ = 10;
const QUIZ_BATCH_SIZE = 5;

/**
 * Normalize a CSV value.
 */
function clean(value: unknown): string {
  return value?.toString().trim() ?? "";
}

/**
 * Parse a boolean value from CSV.
 */
function parseBoolean(value: unknown): boolean {
  return clean(value).toLowerCase() === "true";
}

/**
 * Parse an optional date safely.
 */
function parseOptionalDate(value: unknown): Date | null {
  const raw = clean(value);

  if (!raw) {
    return null;
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid due_date value: ${raw}`);
  }

  return date;
}

/**
 * Build a stable group key.
 */
function buildGroupKey(
  title: string,
  subject: string,
  grade: number
): string {
  return `${title}|||${subject}|||${grade}`;
}

/**
 * Generate a unique quiz title using an in-memory set.
 *
 * This avoids repeatedly querying the database for:
 *
 *   Quiz
 *   Quiz T1
 *   Quiz T2
 *   Quiz T3
 *
 * for every imported quiz.
 */
function getUniqueTitleFromSet(
  baseTitle: string,
  usedTitles: Set<string>
): string {
  const normalizedBase = baseTitle.trim();

  if (!usedTitles.has(normalizedBase)) {
    usedTitles.add(normalizedBase);
    return normalizedBase;
  }

  let counter = 1;

  while (counter <= 100000) {
    const candidate = `${normalizedBase} T${counter}`;

    if (!usedTitles.has(candidate)) {
      usedTitles.add(candidate);
      return candidate;
    }

    counter++;
  }

  throw new Error(
    `Unable to generate a unique title for "${normalizedBase}"`
  );
}

/**
 * Fetch all existing titles that could conflict with imported titles.
 *
 * We use a single query rather than calling findFirst() for every quiz.
 */
async function loadExistingQuizTitles(
  titles: string[]
): Promise<Set<string>> {
  const uniqueTitles = [...new Set(titles.map((title) => title.trim()))].filter(
    Boolean
  );

  if (uniqueTitles.length === 0) {
    return new Set();
  }

  const existing = await prisma.quiz.findMany({
    where: {
      OR: uniqueTitles.map((title) => ({
        title,
      })),
    },
    select: {
      title: true,
    },
  });

  return new Set(existing.map((quiz) => quiz.title));
}

/**
 * Build questions for one quiz group.
 */
function buildQuestions(rows: any[], outcomeIds: string[]) {
  return rows.map((row: any) => {
    const rowIndex = rows.indexOf(row);
    const options = [
      clean(row.option_1),
      clean(row.option_2),
      clean(row.option_3),
      clean(row.option_4),
    ].filter(Boolean);

    return {
      questionText: clean(row.question),
      questionType: "MULTIPLE_CHOICE",
      correctAnswer: clean(row.answer),
      options,
      explanation: clean(row.explanation) || null,
      imageUrl: clean(row.image_url) || null,
      bloomLevel: clean(row.bloom_level) || null,
      difficulty: clean(row.difficulty) || null,
      learningOutcomeId: outcomeIds[rowIndex],
    };
  });
}

/**
 * Create one quiz.
 *
 * This function is intentionally small so each transaction stays short.
 */
async function createQuiz(
  rows: any[],
  creatorId: string,
  title: string,
  gradeId: string,
  subjectId: string,
  outcomeId: string,
  questionOutcomeIds: string[]
): Promise<string> {
  const firstRow = rows[0];

  if (!firstRow) {
    throw new Error("Cannot create a quiz from an empty group.");
  }

  const questions = buildQuestions(rows, questionOutcomeIds);

  const quiz = await prisma.$transaction(
    async (tx) => {
      const created = await tx.quiz.create({
        data: {
          title,

          description:
            clean(firstRow.description) || null,

          isPublished: parseBoolean(firstRow.is_published),

          dueDate: parseOptionalDate(firstRow.due_date),

          subjectId,

          gradeId,

          creatorId,

          outcomeId,

          questions: {
            create: questions,
          },
        },

        select: {
          id: true,
        },
      });

      return created;
    },
    {
      maxWait: 10000,
      timeout: 30000,
    }
  );

  return quiz.id;
}

export async function POST(req: NextRequest) {
  try {
    /**
     * ------------------------------------------------------------
     * 1. AUTHENTICATION
     * ------------------------------------------------------------
     */

    const { user, response } = await requireRole("TEACHER", "ADMIN");

    if (response) {
      return response;
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          details: "Authenticated user information is missing.",
        },
        { status: 401 }
      );
    }

    const userRole = user.role;
    const userId = user.id;

    /**
     * ------------------------------------------------------------
     * 2. VERIFY USER EXISTS IN DATABASE
     * ------------------------------------------------------------
     *
     * This protects Quiz.creatorId from the FK problem encountered
     * previously.
     */

    const creator = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
      },
    });

    if (!creator) {
      return NextResponse.json(
        {
          error: "Import failed",
          details:
            "Authenticated user was not found in the database. Please sign out and sign in again.",
        },
        { status: 401 }
      );
    }

    if (creator.role !== userRole) {
      return NextResponse.json(
        {
          error: "Import failed",
          details:
            "Authenticated user role does not match the role stored in the database.",
        },
        { status: 403 }
      );
    }

    /**
     * ------------------------------------------------------------
     * 3. READ CSV
     * ------------------------------------------------------------
     */

    const formData = await req.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "No file uploaded",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    const text = new TextDecoder().decode(bytes);

    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors && parsed.errors.length > 0) {
      console.warn("CSV_PARSE_WARNINGS:", parsed.errors);
    }

    const records = parsed.data as any[];

    if (!records || records.length === 0) {
      return NextResponse.json(
        {
          error: "CSV is empty or invalid",
        },
        { status: 400 }
      );
    }

    /**
     * ------------------------------------------------------------
     * 4. GROUP CSV ROWS
     * ------------------------------------------------------------
     */

    const groupedRows = new Map<string, any[]>();

    for (const row of records) {
      const title = clean(row.quiz_title);
      const subject = clean(row.subject);
      const gradeRaw = clean(row.grade);

      if (!title) {
        throw new Error(
          `Missing quiz_title in CSV row.`
        );
      }

      if (!subject) {
        throw new Error(
          `Missing subject for quiz "${title}".`
        );
      }

      if (!gradeRaw) {
        throw new Error(
          `Missing grade for quiz "${title}".`
        );
      }

      const grade = Number.parseInt(gradeRaw, 10);

      if (Number.isNaN(grade)) {
        throw new Error(
          `Invalid grade "${gradeRaw}" for quiz "${title}".`
        );
      }

      const key = buildGroupKey(title, subject, grade);

      const existing = groupedRows.get(key);

      if (existing) {
        existing.push(row);
      } else {
        groupedRows.set(key, [row]);
      }
    }

    /**
     * ------------------------------------------------------------
     * 5. SPLIT INTO QUIZZES OF 10 QUESTIONS
     * ------------------------------------------------------------
     */

    const quizGroups: any[][] = [];

    for (const rows of groupedRows.values()) {
      for (
        let index = 0;
        index < rows.length;
        index += QUESTIONS_PER_QUIZ
      ) {
        const chunk = rows.slice(
          index,
          index + QUESTIONS_PER_QUIZ
        );

        if (chunk.length > 0) {
          quizGroups.push(chunk);
        }
      }
    }

    if (quizGroups.length === 0) {
      return NextResponse.json(
        {
          error: "No valid quiz groups were found in the CSV.",
        },
        { status: 400 }
      );
    }

    /**
     * ------------------------------------------------------------
     * 6. LOAD REQUIRED DATABASE DATA ONCE
     * ------------------------------------------------------------
     *
     * Instead of repeatedly querying Grade/Subject/Assignments
     * inside every transaction, cache them here.
     */

    const gradeLevels = [
      ...new Set(
        quizGroups.map((rows) =>
          Number.parseInt(clean(rows[0]?.grade), 10)
        )
      ),
    ];

    const subjectNames = [
      ...new Set(
        quizGroups
          .map((rows) => clean(rows[0]?.subject))
          .filter(Boolean)
      ),
    ];

    const grades = await prisma.grade.findMany({
      where: {
        level: {
          in: gradeLevels,
        },
      },
      select: {
        id: true,
        level: true,
      },
    });

    const gradeMap = new Map(
      grades.map((grade) => [grade.level, grade])
    );

    for (const level of gradeLevels) {
      if (!gradeMap.has(level)) {
        throw new Error(
          `Grade ${level} not found in the database.`
        );
      }
    }

    /**
     * Load existing subjects.
     */
    const existingSubjects = await prisma.subject.findMany({
      where: {
        name: {
          in: subjectNames,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const subjectMap = new Map(
      existingSubjects.map((subject) => [
        subject.name,
        subject,
      ])
    );

    /**
     * Create missing subjects before importing quizzes.
     *
     * We do this outside the quiz transactions.
     */
    for (const subjectName of subjectNames) {
      if (!subjectMap.has(subjectName)) {
        const subject = await prisma.subject.upsert({
          where: {
            name: subjectName,
          },
          update: {},
          create: {
            name: subjectName,
          },
          select: {
            id: true,
            name: true,
          },
        });

        subjectMap.set(subject.name, subject);
      }
    }

    /**
     * ------------------------------------------------------------
     * 7. VERIFY TEACHER ASSIGNMENTS ONCE
     * ------------------------------------------------------------
     */

    if (userRole === "TEACHER") {
      const assignments =
        await prisma.teacherAssignment.findMany({
          where: {
            teacherId: creator.id,

            subject: {
              name: {
                in: subjectNames,
              },
            },

            grade: {
              level: {
                in: gradeLevels,
              },
            },
          },

          select: {
            subject: {
              select: {
                name: true,
              },
            },

            grade: {
              select: {
                level: true,
              },
            },
          },
        });

      const assignmentKeys = new Set(
        assignments.map(
          (assignment) =>
            `${assignment.subject.name}|||${assignment.grade.level}`
        )
      );

      for (const rows of quizGroups) {
        const firstRow = rows[0];

        const subjectName = clean(firstRow.subject);

        const gradeLevel = Number.parseInt(
          clean(firstRow.grade),
          10
        );

        const assignmentKey =
          `${subjectName}|||${gradeLevel}`;

        if (!assignmentKeys.has(assignmentKey)) {
          throw new Error(
            `Not assigned to ${subjectName} Grade ${gradeLevel}.`
          );
        }
      }
    }

    /**
     * ------------------------------------------------------------
     * 8. LOAD LEARNING OUTCOMES ONCE
     * ------------------------------------------------------------
     *
     * Outcome matching can otherwise become a large number of
     * queries inside a transaction.
     */

    const outcomeMap = new Map<string, string>();

    const outcomeRequests = new Map<
      string,
      {
        subject: string;
        grade: number;
        outcomeText: string;
        indicatorText: string;
      }
    >();

    for (const rows of quizGroups) {
      for (const row of rows) {
        const subject = clean(row.subject);
        const grade = Number.parseInt(clean(row.grade), 10);
        const outcomeText = clean(row.outcome_text);
        const indicatorText = clean(row.indicator_text);
        if (!outcomeText || !indicatorText) {
          throw new Error(`Every row must include exact outcome_text and indicator_text (quiz: "${clean(row.quiz_title)}").`);
        }
        const key = `${subject.toLowerCase()}|||${grade}|||${outcomeText.toLowerCase()}|||${indicatorText.toLowerCase()}`;
        if (!outcomeRequests.has(key)) {
          outcomeRequests.set(key, { subject, grade, outcomeText, indicatorText });
        }
      }
    }

    if (outcomeRequests.size > 0) {
      const requestedOutcomes = [
        ...outcomeRequests.values(),
      ];

      /**
       * LearningOutcome schema in this project uses:
       *
       * subject
       * grade
       * indicatorText
       * outcomeText
       *
       * We load only the subject/grade combinations that are
       * actually present in the CSV.
       */
      const outcomeSubjects = [
        ...new Set(
          requestedOutcomes.map(
            (item) => item.subject
          )
        ),
      ];

      const outcomeGrades = [
        ...new Set(
          requestedOutcomes.map(
            (item) => item.grade
          )
        ),
      ];

      const outcomes =
        await prisma.learningOutcome.findMany({
          where: {
            subject: {
              in: outcomeSubjects,
            },

            grade: {
              in: outcomeGrades,
            },
          },

          select: {
            id: true,
            subject: true,
            grade: true,
            indicatorText: true,
            outcomeText: true,
          },
        });

      // Exact matching prevents a quiz from silently receiving the first
      // indicator in its grade/subject when a CSV value is ambiguous.
      for (const request of requestedOutcomes) {
        const matches = outcomes.filter(
          (outcome) =>
            outcome.subject.trim().toLowerCase() === request.subject.trim().toLowerCase() &&
            outcome.grade === request.grade &&
            clean(outcome.outcomeText).toLowerCase() === request.outcomeText.toLowerCase() &&
            clean(outcome.indicatorText).toLowerCase() === request.indicatorText.toLowerCase()
        );
        if (matches.length !== 1) {
          throw new Error(`Expected one exact indicator for ${request.subject} Grade ${request.grade}, but found ${matches.length}: ${request.indicatorText}`);
        }
        const key = `${request.subject.toLowerCase()}|||${request.grade}|||${request.outcomeText.toLowerCase()}|||${request.indicatorText.toLowerCase()}`;
        outcomeMap.set(key, matches[0].id);
      }
    }

    /**
     * ------------------------------------------------------------
     * 9. LOAD EXISTING QUIZ TITLES
     * ------------------------------------------------------------
     *
     * We only query existing titles once.
     */

    const baseTitles = quizGroups.map((rows) =>
      clean(rows[0]?.quiz_title)
    );

    const usedTitles =
      await loadExistingQuizTitles(baseTitles);

    /**
     * ------------------------------------------------------------
     * 10. CREATE QUIZZES IN SMALL BATCHES
     * ------------------------------------------------------------
     *
     * This is the major performance improvement.
     *
     * We DO NOT wrap thousands of quizzes in one transaction.
     *
     * Each quiz has its own short transaction, and only a small
     * number are processed concurrently.
     */

    const createdQuizIds: string[] = [];

    const failedQuizzes: Array<{
      title: string;
      subject: string;
      grade: number;
      error: string;
    }> = [];

    for (
      let batchStart = 0;
      batchStart < quizGroups.length;
      batchStart += QUIZ_BATCH_SIZE
    ) {
      const batch = quizGroups.slice(
        batchStart,
        batchStart + QUIZ_BATCH_SIZE
      );

      /**
       * We create each quiz sequentially inside the batch.
       *
       * This is intentionally conservative for PostgreSQL and
       * avoids creating a large number of concurrent transactions.
       */
      for (const rows of batch) {
        const firstRow = rows[0];

        if (!firstRow) {
          continue;
        }

        try {
          const title = clean(firstRow.quiz_title);

          const subjectName = clean(
            firstRow.subject
          );

          const gradeLevel = Number.parseInt(
            clean(firstRow.grade),
            10
          );

          const gradeRecord =
            gradeMap.get(gradeLevel);

          if (!gradeRecord) {
            throw new Error(
              `Grade ${gradeLevel} not found.`
            );
          }

          const subjectRecord =
            subjectMap.get(subjectName);

          if (!subjectRecord) {
            throw new Error(
              `Subject "${subjectName}" could not be resolved.`
            );
          }

          /**
           * Resolve Learning Outcome from cache.
           */
          const questionOutcomeIds = rows.map((row) => {
            const key = `${subjectName.toLowerCase()}|||${gradeLevel}|||${clean(row.outcome_text).toLowerCase()}|||${clean(row.indicator_text).toLowerCase()}`;
            const id = outcomeMap.get(key);
            if (!id) throw new Error(`Indicator could not be resolved for question: ${clean(row.question)}`);
            return id;
          });
          const outcomeId = [...new Map(questionOutcomeIds.map((id) => [id, questionOutcomeIds.filter((value) => value === id).length])).entries()]
            .sort((a, b) => b[1] - a[1])[0][0];

          /**
           * Generate title without another database query.
           */
          const uniqueTitle =
            getUniqueTitleFromSet(
              title,
              usedTitles
            );

          const quizId = await createQuiz(
            rows,
            creator.id,
            uniqueTitle,
            gradeRecord.id,
            subjectRecord.id,
            outcomeId,
            questionOutcomeIds
          );

          createdQuizIds.push(quizId);

          console.log(
            `CSV_IMPORT_PROGRESS: created ${createdQuizIds.length}/${quizGroups.length} - ${uniqueTitle}`
          );
        } catch (error: any) {
          const message =
            error?.message ??
            "Unknown error";

          const title =
            clean(firstRow.quiz_title);

          const subject =
            clean(firstRow.subject);

          const grade =
            Number.parseInt(
              clean(firstRow.grade),
              10
            );

          console.error(
            "CSV_IMPORT_QUIZ_ERROR:",
            {
              title,
              subject,
              grade,
              message,
            }
          );

          failedQuizzes.push({
            title,
            subject,
            grade,
            error: message,
          });

          /**
           * Continue importing the remaining quizzes.
           *
           * A single malformed quiz should not destroy all
           * successfully imported quizzes.
           */
          continue;
        }
      }
    }

    /**
     * ------------------------------------------------------------
     * 11. RESPONSE
     * ------------------------------------------------------------
     */

    return NextResponse.json({
      success:
        failedQuizzes.length === 0,

      count:
        createdQuizIds.length,

      totalGroups:
        quizGroups.length,

      failedCount:
        failedQuizzes.length,

      quizIds:
        createdQuizIds,

      failures:
        failedQuizzes.length > 0
          ? failedQuizzes
          : undefined,
    });
  } catch (error: any) {
    console.error(
      "CSV_IMPORT_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Import failed",

        details:
          error?.message ??
          "Unknown import error",
      },
      {
        status: 500,
      }
    );
  }
}
