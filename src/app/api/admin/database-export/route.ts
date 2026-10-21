import { NextResponse } from "next/server";
import Papa from "papaparse";
import { strToU8, zipSync } from "fflate";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { databaseBackupTableFields as tableFields } from "@/lib/databaseBackup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TableName = keyof typeof tableFields;

function serializeTable(rows: Array<Record<string, unknown>>, fields: readonly string[]) {
  const encodedRows = rows.map((row) => Object.fromEntries(
    fields.map((field) => {
      const value = row[field];
      const normalized = value instanceof Date ? value.toISOString() : value ?? null;
      return [field, JSON.stringify(normalized)];
    }),
  ));
  return Papa.unparse({ fields: [...fields], data: encodedRows }, { newline: "\r\n" });
}

export async function GET() {
  const { response } = await requireRole("ADMIN");
  if (response) return response;

  try {
    const tables = await prisma.$transaction(async (tx) => {
      const [
        grades, subjects, classes, users, teacherAssignments, learningOutcomes,
        testingWindows, quizzes, studyGuides, questions, results, studentAnswers,
        skillMastery, learningPathItems, trophies, challenges, challengeParticipations,
      ] = await Promise.all([
        tx.grade.findMany(),
        tx.subject.findMany(),
        tx.class.findMany(),
        tx.user.findMany(),
        tx.teacherAssignment.findMany(),
        tx.learningOutcome.findMany(),
        tx.testingWindow.findMany(),
        tx.quiz.findMany(),
        tx.studyGuide.findMany(),
        tx.question.findMany(),
        tx.result.findMany(),
        tx.studentAnswer.findMany(),
        tx.skillMastery.findMany(),
        tx.learningPathItem.findMany(),
        tx.trophy.findMany(),
        tx.challenge.findMany(),
        tx.challengeParticipation.findMany(),
      ]);

      return {
        Grade: grades,
        Subject: subjects,
        Class: classes,
        User: users,
        TeacherAssignment: teacherAssignments,
        LearningOutcome: learningOutcomes,
        TestingWindow: testingWindows,
        Quiz: quizzes,
        StudyGuide: studyGuides,
        Question: questions,
        Result: results,
        StudentAnswer: studentAnswers,
        SkillMastery: skillMastery,
        LearningPathItem: learningPathItems,
        Trophy: trophies,
        Challenge: challenges,
        ChallengeParticipation: challengeParticipations,
      } satisfies Record<TableName, Array<Record<string, unknown>>>;
    }, { isolationLevel: "RepeatableRead" });

    const exportedAt = new Date().toISOString();
    const manifestRows = [
      { key: "format", value: "nafs-prep-database-csv-backup" },
      { key: "formatVersion", value: "1" },
      { key: "exportedAt", value: exportedAt },
      { key: "restoreOrder", value: Object.keys(tableFields).join("|") },
      ...Object.entries(tables).map(([tableName, rows]) => ({ key: `count.${tableName}`, value: String(rows.length) })),
    ];

    const archiveFiles: Record<string, Uint8Array> = {
      "manifest.csv": strToU8(Papa.unparse(manifestRows, { newline: "\r\n" })),
    };
    for (const [tableName, rows] of Object.entries(tables) as Array<[TableName, Array<Record<string, unknown>>]>) {
      archiveFiles[`${tableName}.csv`] = strToU8(serializeTable(rows, tableFields[tableName]));
    }

    const archive = zipSync(archiveFiles, { level: 6 });
    const date = exportedAt.slice(0, 10);
    const archiveBody = new ArrayBuffer(archive.byteLength);
    new Uint8Array(archiveBody).set(archive);
    return new NextResponse(archiveBody, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="nafs-prep-csv-backup-${date}.zip"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Database backup export failed", error);
    return NextResponse.json({ error: "The database backup could not be created." }, { status: 500 });
  }
}
