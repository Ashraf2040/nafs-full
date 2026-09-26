-- One durable best-result row per student and quiz. attemptsCount tracks the
-- number of allowed attempts and prevents concurrent duplicate result rows.
CREATE UNIQUE INDEX "Result_studentId_quizId_key"
ON "Result"("studentId", "quizId");
