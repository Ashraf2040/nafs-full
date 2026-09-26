-- CreateIndex
CREATE INDEX "Challenge_teacherId_idx" ON "Challenge"("teacherId");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
