import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    // Only teachers and admins can upload
    if (userRole === "STUDENT") {
      return NextResponse.json({ error: "Forbidden: Students cannot upload outcomes" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows = parsed.data as any[];

    const normalizedRows = rows.map((row) => {
      const gradeStr = row["Grade"] || "";
      const gradeMatch = gradeStr.match(/\d+/);
      const grade = gradeMatch ? parseInt(gradeMatch[0]) : 0;
      return {
        grade,
        subject: String(row["Subject"] || "").trim(),
        subDomain: String(row["Sub-Domain"] || "").trim() || null,
        outcomeText: String(row["Learning Outcome"] || "").trim(),
        indicatorText: String(row["Indicator"] || "").trim(),
      };
    }).filter(o => o.grade > 0 && o.subject && o.outcomeText && o.indicatorText);

    const uniqueRows = new Map<string, (typeof normalizedRows)[number]>();
    for (const outcome of normalizedRows) {
      const key = [outcome.grade, outcome.subject, outcome.outcomeText, outcome.indicatorText]
        .map(value => String(value).trim().toLowerCase())
        .join("|||");
      uniqueRows.set(key, outcome);
    }
    const outcomesToInsert = [...uniqueRows.values()];

    if (outcomesToInsert.length === 0) {
      return NextResponse.json({ error: "No valid data found in CSV. Check headers." }, { status: 400 });
    }

    // TEACHER SCOPE: Verify teacher is assigned to ALL subjects in the upload
    if (userRole === "TEACHER") {
      const uploadedSubjects = [...new Set(outcomesToInsert.map(o => o.subject))];
      const assignments = await prisma.teacherAssignment.findMany({
        where: { teacherId: userId },
        include: { subject: true },
      });
      const allowedSubjects = assignments.map(a => a.subject.name);
      const disallowed = uploadedSubjects.filter(s => !allowedSubjects.includes(s));
      if (disallowed.length > 0) {
        return NextResponse.json({ 
          error: `You are not assigned to: ${disallowed.join(", ")}` 
        }, { status: 403 });
      }
    }

    const scopes = [...new Set(outcomesToInsert.map(item => `${item.subject}|||${item.grade}`))];
    const existing = await prisma.learningOutcome.findMany({
      where: {
        OR: scopes.map(scope => {
          const [subject, grade] = scope.split("|||");
          return { subject, grade: Number(grade) };
        }),
      },
      select: { grade: true, subject: true, outcomeText: true, indicatorText: true },
    });
    const existingKeys = new Set(existing.map(item =>
      [item.grade, item.subject, item.outcomeText, item.indicatorText]
        .map(value => String(value).trim().toLowerCase())
        .join("|||"),
    ));
    const newOutcomes = outcomesToInsert.filter(item => !existingKeys.has(
      [item.grade, item.subject, item.outcomeText, item.indicatorText]
        .map(value => String(value).trim().toLowerCase())
        .join("|||"),
    ));

    if (newOutcomes.length > 0) await prisma.learningOutcome.createMany({ data: newOutcomes });
    return NextResponse.json({
      message: "Upload successful",
      count: newOutcomes.length,
      skippedDuplicates: outcomesToInsert.length - newOutcomes.length,
    });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
