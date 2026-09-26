import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs", "quiz-mapping-audit");
const data = JSON.parse(await fs.readFile(path.join(outputDir, "audit-data.json"), "utf8"));
const workbook = Workbook.create();
const fontName = "Arial";
const colors = {
  navy: "#17365D",
  blue: "#D9EAF7",
  paleBlue: "#EEF5FB",
  red: "#FDE9E7",
  redText: "#B91C1C",
  amber: "#FFF2CC",
  amberText: "#92400E",
  green: "#E2F0D9",
  greenText: "#166534",
  border: "#D9E2F3",
  text: "#1F2937",
  muted: "#64748B",
};

function colName(index) {
  let result = "";
  let value = index + 1;
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function addDataSheet(name, headers, rows, options = {}) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  sheet.getRange("A1").values = [[options.title ?? name]];
  sheet.getRange("A1").format = {
    font: { name: fontName, size: 14, bold: true, color: colors.navy },
  };
  sheet.getRange("A2").values = [[options.subtitle ?? "Live database extract"]];
  sheet.getRange("A2").format = {
    font: { name: fontName, size: 10, italic: true, color: colors.muted },
  };

  const lastColumn = colName(headers.length - 1);
  sheet.getRange(`A4:${lastColumn}4`).values = [headers];
  sheet.getRange(`A4:${lastColumn}4`).format = {
    fill: colors.navy,
    font: { name: fontName, size: 10, bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "inside", style: "thin", color: "#FFFFFF" },
  };
  sheet.getRange(`A4:${lastColumn}4`).format.rowHeight = 32;

  if (rows.length > 0) {
    const matrix = rows.map((row) => headers.map((header) => row[header] ?? ""));
    const body = sheet.getRange(`A5:${lastColumn}${rows.length + 4}`);
    body.values = matrix;
    body.format = {
      font: { name: fontName, size: 9, color: colors.text },
      verticalAlignment: "top",
      borders: { insideHorizontal: { style: "thin", color: colors.border } },
    };
    body.format.rowHeight = 30;
  }

  sheet.freezePanes.freezeRows(4);
  sheet.freezePanes.freezeColumns(options.freezeColumns ?? 1);
  sheet.getRange(`A1:${lastColumn}${Math.max(5, rows.length + 4)}`).format.font.name = fontName;

  for (const [columnIndex, width] of Object.entries(options.widths ?? {})) {
    const column = colName(Number(columnIndex));
    sheet.getRange(`${column}:${column}`).format.columnWidth = width;
  }

  for (const columnIndex of options.dateColumns ?? []) {
    const column = colName(columnIndex);
    sheet.getRange(`${column}5:${column}${rows.length + 4}`).format.numberFormat = "yyyy-mm-dd hh:mm";
  }

  if (options.statusColumn != null && rows.length > 0) {
    const statusColumn = colName(options.statusColumn);
    const statusRange = sheet.getRange(`${statusColumn}5:${statusColumn}${rows.length + 4}`);
    statusRange.conditionalFormats.add("containsText", {
      text: "MISMATCH",
      format: { fill: colors.red, font: { bold: true, color: colors.redText } },
    });
    statusRange.conditionalFormats.add("containsText", {
      text: "REVIEW",
      format: { fill: colors.amber, font: { bold: true, color: colors.amberText } },
    });
    statusRange.conditionalFormats.add("containsText", {
      text: "OK",
      format: { fill: colors.green, font: { bold: true, color: colors.greenText } },
    });
  }

  return sheet;
}

const summary = workbook.worksheets.add("Summary");
summary.showGridLines = false;
summary.tabColor = colors.navy;
summary.getRange("A2:H2").merge();
summary.getRange("A2").values = [["Quiz outcome and indicator mapping audit"]];
summary.getRange("A2").format = {
  font: { name: fontName, size: 16, bold: true, color: colors.navy },
};
summary.getRange("A3:H3").format.borders = { bottom: { style: "thin", color: colors.border } };
summary.getRange("A4").values = [["Source"]];
summary.getRange("B4:H4").merge();
summary.getRange("B4").values = [[`Live application database, extracted ${data.summary.generatedAt}`]];
summary.getRange("A4:H4").format.font = { name: fontName, size: 10, color: colors.muted, italic: true };

const metrics = [
  ["Imported indicators", data.summary.indicatorCount, "Indicators referenced", data.summary.usedIndicatorCount],
  ["Unused indicators", data.summary.unusedIndicatorCount, "Quizzes", data.summary.quizCount],
  ["Confirmed mismatches", data.summary.mismatchQuizCount, "Suggested remaps", data.summary.reliableSuggestedRemapCount],
  ["Needs manual review", data.summary.reviewQuizCount, "Mappings verified", data.summary.mappedQuizCount],
  ["Unlinked questions", data.summary.unlinkedQuestionCount, "Question scope mismatches", data.summary.scopeMismatchQuestionCount],
];
summary.getRange("A7:D11").values = metrics;
summary.getRange("A7:D11").format = {
  font: { name: fontName, size: 10, color: colors.text },
  verticalAlignment: "center",
  borders: { preset: "all", style: "thin", color: colors.border },
};
summary.getRange("A7:A11").format.fill = colors.paleBlue;
summary.getRange("C7:C11").format.fill = colors.paleBlue;
summary.getRange("A7:A11").format.font.bold = true;
summary.getRange("C7:C11").format.font.bold = true;
summary.getRange("B7:B11").format.font = { name: fontName, size: 12, bold: true, color: colors.navy };
summary.getRange("D7:D11").format.font = { name: fontName, size: 12, bold: true, color: colors.navy };
summary.getRange("A13:H13").merge();
summary.getRange("A13").values = [["Finding"]];
summary.getRange("A13:H13").format = {
  fill: colors.navy,
  font: { name: fontName, size: 10, bold: true, color: "#FFFFFF" },
};
summary.getRange("A14:H16").merge();
summary.getRange("A14").values = [[
  `All ${data.summary.quizCount} quizzes have valid database IDs, but only ${data.summary.usedIndicatorCount} of ${data.summary.indicatorCount} imported indicators are referenced. The backfill process assigned unmatched quizzes to the first indicator in each subject/grade group. As a result, outcome and indicator filters return incomplete or incorrect results.`,
]];
summary.getRange("A14:H16").format = {
  fill: colors.red,
  font: { name: fontName, size: 11, color: colors.redText },
  wrapText: true,
  verticalAlignment: "center",
  borders: { preset: "outside", style: "thin", color: "#FCA5A5" },
};
summary.getRange("A18:H18").merge();
summary.getRange("A18").values = [["Recommended action"]];
summary.getRange("A18:H18").format = {
  fill: colors.navy,
  font: { name: fontName, size: 10, bold: true, color: "#FFFFFF" },
};
summary.getRange("A19:H21").merge();
summary.getRange("A19").values = [[
  "Review the Mismatches sheet, approve high-confidence suggestions, then update both Quiz.outcomeId and every Question.learningOutcomeId for each approved quiz. Low-confidence rows need manual mapping before any database update.",
]];
summary.getRange("A19:H21").format = {
  fill: colors.amber,
  font: { name: fontName, size: 11, color: colors.amberText },
  wrapText: true,
  verticalAlignment: "center",
  borders: { preset: "outside", style: "thin", color: "#FBBF24" },
};
summary.getRange("A:A").format.columnWidth = 25;
summary.getRange("B:B").format.columnWidth = 14;
summary.getRange("C:C").format.columnWidth = 27;
summary.getRange("D:D").format.columnWidth = 14;
summary.getRange("E:H").format.columnWidth = 14;

const mismatchHeaders = [
  "mappingStatus", "recommendationConfidence", "recommendedMatchScore", "title", "subject", "grade",
  "quizId", "quizOutcomeId", "quizOutcomeText", "quizOutcomeIndicator", "recommendedIndicatorId",
  "recommendedOutcomeText", "recommendedIndicatorText", "mismatchReasons", "questionCount",
];
addDataSheet("Mismatches", mismatchHeaders, data.mismatches, {
  title: "Quiz mappings requiring correction",
  subtitle: "Confirmed current-versus-suggested mismatches. Review before changing database records.",
  freezeColumns: 4,
  statusColumn: 0,
  widths: { 0: 14, 1: 14, 2: 12, 3: 48, 4: 13, 5: 9, 6: 25, 7: 25, 8: 58, 9: 58, 10: 25, 11: 58, 12: 58, 13: 60, 14: 12 },
});

const quizHeaders = [
  "mappingStatus", "recommendationConfidence", "recommendedMatchScore", "title", "subject", "grade",
  "quizId", "isPublished", "questionCount", "quizOutcomeId", "quizOutcomeText", "quizOutcomeIndicator",
  "linkedQuestionCount", "unlinkedQuestionCount", "uniqueLinkedIndicatorCount", "availableIndicatorsInOutcome",
  "recommendedIndicatorId", "recommendedOutcomeText", "recommendedIndicatorText", "mismatchReasons", "createdAt",
];
addDataSheet("Quiz map", quizHeaders, data.quizMappings, {
  title: "All quiz-to-outcome and indicator mappings",
  subtitle: "One row per quiz, including current links and suggested mappings.",
  freezeColumns: 4,
  statusColumn: 0,
  dateColumns: [20],
  widths: { 0: 14, 1: 14, 2: 12, 3: 48, 4: 13, 5: 9, 6: 25, 7: 12, 8: 11, 9: 25, 10: 58, 11: 58, 12: 12, 13: 12, 14: 13, 15: 13, 16: 25, 17: 58, 18: 58, 19: 60, 20: 22 },
});

const indicatorHeaders = [
  "mappingStatus", "subject", "grade", "subDomain", "indicatorId", "outcomeText", "indicatorText",
  "directQuizCount", "linkedQuestionCount", "filterReferenceCount", "importedAt",
];
addDataSheet("Imported indicators", indicatorHeaders, data.importedIndicators, {
  title: "Imported learning outcomes and indicators",
  subtitle: "Every LearningOutcome record currently in the database and its quiz/question usage.",
  freezeColumns: 5,
  widths: { 0: 12, 1: 13, 2: 9, 3: 28, 4: 25, 5: 65, 6: 65, 7: 12, 8: 13, 9: 13, 10: 22 },
  dateColumns: [10],
});

const questionHeaders = [
  "mappingStatus", "quizTitle", "subject", "grade", "questionNumber", "quizId", "questionId",
  "questionText", "indicatorId", "indicatorSubject", "indicatorGrade", "outcomeText", "indicatorText",
  "recommendedIndicatorId", "recommendedIndicatorText",
];
addDataSheet("Question map", questionHeaders, data.questionMappings, {
  title: "Question-level indicator mappings",
  subtitle: "One row per question, showing the indicator currently used by filtering.",
  freezeColumns: 5,
  statusColumn: 0,
  widths: { 0: 17, 1: 48, 2: 13, 3: 9, 4: 12, 5: 25, 6: 25, 7: 70, 8: 25, 9: 14, 10: 12, 11: 65, 12: 65, 13: 25, 14: 65 },
});

workbook.recalculate();

for (const [sheetName, range] of [
  ["Summary", "A1:H22"],
  ["Mismatches", "A1:O18"],
  ["Quiz map", "A1:U18"],
  ["Imported indicators", "A1:K18"],
  ["Question map", "A1:O18"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `preview-${sheetName.toLowerCase().replaceAll(" ", "-")}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(outputDir, "quiz-indicator-mapping-audit.xlsx"));

const checks = {};
for (const [sheetName, range] of [
  ["Summary", "A1:H22"],
  ["Mismatches", "A1:O12"],
  ["Quiz map", "A1:U10"],
  ["Imported indicators", "A1:K10"],
  ["Question map", "A1:O10"],
]) {
  checks[sheetName] = (await workbook.inspect({
    kind: "table",
    range: `${sheetName}!${range}`,
    include: "values,formulas",
    tableMaxRows: 12,
    tableMaxCols: 21,
    maxChars: 5000,
  })).ndjson;
}

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});

await fs.writeFile(path.join(outputDir, "workbook-checks.json"), JSON.stringify({ checks, errors: errors.ndjson }, null, 2));
console.log(path.join(outputDir, "quiz-indicator-mapping-audit.xlsx"));
