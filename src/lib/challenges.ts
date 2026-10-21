import type { Prisma } from "@prisma/client";
import type { Db } from "@/lib/skillMastery";

export type ChallengeCriteria = {
  goalType: "SKILLS" | "QUIZZES";
  subject: string;
  grade: number;
  domain?: string;
  minMastered: number;
  quizIds?: string[];
  minQuizzes?: number;
};

export function parseChallengeCriteria(value: unknown): ChallengeCriteria | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const grade = Number(input.grade);
  const minMastered = Number(input.minMastered);
  const domain = typeof input.domain === "string" ? input.domain.trim() : "";
  const goalType = input.goalType === "QUIZZES" ? "QUIZZES" : "SKILLS";

  if (!subject || !Number.isInteger(grade) || grade <= 0) return null;
  if (goalType === "SKILLS" && (!Number.isInteger(minMastered) || minMastered < 1 || minMastered > 100)) return null;
  if (goalType === "QUIZZES") {
    const quizIds = Array.isArray(input.quizIds)
      ? [...new Set(input.quizIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim())).map((id) => id.trim()))]
      : [];
    const minQuizzes = Number(input.minQuizzes);
    if (quizIds.length === 0 || !Number.isInteger(minQuizzes) || minQuizzes < 1 || minQuizzes > quizIds.length) return null;
    return { goalType, subject, grade, minMastered: 1, quizIds, minQuizzes };
  }

  return { goalType, subject, grade, minMastered, ...(domain ? { domain } : {}) };
}

export function challengeOutcomeWhere(criteria: ChallengeCriteria): Prisma.LearningOutcomeWhereInput {
  return {
    subject: { equals: criteria.subject, mode: "insensitive" },
    grade: criteria.grade,
    ...(criteria.domain
      ? { subDomain: { equals: criteria.domain, mode: "insensitive" } }
      : {}),
  };
}

export async function calculateChallengeProgress(
  db: Db,
  studentId: string,
  criteria: ChallengeCriteria,
) {
  if (criteria.goalType === "QUIZZES" && criteria.quizIds?.length) {
    const completedCount = await db.result.count({
      where: { studentId, quizId: { in: criteria.quizIds } },
    });
    return {
      masteredCount: completedCount,
      progress: Math.min(Math.round((completedCount / (criteria.minQuizzes || criteria.quizIds.length)) * 100), 100),
    };
  }

  const masteredCount = await db.skillMastery.count({
    where: {
      studentId,
      masteryLevel: { gte: 70 },
      outcome: challengeOutcomeWhere(criteria),
    },
  });

  return {
    masteredCount,
    progress: Math.min(Math.round((masteredCount / criteria.minMastered) * 100), 100),
  };
}

export function isChallengeOpen(challenge: {
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
}, now = new Date()) {
  return challenge.isActive && challenge.startDate <= now && (!challenge.endDate || challenge.endDate >= now);
}
