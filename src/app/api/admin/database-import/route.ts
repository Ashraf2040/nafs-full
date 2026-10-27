import { NextResponse } from "next/server";
import Papa from "papaparse";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { databaseBackupTableFields, databaseBackupTableNames, diagnosisBackupTables, simulationBackupTables, type DatabaseBackupSelection, type DatabaseBackupTable } from "@/lib/databaseBackup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const maxFileBytes = 100 * 1024 * 1024;
type UpsertDelegate = { upsert(args: { where: { id: string }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<unknown> };
const delegateNames: Record<DatabaseBackupTable, string> = {
  Grade: "grade", Subject: "subject", Class: "class", User: "user", TeacherAssignment: "teacherAssignment",
  LearningOutcome: "learningOutcome", TestingWindow: "testingWindow", Quiz: "quiz", Question: "question",
  Result: "result", StudentAnswer: "studentAnswer", PracticeCompletion: "practiceCompletion", Simulation: "simulation",
  SimulationSubject: "simulationSubject", SimulationQuestion: "simulationQuestion", SimulationAttempt: "simulationAttempt",
  StudyGuide: "studyGuide", SkillMastery: "skillMastery", LearningPathItem: "learningPathItem", Trophy: "trophy",
  Challenge: "challenge", ChallengeParticipation: "challengeParticipation",
};
const restoreOrder = databaseBackupTableNames;
const dateFields = new Set(["createdAt", "dueDate", "completedAt", "startDate", "endDate", "lastAssessedAt", "earnedAt"]);
type ParsedRows = Map<DatabaseBackupTable, Record<string, unknown>[]>;

function parseSingleTableCsv(text: string, table: DatabaseBackupTable): Record<string, unknown>[] | null {
  const fields = databaseBackupTableFields[table] as readonly string[];
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy" });
  if (parsed.errors.length || JSON.stringify(parsed.meta.fields) !== JSON.stringify(fields) || parsed.data.length > 200_000) return null;
  const seenIds = new Set<string>(); const rows: Record<string, unknown>[] = [];
  for (const csvRow of parsed.data) {
    const row: Record<string, unknown> = {};
    for (const field of fields) {
      if (typeof csvRow[field] !== "string") return null;
      try { row[field] = JSON.parse(csvRow[field]) as unknown; } catch { return null; }
    }
    if (typeof row.id !== "string" || !row.id || seenIds.has(row.id)) return null;
    seenIds.add(row.id); rows.push(row);
  }
  return rows;
}

function parseFeatureCsv(text: string, selection: "Diagnosis" | "Simulation"): ParsedRows | null {
  const parsed = Papa.parse<{ __table: string; id: string; data: string }>(text.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy" });
  if (parsed.errors.length || JSON.stringify(parsed.meta.fields) !== JSON.stringify(["__table", "id", "data"]) || parsed.data.length > 200_000) return null;
  const allowedTables = selection === "Diagnosis" ? diagnosisBackupTables : simulationBackupTables;
  const rows: ParsedRows = new Map(allowedTables.map((table) => [table, []])); const seenIds = new Set<string>();
  for (const item of parsed.data) {
    if (!allowedTables.includes(item.__table as DatabaseBackupTable)) return null;
    const table = item.__table as DatabaseBackupTable;
    let row: unknown;
    try { row = JSON.parse(item.data); } catch { return null; }
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    const data = row as Record<string, unknown>;
    const fields = databaseBackupTableFields[table] as readonly string[];
    if (typeof data.id !== "string" || data.id !== item.id || !item.id || Object.keys(data).some((field) => !fields.includes(field))) return null;
    const key = `${table}:${item.id}`;
    if (seenIds.has(key)) return null;
    seenIds.add(key); rows.get(table)!.push(data);
  }
  if (selection === "Diagnosis" && (rows.get("Quiz")!.some((row) => row.isDiagnostic !== true) || rows.get("Question")!.some((row) => !rows.get("Quiz")!.some((quiz) => quiz.id === row.quizId)))) return null;
  return rows;
}

export async function POST(request: Request) {
  const { response } = await requireRole("ADMIN");
  if (response) return response;
  const selection = new URL(request.url).searchParams.get("table") as DatabaseBackupSelection | null;
  if (!selection || ![...databaseBackupTableNames, "Diagnosis", "Simulation"].includes(selection)) return NextResponse.json({ error: "Choose a valid table to import." }, { status: 400 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxFileBytes) return NextResponse.json({ error: "Table CSV files must be 100 MB or smaller." }, { status: 413 });
  let text: string;
  try {
    text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxFileBytes) throw new Error("too large");
  } catch { return NextResponse.json({ error: "Choose a valid CSV file smaller than 100 MB." }, { status: 400 }); }

  const featureSelection = selection === "Diagnosis" || selection === "Simulation" ? selection : null;
  const featureRows = featureSelection ? parseFeatureCsv(text, featureSelection) : null;
  const singleRows = featureSelection ? null : parseSingleTableCsv(text, selection as DatabaseBackupTable);
  if ((featureSelection && !featureRows) || (!featureSelection && !singleRows)) return NextResponse.json({ error: featureSelection ? `This CSV is not a valid ${featureSelection} export.` : `This CSV does not match the ${selection} table format.` }, { status: 400 });

  const tables = featureSelection ? restoreOrder.filter((table) => featureRows!.has(table)) : [selection as DatabaseBackupTable];
  const rowsFor = (table: DatabaseBackupTable) => featureSelection ? featureRows!.get(table)! : singleRows!;
  try {
    await prisma.$transaction(async (tx) => {
      for (const table of tables) {
        const delegate = (tx as unknown as Record<string, UpsertDelegate>)[delegateNames[table]];
        for (const source of rowsFor(table)) {
          const row = { ...source };
          for (const [field, value] of Object.entries(row)) if (value !== null && dateFields.has(field)) row[field] = new Date(String(value));
          if (table === "Question" && row.options === null) row.options = Prisma.DbNull;
          const { id, ...data } = row;
          await delegate.upsert({ where: { id: id as string }, create: { id: id as string, ...data }, update: data });
        }
      }
    }, { maxWait: 10_000, timeout: 120_000 });
    const importedRows = tables.reduce((sum, table) => sum + rowsFor(table).length, 0);
    return NextResponse.json({ importedRows });
  } catch (error) {
    console.error(`Database ${selection} import failed`, error);
    return NextResponse.json({ error: `The ${selection} CSV could not be imported. Check that related grade, subject, and creator records already exist.` }, { status: 422 });
  }
}
