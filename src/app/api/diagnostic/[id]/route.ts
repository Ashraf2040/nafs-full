import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/guard";
import { GET as getQuiz, PUT as updateQuiz, DELETE as deleteQuiz } from "@/app/api/quizzes/[id]/route";

type RouteContext = { params: Promise<{ id: string }> };

async function requireDiagnostic(request: Request, { params }: RouteContext) {
  const { response } = await requireRole("STUDENT", "TEACHER", "ADMIN");
  if (response) return response;
  const { id } = await params;
  const diagnostic = await prisma.quiz.findFirst({ where: { id, isDiagnostic: true }, select: { id: true } });
  if (!diagnostic) return NextResponse.json({ error: "Diagnostic not found" }, { status: 404 });
  return null;
}

export async function GET(request: Request, context: RouteContext) {
  const response = await requireDiagnostic(request, context);
  return response ?? getQuiz(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  const response = await requireDiagnostic(request, context);
  return response ?? updateQuiz(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  const response = await requireDiagnostic(request, context);
  return response ?? deleteQuiz(request, context);
}
