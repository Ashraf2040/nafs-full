import { NextResponse } from "next/server";
import Papa from "papaparse";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";
import { databaseBackupTableFields, databaseBackupTableNames, type DatabaseBackupSelection, type DatabaseBackupTable } from "@/lib/databaseBackup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Row = Record<string, unknown>;
type Delegate = { findMany(args?: Record<string, unknown>): Promise<Row[]> };

async function exportFeature(selection: "Diagnosis" | "Simulation") {
  const db = prisma as unknown as Record<string, Delegate>;
  if (selection === "Diagnosis") {
    const quizzes = await db.quiz.findMany({ where: { isDiagnostic: true } });
    const questions = await db.question.findMany({ where: { quizId: { in: quizzes.map((quiz) => quiz.id) } } });
    return { Quiz: quizzes, Question: questions };
  }
  const simulations = await db.simulation.findMany();
  const ids = simulations.map((simulation) => simulation.id);
  const subjects = await db.simulationSubject.findMany({ where: { simulationId: { in: ids } } });
  const subjectIds = subjects.map((subject) => subject.id);
  const linkedQuizIds = [...new Set(subjects.map((subject) => subject.quizId).filter((id): id is string => typeof id === "string"))];
  const [questions, attempts, linkedQuizzes, linkedQuizQuestions] = await Promise.all([
    db.simulationQuestion.findMany({ where: { simulationSubjectId: { in: subjectIds } } }),
    db.simulationAttempt.findMany({ where: { simulationId: { in: ids } } }),
    db.quiz.findMany({ where: { id: { in: linkedQuizIds } } }),
    db.question.findMany({ where: { quizId: { in: linkedQuizIds } } }),
  ]);
  return { Quiz: linkedQuizzes, Question: linkedQuizQuestions, Simulation: simulations, SimulationSubject: subjects, SimulationQuestion: questions, SimulationAttempt: attempts };
}

export async function GET(request: Request) {
  const { response } = await requireRole("ADMIN");
  if (response) return response;
  const selection = new URL(request.url).searchParams.get("table") as DatabaseBackupSelection | null;
  if (!selection || ![...databaseBackupTableNames, "Diagnosis", "Simulation"].includes(selection)) return NextResponse.json({ error: "Choose a valid table to export." }, { status: 400 });
  try {
    const db = prisma as unknown as Record<string, Delegate>;
    let csv: string;
    if (selection === "Diagnosis" || selection === "Simulation") {
      const tables = await exportFeature(selection);
      const rows = Object.entries(tables).flatMap(([table, records]) => records.map((data) => ({ __table: table, id: String(data.id), data: JSON.stringify(data) })));
      csv = Papa.unparse({ fields: ["__table", "id", "data"], data: rows }, { newline: "\r\n" });
    } else {
      const delegateName = selection[0].toLowerCase() + selection.slice(1);
      const rows = await db[delegateName].findMany();
      const fields = databaseBackupTableFields[selection as DatabaseBackupTable] as readonly string[];
      const data = rows.map((row) => Object.fromEntries(fields.map((field) => [field, JSON.stringify(row[field] ?? null)])));
      csv = Papa.unparse({ fields: [...fields], data }, { newline: "\r\n" });
    }
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(`\uFEFF${csv}`, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nafs-prep-${selection}-${date}.csv"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    console.error("Database table export failed", error);
    return NextResponse.json({ error: "The table CSV could not be created." }, { status: 500 });
  }
}
