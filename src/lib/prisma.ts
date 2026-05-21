// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient;
  pool: Pool;
};

const pool = globalForPrisma.pool || new Pool({ 
  connectionString,
  max: 3,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 10000,
});
globalForPrisma.pool = pool;

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter });

globalForPrisma.prisma = prisma;

export default prisma;