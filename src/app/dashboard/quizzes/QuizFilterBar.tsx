import prisma from "@/lib/prisma";
import QuizFilters from "./QuizFilters";
import CsvImportButton from "./CsvImportButton";
import ExportQuizzesButton from "./ExportQuizzesButton";
import BackfillButton from "@/components/BackfillButton";
import type { Prisma } from "@prisma/client";

type TeacherAssignmentWithSubjectAndGrade =
  Prisma.TeacherAssignmentGetPayload<{
    include: { subject: true; grade: true };
  }>;

interface QuizFilterBarProps {
  assessmentType?: "PRACTICE" | "QUIZ";
  userRole: string;
  userId: string;
  filterSubject?: string;
  filterGrade?: number | null;
  filterOutcome?: string;
  filterIndicator?: string;
}

export default async function QuizFilterBar({
  assessmentType = "QUIZ",
  userRole,
  userId,
  filterSubject,
  filterGrade,
  filterOutcome,
  filterIndicator,
}: QuizFilterBarProps) {
  let teacherAssignments: TeacherAssignmentWithSubjectAndGrade[] | null = null;
  if (userRole === "TEACHER") {
    teacherAssignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: userId },
      include: { subject: true, grade: true },
    });
  }

  const [allSubjects, allGrades, allOutcomes] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.grade.findMany({ orderBy: { level: "asc" } }),
    prisma.learningOutcome.findMany({
      select: {
        id: true,
        outcomeText: true,
        grade: true,
        subject: true,
        indicatorText: true,
        _count: { select: { quizzes: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  let filteredSubjects = allSubjects;
  let filteredGrades = allGrades;
  let activeTeacherAssignments = teacherAssignments;
  if (userRole === "TEACHER" && teacherAssignments) {
    activeTeacherAssignments = teacherAssignments.filter((assignment) =>
      (!filterSubject || assignment.subject.name === filterSubject) &&
      (!filterGrade || assignment.grade.level === filterGrade)
    );
    const allowedSubjectIds = new Set(activeTeacherAssignments.map((a) => a.subjectId));
    const allowedGradeIds = new Set(activeTeacherAssignments.map((a) => a.gradeId));
    filteredSubjects = allSubjects.filter((s) => allowedSubjectIds.has(s.id));
    filteredGrades = allGrades.filter((g) => allowedGradeIds.has(g.id));
  }

  const quizGradeLevels = filteredGrades.map((g) => g.level);

  const scopedOutcomes = allOutcomes.filter((o) => {
    if (userRole === "TEACHER" && teacherAssignments && !teacherAssignments.some((assignment) =>
      assignment.subject.name === o.subject && assignment.grade.level === o.grade
    )) return false;
    if (filterSubject && o.subject !== filterSubject) return false;
    if (filterGrade && o.grade !== filterGrade) return false;
    return true;
  });

  // The LearningOutcome table stores one row per indicator; multiple rows share
  // the same outcomeText. Dedupe to one row per outcome so filters/listings
  // surface each real outcome once. Pick the row that actually bears quizzes
  // when one exists so clicking an outcome returns its results.
  const filteredOutcomes: {
    id: string;
    outcomeText: string;
    indicatorText?: string;
  }[] = [];
  const seenOutcomes = new Map<string, (typeof scopedOutcomes)[number]>();
  for (const o of scopedOutcomes) {
    const code = `${o.subject}|${o.grade}|${o.outcomeText}`;
    const existing = seenOutcomes.get(code);
    if (!existing) {
      seenOutcomes.set(code, o);
    } else if ((o._count?.quizzes ?? 0) > (existing._count?.quizzes ?? 0)) {
      seenOutcomes.set(code, o);
    }
  }
  for (const o of seenOutcomes.values()) filteredOutcomes.push(o);

  let filteredIndicators: { id: string; indicatorText: string }[] = [];
  if (filterOutcome) {
    const selectedOutcome = scopedOutcomes.find((o) => o.id === filterOutcome);
    if (selectedOutcome) {
      const outcomeText = selectedOutcome.outcomeText;
      const subject = selectedOutcome.subject;
      const grade = selectedOutcome.grade;
      filteredIndicators = scopedOutcomes
        .filter((o) => o.outcomeText === outcomeText && o.subject === subject && o.grade === grade)
        .map((o) => ({ id: o.id, indicatorText: o.indicatorText }));
    }
  } else {
    filteredIndicators = scopedOutcomes.map((o) => ({
      id: o.id,
      indicatorText: o.indicatorText,
    }));
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <QuizFilters
        subjects={filteredSubjects}
        showSubjectFilter={userRole !== "TEACHER" || new Set(teacherAssignments?.map((assignment) => assignment.subjectId)).size > 1}
        showGradeFilter={userRole !== "TEACHER" || new Set(teacherAssignments?.map((assignment) => assignment.gradeId)).size > 1}
        grades={quizGradeLevels}
        outcomes={filteredOutcomes}
        indicators={filteredIndicators}
        defaultSubject={filterSubject}
        defaultGrade={filterGrade}
        defaultOutcome={filterOutcome}
        defaultIndicator={filterIndicator}
      />
      <div className="flex shrink-0 flex-wrap items-start gap-2 border-t border-slate-100 pt-3 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
        <CsvImportButton assessmentType={assessmentType} />
        <ExportQuizzesButton />
        {userRole === "ADMIN" && <BackfillButton />}
      </div>
    </div>
  );
}
