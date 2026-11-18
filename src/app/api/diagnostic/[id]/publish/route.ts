import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/guard";
import { POST as publishQuiz } from "@/app/api/quizzes/[id]/publish/route";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { response } = await requireRole("TEACHER", "ADMIN");
  if (response) return response;
  const { id } = await context.params;
  const diagnostic = await prisma.quiz.findFirst({ where: { id, isDiagnostic: true }, select: { id: true } });
  if (!diagnostic) return NextResponse.json({ error: "Diagnostic not found" }, { status: 404 });
  return publishQuiz(request, context);
}
