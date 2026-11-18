import { config } from "dotenv";

config({ quiet: true });
const { default: prisma } = await import("../src/lib/prisma");

const maxBytes = 15 * 1024 * 1024;
let migrated = 0;
let skipped = 0;
let failed = 0;

try {
  const guides = await prisma.studyGuide.findMany({
    where: { fileData: null },
    select: { id: true, fileName: true, fileUrl: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Found ${guides.length} study guides without a database file.`);

  for (const guide of guides) {
    let url: URL;
    try { url = new URL(guide.fileUrl); } catch { skipped++; continue; }
    if (url.protocol !== "https:" || (url.hostname !== "res.cloudinary.com" && !url.hostname.endsWith(".cloudinary.com"))) {
      skipped++;
      continue;
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: "error" });
      if (!response.ok || !response.body) throw new Error("download failed");
      const declaredSize = Number(response.headers.get("content-length") ?? 0);
      if (declaredSize > maxBytes) throw new Error("file exceeds 15 MB");
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) { await reader.cancel(); throw new Error("file exceeds 15 MB"); }
        chunks.push(value);
      }
      const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
      if (!bytes.subarray(0, Math.min(bytes.length, 1024)).includes(Buffer.from("%PDF-"))) throw new Error("download is not a PDF");

      await prisma.studyGuide.update({
        where: { id: guide.id },
        data: {
          fileData: bytes,
          mimeType: "application/pdf",
          fileSize: bytes.byteLength,
          fileUrl: `/api/study-guides/${guide.id}/file`,
        },
      });
      migrated++;
      console.log(`Stored ${guide.fileName} in the configured database.`);
    } catch (error) {
      failed++;
      console.error(`Could not migrate ${guide.fileName}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  console.log(`Completed: ${migrated} migrated, ${skipped} skipped, ${failed} failed.`);
  if (failed) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
