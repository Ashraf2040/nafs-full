/*
  Warnings:

  - You are about to drop the column `dueDate` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `gradeTarget` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `grades` on the `TeacherAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `gradeLevel` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[teacherId,subjectId,gradeId]` on the table `TeacherAssignment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `gradeId` to the `Quiz` table without a default value. This is not possible if the table is not empty.
  - Made the column `createdAt` on table `Subject` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `gradeId` to the `TeacherAssignment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "TeacherAssignment_teacherId_subjectId_key";

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "dueDate",
DROP COLUMN "gradeTarget",
ADD COLUMN     "gradeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Subject" ALTER COLUMN "createdAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "TeacherAssignment" DROP COLUMN "grades",
ADD COLUMN     "gradeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "gradeLevel",
ADD COLUMN     "gradeId" TEXT;

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grade_level_key" ON "Grade"("level");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_teacherId_subjectId_gradeId_key" ON "TeacherAssignment"("teacherId", "subjectId", "gradeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
