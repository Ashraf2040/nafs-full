-- CreateEnum
CREATE TYPE "ProficiencyStatus" AS ENUM ('BELOW', 'APPROACHING', 'MEETS', 'EXCEEDS');

-- CreateEnum
CREATE TYPE "TrophyTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "PathStatus" AS ENUM ('PENDING', 'PRACTICING', 'MASTERED');

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "isDiagnostic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "testingWindowId" TEXT;

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "timeSpentSeconds" INTEGER,
ADD COLUMN     "totalItems" INTEGER;

-- CreateTable
CREATE TABLE "TestingWindow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestingWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillMastery" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "testingWindowId" TEXT,
    "masteryLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attemptsCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ProficiencyStatus" NOT NULL DEFAULT 'BELOW',
    "lastAssessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPathItem" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "sequenceOrder" INTEGER NOT NULL,
    "status" "PathStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "LearningPathItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trophy" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "domain" TEXT,
    "tier" "TrophyTier" NOT NULL,
    "name" TEXT NOT NULL,
    "outcomesMastered" INTEGER NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trophy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "criteria" JSONB NOT NULL,
    "rewardBadge" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeParticipation" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ChallengeParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestingWindow_subject_grade_idx" ON "TestingWindow"("subject", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "TestingWindow_name_subject_grade_key" ON "TestingWindow"("name", "subject", "grade");

-- CreateIndex
CREATE INDEX "SkillMastery_studentId_idx" ON "SkillMastery"("studentId");

-- CreateIndex
CREATE INDEX "SkillMastery_outcomeId_idx" ON "SkillMastery"("outcomeId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillMastery_studentId_outcomeId_testingWindowId_key" ON "SkillMastery"("studentId", "outcomeId", "testingWindowId");

-- CreateIndex
CREATE INDEX "LearningPathItem_studentId_idx" ON "LearningPathItem"("studentId");

-- CreateIndex
CREATE INDEX "LearningPathItem_outcomeId_idx" ON "LearningPathItem"("outcomeId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPathItem_studentId_outcomeId_key" ON "LearningPathItem"("studentId", "outcomeId");

-- CreateIndex
CREATE UNIQUE INDEX "Trophy_studentId_subject_domain_tier_key" ON "Trophy"("studentId", "subject", "domain", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeParticipation_challengeId_studentId_key" ON "ChallengeParticipation"("challengeId", "studentId");

-- CreateIndex
CREATE INDEX "Quiz_testingWindowId_idx" ON "Quiz"("testingWindowId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_testingWindowId_fkey" FOREIGN KEY ("testingWindowId") REFERENCES "TestingWindow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillMastery" ADD CONSTRAINT "SkillMastery_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillMastery" ADD CONSTRAINT "SkillMastery_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "LearningOutcome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillMastery" ADD CONSTRAINT "SkillMastery_testingWindowId_fkey" FOREIGN KEY ("testingWindowId") REFERENCES "TestingWindow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPathItem" ADD CONSTRAINT "LearningPathItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPathItem" ADD CONSTRAINT "LearningPathItem_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "LearningOutcome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trophy" ADD CONSTRAINT "Trophy_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipation" ADD CONSTRAINT "ChallengeParticipation_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipation" ADD CONSTRAINT "ChallengeParticipation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
