export const databaseBackupTableFields = {
  Grade: ["id", "level", "name", "createdAt"],
  Subject: ["id", "name", "description", "colorCode", "createdAt"],
  Class: ["id", "name", "gradeId", "createdAt"],
  User: ["id", "name", "email", "password", "image", "role", "gradeId", "classId", "createdAt"],
  TeacherAssignment: ["id", "teacherId", "subjectId", "gradeId", "createdAt"],
  LearningOutcome: ["id", "grade", "subject", "subDomain", "outcomeText", "indicatorText", "subjectRefId", "createdAt"],
  TestingWindow: ["id", "name", "subject", "grade", "startDate", "endDate", "isActive", "createdAt"],
  Quiz: ["id", "title", "description", "isPublished", "dueDate", "isDiagnostic", "gradeId", "subjectId", "creatorId", "outcomeId", "testingWindowId", "createdAt"],
  StudyGuide: ["id", "title", "fileName", "fileUrl", "isPublished", "creatorId", "subjectId", "gradeId", "createdAt"],
  Question: ["id", "quizId", "questionText", "questionType", "options", "correctAnswer", "explanation", "imageUrl", "bloomLevel", "difficulty", "learningOutcomeId", "createdAt"],
  Result: ["id", "score", "totalPoints", "timeSpentSeconds", "totalItems", "attemptsCount", "studentId", "quizId", "completedAt"],
  StudentAnswer: ["id", "resultId", "questionId", "studentAnswer", "isCorrect", "createdAt"],
  SkillMastery: ["id", "studentId", "outcomeId", "testingWindowId", "masteryLevel", "attemptsCount", "correctCount", "status", "lastAssessedAt"],
  LearningPathItem: ["id", "studentId", "outcomeId", "sequenceOrder", "status"],
  Trophy: ["id", "studentId", "subject", "domain", "tier", "name", "outcomesMastered", "earnedAt"],
  Challenge: ["id", "teacherId", "title", "description", "criteria", "rewardBadge", "startDate", "endDate", "isActive", "createdAt"],
  ChallengeParticipation: ["id", "challengeId", "studentId", "progress", "completedAt"],
} as const;

export type DatabaseBackupTable = keyof typeof databaseBackupTableFields;
export const databaseBackupTableNames = Object.keys(databaseBackupTableFields) as DatabaseBackupTable[];
