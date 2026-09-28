import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/guard";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function GET() {
  const { user, response } = await requireAuth();
  if (response) return response;
  const where = user!.role === "STUDENT"
    ? { isPublished: true, gradeId: user!.gradeId ?? "" }
    : user!.role === "TEACHER"
      ? { creatorId: user!.id, grade: { assignments: { some: { teacherId: user!.id } } } }
      : {};

  const [guides, subjects, grades] = await Promise.all([
    prisma.studyGuide.findMany({
      where,
      include: { subject: { select: { id: true, name: true } }, grade: { select: { id: true, level: true } }, creator: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subject.findMany({
      where: user!.role === "TEACHER" ? { assignments: { some: { teacherId: user!.id } } } : {},
      orderBy: { name: "asc" },
    }),
    prisma.grade.findMany({
      where: user!.role === "TEACHER" ? { assignments: { some: { teacherId: user!.id } } } : user!.role === "STUDENT" ? { id: user!.gradeId ?? "" } : {},
      orderBy: { level: "asc" },
    }),
  ]);
  return NextResponse.json({ guides, subjects, grades });
}

export async function POST(request: Request) {
  const { user, response } = await requireRole("TEACHER", "ADMIN");
  if (response) return response;

  try {
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const subjectId = String(form.get("subjectId") ?? "");
    const gradeId = String(form.get("gradeId") ?? "");
    const file = form.get("file");
    if (!title || title.length > 160 || !subjectId || !gradeId || !(file instanceof File)) {
      return NextResponse.json({ error: "Add a title, subject, grade, and PDF file." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_BYTES || (!file.type.toLowerCase().includes("pdf") && !file.name.toLowerCase().endsWith(".pdf"))) {
      return NextResponse.json({ error: "Choose a PDF smaller than 15 MB." }, { status: 400 });
    }
    const [subject, grade] = await Promise.all([
      prisma.subject.findUnique({ where: { id: subjectId } }),
      prisma.grade.findUnique({ where: { id: gradeId } }),
    ]);
    if (!subject || !grade) return NextResponse.json({ error: "Choose a valid subject and grade." }, { status: 400 });
    if (user!.role === "TEACHER") {
      const assignment = await prisma.teacherAssignment.findUnique({ where: { teacherId_subjectId_gradeId: { teacherId: user!.id, subjectId, gradeId } } });
      if (!assignment) return NextResponse.json({ error: "You can only add guides for your assigned subjects and grades." }, { status: 403 });
    }

    const id = randomUUID();
    const safeName = file.name.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(-120) || "study-guide.pdf";
    const storedName = `${id}-${safeName}`;
    const uploadDirectory = path.join(process.cwd(), "public", "study-guides");
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, storedName), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
    const guide = await prisma.studyGuide.create({
      data: { title, fileName: file.name, fileUrl: `/study-guides/${storedName}`, subjectId, gradeId, creatorId: user!.id },
      include: { subject: { select: { id: true, name: true } }, grade: { select: { id: true, level: true } } },
    });
    return NextResponse.json({ guide }, { status: 201 });
  } catch (error) {
    console.error("STUDY_GUIDE_CREATE_ERROR:", error);
    return NextResponse.json({ error: "The study guide could not be uploaded." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { user, response } = await requireRole("TEACHER", "ADMIN");
  if (response) return response;
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== "string" || typeof body.isPublished !== "boolean") {
    return NextResponse.json({ error: "A guide and publish state are required." }, { status: 400 });
  }
  const guide = await prisma.studyGuide.findUnique({ where: { id: body.id } });
  if (!guide) return NextResponse.json({ error: "Study guide not found." }, { status: 404 });
  if (user!.role === "TEACHER") {
    if (guide.creatorId !== user!.id) return NextResponse.json({ error: "You can only publish your own study guides." }, { status: 403 });
    const assignment = await prisma.teacherAssignment.findUnique({ where: { teacherId_subjectId_gradeId: { teacherId: user!.id, subjectId: guide.subjectId, gradeId: guide.gradeId } } });
    if (!assignment) return NextResponse.json({ error: "This guide is outside your assigned classes." }, { status: 403 });
  }
  const updated = await prisma.studyGuide.update({ where: { id: guide.id }, data: { isPublished: body.isPublished } });
  return NextResponse.json({ guide: updated });
}
