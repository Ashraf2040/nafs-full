ALTER TABLE "User" ADD COLUMN "username" TEXT;

WITH username_bases AS (
  SELECT
    "id",
    left(COALESCE(NULLIF(regexp_replace(regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9._-]', '', 'g'), '^[^a-z0-9]+', '', 'g'), ''), 'user'), 19) AS base
  FROM "User"
)
UPDATE "User" AS users
SET "username" = username_bases.base || '_' || substr(md5(username_bases."id"), 1, 10)
FROM username_bases
WHERE users."id" = username_bases."id";

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
