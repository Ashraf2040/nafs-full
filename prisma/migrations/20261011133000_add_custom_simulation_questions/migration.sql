ALTER TABLE "SimulationSubject" ALTER COLUMN "quizId" DROP NOT NULL;

CREATE TABLE "SimulationQuestion" (
    "id" TEXT NOT NULL,
    "simulationSubjectId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimulationQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SimulationQuestion_simulationSubjectId_idx" ON "SimulationQuestion"("simulationSubjectId");
ALTER TABLE "SimulationQuestion" ADD CONSTRAINT "SimulationQuestion_simulationSubjectId_fkey" FOREIGN KEY ("simulationSubjectId") REFERENCES "SimulationSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
