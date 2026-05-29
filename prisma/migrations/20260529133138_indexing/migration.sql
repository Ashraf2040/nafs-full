-- CreateIndex
CREATE INDEX "Quiz_isPublished_idx" ON "Quiz"("isPublished");

-- CreateIndex
CREATE INDEX "Quiz_gradeId_idx" ON "Quiz"("gradeId");

-- CreateIndex
CREATE INDEX "Quiz_subjectId_idx" ON "Quiz"("subjectId");

-- CreateIndex
CREATE INDEX "Result_studentId_idx" ON "Result"("studentId");

-- CreateIndex
CREATE INDEX "Result_quizId_idx" ON "Result"("quizId");

-- CreateIndex
CREATE INDEX "Result_completedAt_idx" ON "Result"("completedAt");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_gradeId_idx" ON "User"("gradeId");
