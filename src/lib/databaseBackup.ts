export const databaseBackupTableFields = {
  Grade: ["id", "level", "name", "createdAt"],
  Subject: ["id", "name", "description", "colorCode", "createdAt"],
  Class: ["id", "name", "gradeId", "createdAt"],
  User: ["id", "name", "email", "password", "image", "role", "gradeId", "classId", "createdAt"],
  TeacherAssignment: ["id", "teacherId", "subjectId", "gradeId", "createdAt"],
  LearningOutcome: ["id", "grade", "subject", "subDomain", "outcomeText", "indicatorText", "subjectRefId", "createdAt"],
  TestingWindow: ["id", "name", "subject", "grade", "startDate", "endDate", "isActive", "createdAt"],
  Quiz: ["id", "title", "description", "isPublished", "dueDate", "isDiagnostic", "assessmentType", "gradeId", "subjectId", "creatorId", "outcomeId", "testingWindowId", "createdAt"],
  Question: ["id", "quizId", "questionText", "questionType", "options", "correctAnswer", "explanation", "imageUrl", "bloomLevel", "difficulty", "learningOutcomeId", "createdAt"],
  Result: ["id", "score", "totalPoints", "timeSpentSeconds", "totalItems", "attemptsCount", "studentId", "quizId", "completedAt"],
  StudentAnswer: ["id", "resultId", "questionId", "studentAnswer", "isCorrect", "createdAt"],
  PracticeCompletion: ["id", "studentId", "quizId", "completedAt"],
  Simulation: ["id", "title", "description", "gradeId", "creatorId", "isPublished", "dueDate", "createdAt"],
  SimulationSubject: ["id", "simulationId", "quizId", "subjectId"],
  SimulationQuestion: ["id", "simulationSubjectId", "questionText", "options", "correctAnswer", "explanation", "imageUrl", "createdAt"],
  SimulationAttempt: ["id", "simulationId", "studentId", "answerSheet", "score", "totalItems", "completedAt"],
  StudyGuide: ["id", "title", "fileName", "fileUrl", "isPublished", "creatorId", "subjectId", "gradeId", "createdAt"],
  SkillMastery: ["id", "studentId", "outcomeId", "testingWindowId", "masteryLevel", "attemptsCount", "correctCount", "status", "lastAssessedAt"],
  LearningPathItem: ["id", "studentId", "outcomeId", "sequenceOrder", "status"],
  Trophy: ["id", "studentId", "subject", "domain", "tier", "name", "outcomesMastered", "earnedAt"],
  Challenge: ["id", "teacherId", "title", "description", "criteria", "rewardBadge", "startDate", "endDate", "isActive", "createdAt"],
  ChallengeParticipation: ["id", "challengeId", "studentId", "progress", "completedAt"],
} as const;
export type DatabaseBackupTable = keyof typeof databaseBackupTableFields;
export type DatabaseBackupSelection = DatabaseBackupTable | "Diagnosis" | "Simulation";
export const databaseBackupTableNames = Object.keys(databaseBackupTableFields) as DatabaseBackupTable[];
export const databaseBackupSelections: DatabaseBackupSelection[] = [...databaseBackupTableNames, "Diagnosis", "Simulation"];
export const diagnosisBackupTables: DatabaseBackupTable[] = ["Quiz", "Question"];
export const simulationBackupTables: DatabaseBackupTable[] = ["Quiz", "Question", "Simulation", "SimulationSubject", "SimulationQuestion", "SimulationAttempt"];
