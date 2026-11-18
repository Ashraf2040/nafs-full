ALTER TABLE "StudyGuide"
  ADD COLUMN "fileData" BYTEA,
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "fileSize" INTEGER;
