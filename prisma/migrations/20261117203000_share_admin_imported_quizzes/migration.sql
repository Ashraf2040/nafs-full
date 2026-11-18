ALTER TABLE "Quiz" ADD COLUMN "isShared" BOOLEAN NOT NULL DEFAULT false;

-- Share only the imported Grade 6 Science indicator batch with teachers
-- assigned to the exact matching subject and grade.
UPDATE "Quiz" AS quiz
SET "isShared" = true
FROM "Subject" AS subject, "Grade" AS grade
WHERE quiz."subjectId" = subject.id
  AND quiz."gradeId" = grade.id
  AND subject.name = 'Science'
  AND grade.level = 6
  AND quiz.title IN (
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 01',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 02',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 03',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 04',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 05',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 06',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 07',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 08',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 09',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 10',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 11'
  );
