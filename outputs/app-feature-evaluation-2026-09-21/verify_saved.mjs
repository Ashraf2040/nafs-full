import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "outputs/app-feature-evaluation-2026-09-21/NAFS_App_Feature_Evaluation_2026-09-21.xlsx";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const sheets = await workbook.inspect({ kind: "sheet", include: "id,name" });
const summary = await workbook.inspect({ kind: "table", range: "Executive Summary!A6:F27", include: "values,formulas", tableMaxRows: 30, tableMaxCols: 8 });
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "saved workbook formula error scan" });
console.log(JSON.stringify({ sheets: sheets.ndjson, summary: summary.ndjson, errors: errors.ndjson }, null, 2));
