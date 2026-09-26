import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import prisma from "@/lib/prisma";

export const maxDuration = 300;

export async function POST() {
  try {
    const { user, response } = await requireRole("ADMIN");
    if (response) return response;

    const quizzes = await prisma.quiz.findMany({
      where: { outcomeId: null },
      select: {
        id: true,
        title: true,
        description: true,
        subject: { select: { name: true } },
        grade: { select: { level: true } },
      },
    });

    if (quizzes.length === 0) {
      return NextResponse.json({ success: true, linked: 0, total: 0, message: "All quizzes already linked." });
    }

    const outcomesByKey = new Map<string, { id: string; outcomeText: string; indicatorText: string }[]>();

    const subjectGradeSet = new Set(quizzes.map(q => `${q.subject.name}|${q.grade.level}`));
    for (const key of subjectGradeSet) {
      const [subject, gradeStr] = key.split("|");
      const outcomes = await prisma.learningOutcome.findMany({
        where: { subject, grade: Number(gradeStr) },
        select: { id: true, outcomeText: true, indicatorText: true },
      });
      outcomesByKey.set(key, outcomes);
    }

    const BATCH_SIZE = 50;
    let linked = 0;

    for (let i = 0; i < quizzes.length; i += BATCH_SIZE) {
      const batch = quizzes.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (quiz) => {
          const key = `${quiz.subject.name}|${quiz.grade.level}`;
          const outcomes = outcomesByKey.get(key) || [];

          if (outcomes.length === 0) return;

          let matchedId: string | null = null;
          const t = quiz.title.toLowerCase();
          for (const o of outcomes) {
            if (
              (o.outcomeText && t.includes(o.outcomeText.toLowerCase().slice(0, 40))) ||
              (o.indicatorText && t.includes(o.indicatorText.toLowerCase().slice(0, 40)))
            ) {
              matchedId = o.id;
              break;
            }
          }

          if (!matchedId) {
            const d = (quiz.description || "").toLowerCase();
            for (const o of outcomes) {
              if (
                (o.outcomeText && d.includes(o.outcomeText.toLowerCase().slice(0, 40))) ||
                (o.indicatorText && d.includes(o.indicatorText.toLowerCase().slice(0, 40)))
              ) {
                matchedId = o.id;
                break;
              }
            }
          }

          // Never guess by assigning the first indicator in the scope.
          // Unmatched quizzes remain visible in the response for explicit cleanup.
          if (!matchedId) return;

          await prisma.quiz.update({
            where: { id: quiz.id },
            data: {
              outcomeId: matchedId,
              questions: {
                updateMany: {
                  where: { learningOutcomeId: null },
                  data: { learningOutcomeId: matchedId },
                },
              },
            },
          });

          linked++;
        })
      );
    }

    return NextResponse.json({
      success: true,
      linked,
      total: quizzes.length,
      message: `Linked ${linked} of ${quizzes.length} quizzes to outcomes. Refresh the page to filter by outcome.`,
    });
  } catch (error) {
    console.error("BACKFILL_ERROR:", error);
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
