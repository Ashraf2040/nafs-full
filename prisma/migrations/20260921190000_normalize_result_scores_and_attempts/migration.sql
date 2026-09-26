-- Result.score is the percentage used by dashboards, rankings, and certificates.
-- Recalculate existing rows from their server-graded answers so legacy raw
-- correct-answer counts cannot be mistaken for percentages.
ALTER TABLE "Result"
ADD COLUMN "attemptsCount" INTEGER NOT NULL DEFAULT 1;

WITH answer_totals AS (
  SELECT
    "resultId",
    COUNT(*)::integer AS total_items,
    COUNT(*) FILTER (WHERE "isCorrect" = true)::integer AS correct_items
  FROM "StudentAnswer"
  GROUP BY "resultId"
)
UPDATE "Result" AS result
SET
  score = ROUND((100.0 * totals.correct_items / totals.total_items)::numeric, 2)::double precision,
  "totalPoints" = totals.total_items,
  "totalItems" = totals.total_items
FROM answer_totals AS totals
WHERE result.id = totals."resultId"
  AND totals.total_items > 0;
