import prisma from "@/lib/prisma";
import QuizFilters from "./QuizFilters";
import CsvImportButton from "./CsvImportButton";

interface QuizFilterBarProps {
  userRole: string;
  userId: string;
  filterSubject?: string;
  filterGrade?: number | null;
  filterOutcome?: string;
  filterIndicator?: string;
}

export default async function QuizFilterBar({
  userRole,
  userId,
  filterSubject,
  filterGrade,
  filterOutcome,
  filterIndicator,
}: QuizFilterBarProps) {
  let teacherAssignments: any[] | null = null;
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
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  let filteredSubjects = allSubjects;
  let filteredGrades = allGrades;
  if (userRole === "TEACHER" && teacherAssignments) {
    const allowedSubjectIds = new Set(teacherAssignments.map((a) => a.subjectId));
    const allowedGradeIds = new Set(teacherAssignments.map((a) => a.gradeId));
    filteredSubjects = allSubjects.filter((s) => allowedSubjectIds.has(s.id));
    filteredGrades = allGrades.filter((g) => allowedGradeIds.has(g.id));
  }

  const quizGradeLevels = filteredGrades.map((g) => g.level);

  const filteredOutcomes = allOutcomes.filter((o) => {
    if (filterSubject && o.subject !== filterSubject) return false;
    if (filterGrade && o.grade !== filterGrade) return false;
    return true;
  });

  let filteredIndicators: { id: string; indicatorText: string }[] = [];
  if (filterOutcome) {
    const outcomeData = allOutcomes.find((o) => o.id === filterOutcome);
    if (outcomeData) filteredIndicators = [{ id: outcomeData.id, indicatorText: outcomeData.indicatorText }];
  } else {
    filteredIndicators = filteredOutcomes.map((o) => ({
      id: o.id,
      indicatorText: o.indicatorText,
    }));
  }

  return (
    <>
      <QuizFilters
        subjects={filteredSubjects}
        grades={quizGradeLevels}
        outcomes={filteredOutcomes}
        indicators={filteredIndicators}
        defaultSubject={filterSubject}
        defaultGrade={filterGrade}
        defaultOutcome={filterOutcome}
        defaultIndicator={filterIndicator}
      />
      <CsvImportButton />
    </>
  );
}
