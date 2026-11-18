-- The importer adds the T1 suffix to titles when it avoids title collisions.
-- These are the exact saved titles for the imported Grade 6 Science batch.
UPDATE "Quiz" AS quiz
SET "isShared" = true
FROM "Subject" AS subject, "Grade" AS grade
WHERE quiz."subjectId" = subject.id
  AND quiz."gradeId" = grade.id
  AND subject.name = 'Science'
  AND grade.level = 6
  AND quiz.title IN (
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 01 T1',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 02 T1',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 03 T1',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 04 T1',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 05 T1',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 06 T1',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 07 T1',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 08 T1',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 09 T1',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 10 T1',
    'Future Scientists Challenge - Grade 6 Science - Weeks 1-3 - Indicator 11 T1'
  );
