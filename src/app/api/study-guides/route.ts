import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/guard";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const { user, response } = await requireRole("TEACHER", "ADMIN");
  if (response) return response;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FILE_BYTES + 256 * 1024) return NextResponse.json({ error: "Study guide uploads must be smaller than 15 MB." }, { status: 413 });

  try {
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const subjectId = String(form.get("subjectId") ?? "");
    const gradeId = String(form.get("gradeId") ?? "");
    const uploaded = form.get("file");
    if (!(uploaded instanceof File) || uploaded.size <= 0 || uploaded.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Choose a non-empty PDF smaller than 15 MB." }, { status: 400 });
    }
    const fileName = uploaded.name.trim().replace(/[\\/\r\n\0]/g, "_");
    const fileData = new Uint8Array(await uploaded.arrayBuffer());
    const isPdf = fileName.toLowerCase().endsWith(".pdf") && fileData.length >= 5 && new TextDecoder().decode(fileData.subarray(0, 5)) === "%PDF-";
    if (!isPdf) return NextResponse.json({ error: "The uploaded file is not a valid PDF." }, { status: 400 });
    if (!title || title.length > 160 || !subjectId || !gradeId || !fileName || fileName.length > 255) {
      return NextResponse.json({ error: "Add a valid title, subject, grade, and uploaded PDF." }, { status: 400 });
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
    const guide = await prisma.studyGuide.create({
      data: { id, title, fileName, fileUrl: `/api/study-guides/${id}/file`, fileData, mimeType: "application/pdf", fileSize: fileData.byteLength, subjectId, gradeId, creatorId: user!.id },
      select: { id: true, title: true, fileName: true, fileUrl: true, fileSize: true, mimeType: true, isPublished: true, createdAt: true, subject: { select: { id: true, name: true } }, grade: { select: { id: true, level: true } } },
    });
    return NextResponse.json({ guide }, { status: 201 });
  } catch (error) {
    console.error("STUDY_GUIDE_CREATE_ERROR:", error);
    return NextResponse.json({ error: "The study guide could not be saved. Check the storage and database settings, then try again." }, { status: 500 });
  }
}

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
      select: { id: true, title: true, fileName: true, fileUrl: true, fileSize: true, mimeType: true, isPublished: true, createdAt: true, subject: { select: { id: true, name: true } }, grade: { select: { id: true, level: true } }, creator: { select: { name: true } } },
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
