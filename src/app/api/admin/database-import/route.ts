import { NextResponse } from "next/server";
import Papa from "papaparse";
import { strFromU8, unzipSync } from "fflate";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { databaseBackupTableFields, databaseBackupTableNames, type DatabaseBackupTable } from "@/lib/databaseBackup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type BackupRow = Record<string, unknown> & { id: string };
type BackupTables = Record<DatabaseBackupTable, BackupRow[]>;
type UpsertDelegate = {
  upsert(args: {
    where: { id: string };
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }): Promise<unknown>;
};

const maxArchiveBytes = 100 * 1024 * 1024;
const maxUncompressedBytes = 250 * 1024 * 1024;

function getDelegate(tx: Prisma.TransactionClient, tableName: DatabaseBackupTable) {
  const delegateNames: Record<DatabaseBackupTable, string> = {
    Grade: "grade",
    Subject: "subject",
    Class: "class",
    User: "user",
    TeacherAssignment: "teacherAssignment",
    LearningOutcome: "learningOutcome",
    TestingWindow: "testingWindow",
    Quiz: "quiz",
    StudyGuide: "studyGuide",
    Question: "question",
    Result: "result",
    StudentAnswer: "studentAnswer",
    SkillMastery: "skillMastery",
    LearningPathItem: "learningPathItem",
    Trophy: "trophy",
    Challenge: "challenge",
    ChallengeParticipation: "challengeParticipation",
  };
  return (tx as unknown as Record<string, UpsertDelegate>)[delegateNames[tableName]];
}

function parseManifest(csv: string): Record<string, string> | null {
  const result = Papa.parse<{ key: string; value: string }>(csv, { header: true, skipEmptyLines: "greedy" });
  if (result.errors.length || !result.meta.fields?.includes("key") || !result.meta.fields.includes("value")) return null;
  return Object.fromEntries(result.data.map((row) => [row.key, row.value]));
}

function parseArchive(bytes: Uint8Array): { tables: BackupTables; rowCount: number } | null {
  const expectedFiles = new Set(["manifest.csv", ...databaseBackupTableNames.map((name) => `${name}.csv`)]);
  let uncompressedBytes = 0;
  let invalidArchive = false;
  let tooLarge = false;
  let files: Record<string, Uint8Array>;

  try {
    files = unzipSync(bytes, {
      filter(file) {
        if (!expectedFiles.has(file.name)) {
          invalidArchive = true;
          return false;
        }
        uncompressedBytes += file.originalSize;
        if (file.originalSize > maxUncompressedBytes || uncompressedBytes > maxUncompressedBytes) {
          tooLarge = true;
          return false;
        }
        return true;
      },
    });
  } catch {
    return null;
  }

  if (invalidArchive || tooLarge || Object.keys(files).length !== expectedFiles.size) return null;
  const manifest = parseManifest(strFromU8(files["manifest.csv"]));
  if (!manifest || manifest.format !== "nafs-prep-database-csv-backup" || manifest.formatVersion !== "1") return null;

  const tables = {} as BackupTables;
  let rowCount = 0;

  for (const tableName of databaseBackupTableNames) {
    const expectedFields = [...databaseBackupTableFields[tableName]];
    const parsed = Papa.parse<Record<string, string>>(strFromU8(files[`${tableName}.csv`]), {
      header: true,
      skipEmptyLines: "greedy",
    });
    if (parsed.errors.length || JSON.stringify(parsed.meta.fields) !== JSON.stringify(expectedFields)) return null;

    const seenIds = new Set<string>();
    const rows: BackupRow[] = [];
    for (const csvRow of parsed.data) {
      const row: Record<string, unknown> = {};
      for (const field of expectedFields) {
        const value = csvRow[field];
        if (typeof value !== "string") return null;
        try {
          row[field] = JSON.parse(value) as unknown;
        } catch {
          return null;
        }
      }
      if (typeof row.id !== "string" || row.id.length === 0 || seenIds.has(row.id)) return null;
      seenIds.add(row.id);
      rows.push(row as BackupRow);
    }

    const expectedCount = Number(manifest[`count.${tableName}`]);
    if (!Number.isSafeInteger(expectedCount) || expectedCount !== rows.length) return null;
    rowCount += rows.length;
    if (rowCount > 200_000) return null;
    tables[tableName] = rows;
  }

  return { tables, rowCount };
}

export async function POST(request: Request) {
  const { response } = await requireRole("ADMIN");
  if (response) return response;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxArchiveBytes) {
    return NextResponse.json({ error: "CSV backup archives must be 100 MB or smaller." }, { status: 413 });
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await request.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Choose a valid CSV backup archive." }, { status: 400 });
  }
  if (bytes.byteLength > maxArchiveBytes) {
    return NextResponse.json({ error: "CSV backup archives must be 100 MB or smaller." }, { status: 413 });
  }

  const validated = parseArchive(bytes);
  if (!validated) {
    return NextResponse.json({ error: "This file is not a complete, supported NAFS Prep CSV backup archive." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const tableName of databaseBackupTableNames) {
        const delegate = getDelegate(tx, tableName);
        for (const row of validated.tables[tableName]) {
          const { id, ...update } = row;
          const data = { ...update };
          if (tableName === "Question" && data.options === null) data.options = Prisma.DbNull;
          await delegate.upsert({ where: { id }, create: { id, ...data }, update: data });
        }
      }
    }, { maxWait: 10_000, timeout: 120_000 });

    return NextResponse.json({ importedRows: validated.rowCount });
  } catch (error) {
    console.error("Database CSV backup import failed", error);
    return NextResponse.json(
      { error: "The backup could not be imported. No records were changed; check that it matches this database schema." },
      { status: 422 },
    );
  }
}
