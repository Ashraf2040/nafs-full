import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";

const oldCsvPath = "D:\\september-new\\GPT-refining-fixed_final_v4_corrected-fully.csv";
const cleanedCsvPath = path.resolve("outputs", "quiz-cleanup", "cleaned-quizzes.csv");
const outputCsvPath = path.resolve("outputs", "quiz-cleanup", "cleaned-quizzes-with-images.csv");
const imageDir = path.resolve("public", "image-source");

const normalize = (value) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const rowKey = (row) => [
  row.quiz_title,
  row.subject,
  row.grade,
  row.question,
  row.option_1,
  row.option_2,
  row.option_3,
  row.option_4,
  row.answer,
  row.explanation,
].map(normalize).join("|||");

const [oldText, cleanedText, imageFiles] = await Promise.all([
  fs.readFile(oldCsvPath, "utf8"),
  fs.readFile(cleanedCsvPath, "utf8"),
  fs.readdir(imageDir),
]);

const oldParsed = Papa.parse(oldText, { header: true, skipEmptyLines: true });
const cleanedParsed = Papa.parse(cleanedText, { header: true, skipEmptyLines: true });
if (oldParsed.errors.length || cleanedParsed.errors.length) throw new Error("A CSV contains parse errors.");

const oldRowsByKey = new Map();
for (const row of oldParsed.data) {
  const key = rowKey(row);
  oldRowsByKey.set(key, [...(oldRowsByKey.get(key) ?? []), row]);
}

const imageSet = new Set(imageFiles.map((name) => name.toLowerCase()));
const usedIds = new Set();
const unmatchedRows = [];
const duplicateMatches = [];
let rowsWithImages = 0;

const updatedRows = cleanedParsed.data.map((row, index) => {
  const candidates = oldRowsByKey.get(rowKey(row)) ?? [];
  const available = candidates.filter((candidate) => candidate.id && !usedIds.has(candidate.id));
  if (available.length === 0) {
    unmatchedRows.push({ row: index + 2, quiz: row.quiz_title, question: row.question });
    return { id: "", ...row };
  }
  if (available.length > 1) duplicateMatches.push({ row: index + 2, quiz: row.quiz_title, question: row.question, ids: available.map((item) => item.id) });
  const id = String(available[0].id).trim();
  usedIds.add(id);
  const imageName = `${id}.png`;
  const imageUrl = imageSet.has(imageName.toLowerCase()) ? `/image-source/${imageName}` : String(row.image_url ?? "").trim();
  if (imageUrl) rowsWithImages += 1;
  return { id, ...row, image_url: imageUrl };
});

if (unmatchedRows.length) {
  throw new Error(`Join failed: ${unmatchedRows.length} unmatched rows.`);
}

const matchedImageIds = new Set(updatedRows.filter((row) => row.image_url).map((row) => `${row.id}.png`.toLowerCase()));
const orphanImages = imageFiles.filter((name) => !matchedImageIds.has(name.toLowerCase()));
if (orphanImages.length > 0) throw new Error(`${orphanImages.length} image files did not match a cleaned quiz row.`);

const headers = ["id", ...(cleanedParsed.meta.fields ?? []).filter((field) => field !== "id")];
const output = Papa.unparse(updatedRows, { columns: headers, quotes: true, newline: "\r\n" });
await fs.writeFile(outputCsvPath, output, "utf8");

console.log(JSON.stringify({
  oldRows: oldParsed.data.length,
  cleanedRows: updatedRows.length,
  matchedQuestionIds: usedIds.size,
  imageFiles: imageFiles.length,
  rowsWithImages,
  orphanImages: orphanImages.length,
  unmatchedRows: unmatchedRows.length,
  duplicateMatches: duplicateMatches.length,
}, null, 2));
