import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

export async function GET() {
  try {
  const { user, response } = await requireRole("ADMIN", "TEACHER", "STUDENT");
  if (response) return response;
  const isStudent = user!.role === "STUDENT";
  let simulationWhere: any = isStudent ? { isPublished: true, gradeId: user!.gradeId ?? "" } : {};
  if (user!.role === "TEACHER") {
    const assignments = await prisma.teacherAssignment.findMany({ where: { teacherId: user!.id }, select: { subjectId: true, gradeId: true } });
    const byGrade = new Map<string, Set<string>>();
    for (const assignment of assignments) {
      const subjects = byGrade.get(assignment.gradeId) ?? new Set<string>();
      subjects.add(assignment.subjectId);
      byGrade.set(assignment.gradeId, subjects);
    }
    simulationWhere = byGrade.size ? { OR: [...byGrade].map(([gradeId, subjectIds]) => ({ gradeId, subjects: { every: { subjectId: { in: [...subjectIds] } } } })) } : { id: "none" };
  }
  const simulations = await prisma.simulation.findMany({
    where: simulationWhere,
    include: {
      grade: { select: { level: true } },
      subjects: { include: { subject: { select: { name: true } }, questions: { select: { id: true } }, quiz: { select: { title: true, _count: { select: { questions: true } } } } } },
      attempts: isStudent ? { where: { studentId: user!.id }, select: { score: true, totalItems: true, completedAt: true } } : { include: { student: { select: { name: true, email: true, class: { select: { name: true } } } } } },
    }, orderBy: { createdAt: "desc" },
  });
  const quizzes = isStudent ? [] : await prisma.quiz.findMany({ where: { assessmentType: "QUIZ", grade: user!.role === "TEACHER" ? { assignments: { some: { teacherId: user!.id } } } : undefined }, select: { id: true, title: true, grade: { select: { level: true } }, subject: { select: { id: true, name: true } }, _count: { select: { questions: true } } }, orderBy: { createdAt: "desc" } });
  const grades = isStudent ? [] : await prisma.grade.findMany({ where: user!.role === "TEACHER" ? { assignments: { some: { teacherId: user!.id } } } : undefined, select: { level: true }, orderBy: { level: "asc" } });
  const subjects = isStudent ? [] : await prisma.subject.findMany({ where: user!.role === "TEACHER" ? { assignments: { some: { teacherId: user!.id } } } : undefined, select: { id: true, name: true, ...(user!.role === "TEACHER" ? { assignments: { where: { teacherId: user!.id }, select: { grade: { select: { level: true } } } } } : {}) }, orderBy: { name: "asc" } });
  const formattedSimulations = simulations.map(simulation => ({ ...simulation, subjects: simulation.subjects.map(section => ({ ...section, questionCount: section.quiz?._count.questions ?? section.questions.length })) }));
  return NextResponse.json({ simulations: formattedSimulations, quizzes, subjects, grades });
  } catch (error) {
    console.error("SIMULATIONS_LIST_ERROR:", error);
    return NextResponse.json({ message: "Could not load simulations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user, response } = await requireRole("ADMIN", "TEACHER");
  if (response) return response;
  const { title, description, gradeLevel, quizIds, customSubjects } = await req.json();
  const isCustom = Array.isArray(customSubjects);
  const selectedSubjectIds = isCustom ? customSubjects.map((item: any) => String(item.subjectId)) : [];
  if (typeof title !== "string" || !title.trim()) return NextResponse.json({ message: "Enter a simulation title" }, { status: 400 });
  if (isCustom) {
    if (customSubjects.length < 2 || customSubjects.length > 3 || new Set(selectedSubjectIds).size !== customSubjects.length) return NextResponse.json({ message: "Choose two or three different subjects" }, { status: 400 });
    if (customSubjects.some((group: any) => !Array.isArray(group.questions) || group.questions.length < 1 || group.questions.some((q: any) => !String(q.questionText || "").trim() || !String(q.correctAnswer || "").trim() || !Array.isArray(q.options) || q.options.length < 2))) return NextResponse.json({ message: "Every custom question needs text, at least two options, and a correct answer" }, { status: 400 });
  } else if (!Array.isArray(quizIds) || quizIds.length < 2 || quizIds.length > 3 || new Set(quizIds).size !== quizIds.length) return NextResponse.json({ message: "Choose two or three quizzes" }, { status: 400 });
  const grade = await prisma.grade.findUnique({ where: { level: Number(gradeLevel) } });
  if (!grade) return NextResponse.json({ message: "Select a valid grade" }, { status: 400 });
  const quizzes = isCustom ? [] : await prisma.quiz.findMany({ where: { id: { in: quizIds }, assessmentType: "QUIZ", gradeId: grade.id }, include: { subject: true } });
  const subjectIds = isCustom ? selectedSubjectIds : quizzes.map(q => q.subjectId);
  if (!isCustom && (quizzes.length !== quizIds.length || new Set(subjectIds).size !== quizzes.length)) return NextResponse.json({ message: "Choose one graded quiz per subject for the selected grade" }, { status: 400 });
  if (isCustom) {
    const subjectCount = await prisma.subject.count({ where: { id: { in: subjectIds } } });
    if (subjectCount !== subjectIds.length) return NextResponse.json({ message: "One or more selected subjects do not exist" }, { status: 400 });
  }
  if (user!.role === "TEACHER") {
    const assigned = await prisma.teacherAssignment.findMany({ where: { teacherId: user!.id, gradeId: grade.id, subjectId: { in: subjectIds } }, select: { subjectId: true } });
    if (assigned.length !== subjectIds.length) return NextResponse.json({ message: "You must be assigned to every selected subject for this grade" }, { status: 403 });
  }
  const subjectRecords = isCustom
    ? customSubjects.map((group: any) => ({ subjectId: String(group.subjectId), questions: { create: group.questions.map((q: any) => ({ questionText: String(q.questionText).trim(), options: q.options.map(String), correctAnswer: String(q.correctAnswer).trim(), explanation: q.explanation || null })) } }))
    : quizzes.map(q => ({ quizId: q.id, subjectId: q.subjectId }));
  const simulation = await prisma.simulation.create({ data: { title: title.trim(), description: description?.trim() || null, gradeId: grade.id, creatorId: user!.id, isPublished: false, subjects: { create: subjectRecords } } });
  return NextResponse.json({ simulation }, { status: 201 });
}
