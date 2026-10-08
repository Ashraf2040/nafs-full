import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import prisma from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/guard";

export const runtime = "nodejs";
const MAX_FILE_BYTES = 15 * 1024 * 1024;

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return { cloudName, apiKey, apiSecret };
}

export async function POST(request: Request) {
  const { user, response } = await requireRole("TEACHER", "ADMIN");
  if (response) return response;

  try {
    const config = configureCloudinary();
    if (!config) return NextResponse.json({ error: "Study guide storage is not configured. Add the Cloudinary settings to the deployment." }, { status: 503 });

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const subjectId = typeof body.subjectId === "string" ? body.subjectId : "";
    const gradeId = typeof body.gradeId === "string" ? body.gradeId : "";
    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
    const publicId = typeof body.publicId === "string" ? body.publicId : "";
    const publicIdMatch = /^daily-lesson-plan\/study-guides\/([0-9a-f-]{36})\.pdf$/i.exec(publicId);
    if (!title || title.length > 160 || !subjectId || !gradeId || !fileName || fileName.length > 255 || !publicIdMatch) {
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

    const asset = await cloudinary.api.resource(publicId, { resource_type: "raw" });
    if (asset.bytes <= 0 || asset.bytes > MAX_FILE_BYTES || !asset.secure_url) {
      return NextResponse.json({ error: "The uploaded PDF is empty or larger than 15 MB." }, { status: 400 });
    }
    const guide = await prisma.studyGuide.create({
      data: { title, fileName, fileUrl: asset.secure_url, subjectId, gradeId, creatorId: user!.id },
      include: { subject: { select: { id: true, name: true } }, grade: { select: { id: true, level: true } } },
    });
    return NextResponse.json({ guide }, { status: 201 });
  } catch (error) {
    console.error("STUDY_GUIDE_CREATE_ERROR:", error);
    return NextResponse.json({ error: "The study guide could not be saved. Check the storage and database settings, then try again." }, { status: 500 });
  }
}

// A small authenticated endpoint signs a direct browser-to-Cloudinary upload,
// keeping large PDFs out of Vercel's function request body limit.
export async function PUT() {
  const { response } = await requireRole("TEACHER", "ADMIN");
  if (response) return response;
  const config = configureCloudinary();
  if (!config) return NextResponse.json({ error: "Study guide storage is not configured. Add the Cloudinary settings to the deployment." }, { status: 503 });
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `daily-lesson-plan/study-guides/${randomUUID()}.pdf`;
  const paramsToSign = { public_id: publicId, timestamp };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, config.apiSecret);
  return NextResponse.json({ cloudName: config.cloudName, apiKey: config.apiKey, timestamp, signature, publicId });
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
