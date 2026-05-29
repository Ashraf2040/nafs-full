-- CreateIndex
CREATE INDEX "Class_gradeId_idx" ON "Class"("gradeId");

-- CreateIndex
CREATE INDEX "LearningOutcome_grade_idx" ON "LearningOutcome"("grade");

-- CreateIndex
CREATE INDEX "LearningOutcome_subject_idx" ON "LearningOutcome"("subject");

-- CreateIndex
CREATE INDEX "Question_quizId_idx" ON "Question"("quizId");

-- CreateIndex
CREATE INDEX "StudentAnswer_resultId_idx" ON "StudentAnswer"("resultId");

-- CreateIndex
CREATE INDEX "StudentAnswer_questionId_idx" ON "StudentAnswer"("questionId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_teacherId_idx" ON "TeacherAssignment"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_subjectId_idx" ON "TeacherAssignment"("subjectId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_gradeId_idx" ON "TeacherAssignment"("gradeId");
