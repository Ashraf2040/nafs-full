CREATE TYPE "AssessmentType" AS ENUM ('PRACTICE', 'QUIZ');

ALTER TABLE "Quiz" ADD COLUMN "assessmentType" "AssessmentType" NOT NULL DEFAULT 'PRACTICE';
UPDATE "Quiz" SET "assessmentType" = 'QUIZ' WHERE "isDiagnostic" = true;

CREATE TABLE "PracticeCompletion" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeCompletion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PracticeCompletion_studentId_quizId_key" ON "PracticeCompletion"("studentId", "quizId");
CREATE INDEX "PracticeCompletion_studentId_idx" ON "PracticeCompletion"("studentId");
CREATE INDEX "PracticeCompletion_quizId_idx" ON "PracticeCompletion"("quizId");
ALTER TABLE "PracticeCompletion" ADD CONSTRAINT "PracticeCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeCompletion" ADD CONSTRAINT "PracticeCompletion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "gradeId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Simulation_gradeId_isPublished_idx" ON "Simulation"("gradeId", "isPublished");
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SimulationSubject" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    CONSTRAINT "SimulationSubject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SimulationSubject_simulationId_subjectId_key" ON "SimulationSubject"("simulationId", "subjectId");
CREATE UNIQUE INDEX "SimulationSubject_simulationId_quizId_key" ON "SimulationSubject"("simulationId", "quizId");
ALTER TABLE "SimulationSubject" ADD CONSTRAINT "SimulationSubject_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationSubject" ADD CONSTRAINT "SimulationSubject_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationSubject" ADD CONSTRAINT "SimulationSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SimulationAttempt" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answerSheet" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "totalItems" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimulationAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SimulationAttempt_simulationId_studentId_key" ON "SimulationAttempt"("simulationId", "studentId");
CREATE INDEX "SimulationAttempt_studentId_idx" ON "SimulationAttempt"("studentId");
ALTER TABLE "SimulationAttempt" ADD CONSTRAINT "SimulationAttempt_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SimulationAttempt" ADD CONSTRAINT "SimulationAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
