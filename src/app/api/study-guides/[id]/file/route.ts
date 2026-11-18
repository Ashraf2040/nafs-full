import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth();
  if (response) return response;
  const { id } = await params;
  const guide = await prisma.studyGuide.findUnique({ where: { id }, select: { fileName: true, fileUrl: true, fileData: true, mimeType: true, isPublished: true, creatorId: true, gradeId: true, subjectId: true } });
  if (!guide) return NextResponse.json({ error: "Study guide not found." }, { status: 404 });

  if (user!.role === "STUDENT") {
    if (!guide.isPublished || guide.gradeId !== user!.gradeId) return NextResponse.json({ error: "Study guide not found." }, { status: 404 });
  } else if (user!.role === "TEACHER") {
    if (guide.creatorId !== user!.id) return NextResponse.json({ error: "Study guide not found." }, { status: 404 });
    const assignment = await prisma.teacherAssignment.findUnique({ where: { teacherId_subjectId_gradeId: { teacherId: user!.id, subjectId: guide.subjectId, gradeId: guide.gradeId } }, select: { id: true } });
    if (!assignment) return NextResponse.json({ error: "Study guide not found." }, { status: 404 });
  } else if (user!.role !== "ADMIN") {
    return NextResponse.json({ error: "Study guide not found." }, { status: 404 });
  }

  if (guide.fileData) {
    const safeName = guide.fileName.replace(/[\r\n"]/g, "_");
    return new Response(new Uint8Array(guide.fileData), { headers: {
      "Content-Type": guide.mimeType || "application/pdf",
      "Content-Length": String(guide.fileData.byteLength),
      "Content-Disposition": `inline; filename="study-guide.pdf"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  }

  // Existing Cloudinary-backed guides continue working until they are reuploaded.
  try {
    const legacyUrl = new URL(guide.fileUrl);
    if (legacyUrl.protocol === "https:" && (legacyUrl.hostname === "res.cloudinary.com" || legacyUrl.hostname.endsWith(".cloudinary.com"))) return NextResponse.redirect(legacyUrl);
  } catch { /* Old rows without a valid external link cannot be opened. */ }
  return NextResponse.json({ error: "This guide has no stored PDF file. Reupload it to make it available." }, { status: 404 });
}
