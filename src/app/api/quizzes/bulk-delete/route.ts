import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";

type AssessmentType = "PRACTICE" | "QUIZ";

export async function POST(req: Request) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;
    const body = await req.json().catch(() => null);
    const assessmentType = body?.assessmentType as AssessmentType;
    const action = body?.action;
    if (!(assessmentType === "PRACTICE" || assessmentType === "QUIZ") || !(action === "preview" || action === "delete")) {
      return NextResponse.json({ message: "Choose a valid assessment type and action" }, { status: 400 });
    }

    const where = {
      assessmentType,
      ...(user!.role === "TEACHER" ? { creatorId: user!.id } : {}),
    };
    const quizzes = await prisma.quiz.findMany({
      where,
      select: {
        id: true,
        _count: { select: { results: true, simulationSubjects: true } },
      },
    });
    const ids = quizzes.map((quiz) => quiz.id);
    const blockedByResults = assessmentType === "QUIZ" ? quizzes.filter((quiz) => quiz._count.results > 0).length : 0;
    const linkedToSimulations = quizzes.filter((quiz) => quiz._count.simulationSubjects > 0).length;
    if (action === "preview") {
      return NextResponse.json({ count: ids.length, blockedByResults, linkedToSimulations });
    }
    if (ids.length === 0) return NextResponse.json({ deletedCount: 0 });
    if (blockedByResults > 0) {
      return NextResponse.json({ message: `${blockedByResults} quiz${blockedByResults === 1 ? " has" : "zes have"} student submissions and cannot be deleted.` }, { status: 409 });
    }
    if (linkedToSimulations > 0) {
      return NextResponse.json({ message: `${linkedToSimulations} assessment${linkedToSimulations === 1 ? " is" : "s are"} used by simulations. Remove or update those simulations before bulk deletion.` }, { status: 409 });
    }

    const deleted = await prisma.quiz.deleteMany({ where: { id: { in: ids }, ...where } });
    return NextResponse.json({ deletedCount: deleted.count });
  } catch (error) {
    console.error("QUIZ_BULK_DELETE_ERROR:", error);
    return NextResponse.json({ message: "Could not delete assessments" }, { status: 500 });
  }
}
