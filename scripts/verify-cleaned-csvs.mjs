import fs from "node:fs/promises";
import path from "node:path";
import { Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs", "quiz-cleanup");
const files = process.argv.length > 2 ? process.argv.slice(2) : ["cleaned-indicators.csv", "cleaned-quizzes.csv"];
const results = [];

for (const file of files) {
  const csv = await fs.readFile(path.join(outputDir, file), "utf8");
  const workbook = await Workbook.fromCSV(csv, { sheetName: "Import" });
  const sheet = await workbook.inspect({
    kind: "table",
    sheetId: "Import",
    range: file.includes("indicators") ? "A1:E6" : file.includes("with-images") ? "A1:S6" : "A1:R6",
    include: "values",
    maxChars: 8000,
  });
  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    summary: "CSV formula/error scan",
  });
  results.push({ file, preview: sheet, errors });
}

await fs.writeFile(
  path.join(outputDir, "spreadsheet-validation.json"),
  JSON.stringify(results, null, 2),
  "utf8",
);
console.log(JSON.stringify({ validated: files, artifactToolImports: results.length }, null, 2));
