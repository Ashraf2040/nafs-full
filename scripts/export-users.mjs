import { PrismaClient } from "@prisma/client";
import { writeFile } from "node:fs/promises";

const prisma = new PrismaClient();
const rows = await prisma.subject.findMany();

const columns = Object.keys(rows[0] ?? {});
const csv = [
  columns.join(","),
  ...rows.map(row =>
    columns.map(key => JSON.stringify(row[key] ?? "")).join(",")
  ),
].join("\n");

await writeFile("subject.csv", csv);
await prisma.$disconnect();