
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not configured. Add the PostgreSQL connection string to the deployment environment."
  );
}

function positiveInteger(
  value: string | undefined,
  fallback: number,
  maximum: number
) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  pool: Pool;
};

const poolUrl = new URL(connectionString);

// Use explicit SSL configuration instead of the connection string's sslmode.
poolUrl.searchParams.delete("sslmode");

const pool =
  globalForPrisma.pool ||
  new Pool({
    connectionString: poolUrl.toString(),

    max: positiveInteger(process.env.DB_POOL_MAX, 3, 20),
    idleTimeoutMillis: positiveInteger(
      process.env.DB_IDLE_TIMEOUT_MS,
      30000,
      300000
    ),
    connectionTimeoutMillis: positiveInteger(
      process.env.DB_CONNECTION_TIMEOUT_MS,
      30000,
      120000
    ),

    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,

    ssl:
      process.env.NODE_ENV === "development"
        ? { rejectUnauthorized: false }
        : undefined,
  });

if (!globalForPrisma.pool) {
  pool.on("error", (error) => {
    console.error(
      "[database] Idle PostgreSQL connection error:",
      (error as NodeJS.ErrnoException).code ?? error.name
    );
  });
}

globalForPrisma.pool = pool;

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter });

globalForPrisma.prisma = prisma;

export default prisma;
