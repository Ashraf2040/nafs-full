CREATE TABLE "StudyGuide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudyGuide_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudyGuide_gradeId_subjectId_isPublished_idx" ON "StudyGuide"("gradeId", "subjectId", "isPublished");
CREATE INDEX "StudyGuide_creatorId_idx" ON "StudyGuide"("creatorId");

ALTER TABLE "StudyGuide" ADD CONSTRAINT "StudyGuide_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyGuide" ADD CONSTRAINT "StudyGuide_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyGuide" ADD CONSTRAINT "StudyGuide_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
