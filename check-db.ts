import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const teacher = await prisma.user.findUnique({
    where: { email: "layla.samir@nafs.edu" },
    select: { id: true, assignments: { include: { subject: true, grade: true } } },
  });
  console.log("Teacher:", teacher?.id);
  console.log("Assignments:", JSON.stringify(teacher?.assignments, null, 2));

  // Find all outcomes for math grade 3
  const outcomes = await prisma.learningOutcome.findMany({
    where: { subject: "Math", grade: 3 },
    select: { id: true },
    take: 3,
  });
  console.log("Some math3 outcomes:", outcomes.map(o => o.id));

  // The assignment gives subjectId and gradeId. Build the ACTUAL query the grid runs.
  const asgn = teacher!.assignments[0];
  const outcomeId = outcomes[0].id;

  const whereClause: any = { OR: [{ subjectId: asgn.subjectId, gradeId: asgn.gradeId }] };
  if (whereClause.OR) {
    const existingOR = whereClause.OR;
    delete whereClause.OR;
    whereClause.AND = [{ OR: existingOR }, { OR: [{ outcomeId }, { questions: { some: { learningOutcomeId: outcomeId } } }] }];
  }
  const count = await prisma.quiz.count({ where: whereClause });
  console.log("Teacher+outcome query count:", count);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});