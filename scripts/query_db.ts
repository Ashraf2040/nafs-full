import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
config();

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString, max: 8 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== QUIZ OUTCOMES (LAST 30) ===');
  const quizzes: any = await prisma.$queryRawUnsafe(`SELECT q.id, q.title, q."subjectId", q."outcomeId", COUNT(qu.id)::int as question_count, COUNT(qu."learningOutcomeId")::int as q_with_outcome FROM "Quiz" q LEFT JOIN "Question" qu ON qu."quizId" = q.id GROUP BY q.id ORDER BY q."createdAt" DESC LIMIT 30`);
  console.log(JSON.stringify(quizzes, null, 2));

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => {
  console.error('FATAL:', e.message);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
