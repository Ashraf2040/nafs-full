import prisma from "@/lib/prisma";
import { Prisma, ProficiencyStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

export type Db = PrismaClient | Prisma.TransactionClient;

export function getProficiencyStatus(masteryLevel: number): ProficiencyStatus {
  if (masteryLevel >= 90) return "EXCEEDS";
  if (masteryLevel >= 70) return "MEETS";
  if (masteryLevel >= 50) return "APPROACHING";
  return "BELOW";
}

export async function upsertSkillMastery(
  studentId: string,
  outcomeId: string,
  isCorrect: boolean,
  testingWindowId?: string | null,
  db: Db = prisma
) {
  const existing = await db.skillMastery.findFirst({
    where: { studentId, outcomeId, testingWindowId: testingWindowId ?? null },
  });

  if (existing) {
    const newAttempts = existing.attemptsCount + 1;
    const newCorrect = existing.correctCount + (isCorrect ? 1 : 0);
    const newLevel = Math.round((newCorrect / newAttempts) * 100);

    await db.skillMastery.update({
      where: { id: existing.id },
      data: {
        attemptsCount: newAttempts,
        correctCount: newCorrect,
        masteryLevel: newLevel,
        status: getProficiencyStatus(newLevel),
        lastAssessedAt: new Date(),
      },
    });
  } else {
    const newLevel = isCorrect ? 100 : 0;
    await db.skillMastery.create({
      data: {
        studentId,
        outcomeId,
        testingWindowId: testingWindowId ?? null,
        attemptsCount: 1,
        correctCount: isCorrect ? 1 : 0,
        masteryLevel: newLevel,
        status: getProficiencyStatus(newLevel),
      },
    });
  }
}

export async function checkTrophyAwards(
  studentId: string,
  subject: string,
  grade: number,
  db: Db = prisma
) {
  const domains = await db.learningOutcome.groupBy({
    by: ["subDomain"],
    where: { subject, grade, subDomain: { not: null } },
  });

  for (const d of domains) {
    const subDomain = d.subDomain!;
    const [mastered, total] = await Promise.all([
      db.skillMastery.count({
        where: {
          studentId,
          outcome: { subject, grade, subDomain },
          masteryLevel: { gte: 70 },
        },
      }),
      db.learningOutcome.count({ where: { subject, grade, subDomain } }),
    ]);

    const tiers = [
      { tier: "PLATINUM" as const, min: total },
      { tier: "GOLD" as const, min: Math.ceil(total * 0.7) },
      { tier: "SILVER" as const, min: Math.ceil(total * 0.4) },
      { tier: "BRONZE" as const, min: Math.min(3, total) },
    ];

    for (const { tier, min } of tiers) {
      if (mastered >= min && min > 0) {
        await db.trophy.upsert({
          where: { studentId_subject_domain_tier: { studentId, subject, domain: subDomain, tier } },
          update: { outcomesMastered: mastered },
          create: {
            studentId, subject, domain: subDomain, tier,
            name: `${subDomain} — ${tier.charAt(0) + tier.slice(1).toLowerCase()}`,
            outcomesMastered: mastered,
          },
        });
      }
    }
  }
}
