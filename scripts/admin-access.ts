import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { stdin, stdout } from "node:process";
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is missing. Set it in .env before using this recovery command.");

const poolUrl = new URL(connectionString);
poolUrl.searchParams.delete("sslmode");
const pool = new Pool({
  connectionString: poolUrl.toString(),
  ssl: process.env.NODE_ENV === "production" ? undefined : { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function ask(question: string): Promise<string> {
  const prompt = createInterface({ input: stdin, output: stdout });
  return new Promise((resolve) => prompt.question(question, (answer) => {
    prompt.close();
    resolve(answer.trim());
  }));
}

function askHidden(question: string): Promise<string> {
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envPassword) return Promise.resolve(envPassword);
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return Promise.reject(new Error("Run this command in a terminal to enter the password without displaying it, or set ADMIN_PASSWORD temporarily."));
  }

  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let password = "";
    const finish = (error?: Error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    };
    const onData = (input: Buffer) => {
      for (const character of input.toString()) {
        if (character === "\u0003") return finish(new Error("Cancelled."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f" || character === "\b") password = password.slice(0, -1);
        else if (character >= " ") password += character;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  console.log("Admin account recovery (existing data will not be deleted).\n");
  const username = (await ask("New admin username: ")).toLowerCase();
  const password = await askHidden("New password (at least 8 characters): ");

  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) throw new Error("Username must be 3–30 characters using letters, numbers, dots, underscores, or hyphens.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  const existingAccount = await prisma.user.findUnique({ where: { username } });

  const passwordHash = await bcrypt.hash(password, 12);
  const account = existingAccount
    ? await prisma.user.update({
        where: { id: existingAccount.id },
        data: { password: passwordHash, role: "ADMIN", gradeId: null, classId: null },
        select: { id: true, name: true, username: true, role: true },
      })
    : await prisma.user.create({
        data: { name: username, email: `${username}.${randomUUID()}@admins.nafs.invalid`, username, password: passwordHash, role: "ADMIN" },
        select: { id: true, name: true, username: true, role: true },
      });

  console.log(`\nAdmin access is ready for ${account.name} (${account.username}).`);
  console.log(existingAccount ? "The existing account was updated; its other records were preserved." : "A new admin account was created.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Admin account recovery failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
