import type { Prisma } from "@prisma/client";
import type { Db } from "@/lib/skillMastery";

export type ChallengeCriteria = {
  subject: string;
  grade: number;
  domain?: string;
  minMastered: number;
};

export function parseChallengeCriteria(value: unknown): ChallengeCriteria | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const grade = Number(input.grade);
  const minMastered = Number(input.minMastered);
  const domain = typeof input.domain === "string" ? input.domain.trim() : "";

  if (!subject || !Number.isInteger(grade) || grade <= 0) return null;
  if (!Number.isInteger(minMastered) || minMastered < 1 || minMastered > 100) return null;

  return { subject, grade, minMastered, ...(domain ? { domain } : {}) };
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
