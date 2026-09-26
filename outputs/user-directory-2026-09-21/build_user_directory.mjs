import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs/user-directory-2026-09-21";
const outputPath = `${outputDir}/NAFS_User_Directory_and_Credential_Status.xlsx`;
const font = "Arial";
const navy = "#17324D";
const blue = "#2F75B5";
const lightBlue = "#D9EAF7";
const lightRed = "#FCE8E6";
const red = "#B91C1C";
const lightAmber = "#FFF2CC";
const amber = "#9A6700";

const users = [
  ["Ashraf Elsayed","ashrafflefl2030@gmail.com","ADMIN","","","Password configured","Not retrievable (secure hash)","Reset immediately","2026-09-15"],
  ["Ahmad Tarek","ahmad.tarek@nafs.edu","TEACHER","","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Fatima Khalil","fatima.khalil@nafs.edu","TEACHER","","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Khaled Mahmoud","khaled.mahmoud@nafs.edu","TEACHER","","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Layla Samir","layla.samir@nafs.edu","TEACHER","","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Nour Ibrahim","nour.ibrahim@nafs.edu","TEACHER","","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Omar Hassan","omar.hassan@nafs.edu","TEACHER","","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Yasmin Ahmed","yasmin.ahmed@nafs.edu","TEACHER","","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Youssef Adel","youssef.adel@nafs.edu","TEACHER","","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Nourhan Hafez","student10@nafs.edu","STUDENT","Grade 3","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Seif El-Din","student11@nafs.edu","STUDENT","Grade 6","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Aya Kamal","student12@nafs.edu","STUDENT","Grade 6","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Marwan Said","student13@nafs.edu","STUDENT","Grade 6","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Reem Ashraf","student14@nafs.edu","STUDENT","Grade 6","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Tamer Hosny","student15@nafs.edu","STUDENT","Grade 6","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Dalia Ibrahim","student16@nafs.edu","STUDENT","Grade 6","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Hesham Fathi","student17@nafs.edu","STUDENT","Grade 6","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Samar Galal","student18@nafs.edu","STUDENT","Grade 6","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Wael Sherif","student19@nafs.edu","STUDENT","Grade 6","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Adam Khaled","student1@nafs.edu","STUDENT","Grade 3","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Rania Mostafa","student20@nafs.edu","STUDENT","Grade 6","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Khaled Nasser","student21@nafs.edu","STUDENT","Grade 9","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Ghada Tarek","student22@nafs.edu","STUDENT","Grade 9","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Amr Samir","student23@nafs.edu","STUDENT","Grade 9","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Lobna Adel","student24@nafs.edu","STUDENT","Grade 9","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Karim Youssef","student25@nafs.edu","STUDENT","Grade 9","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Nada Hatem","student26@nafs.edu","STUDENT","Grade 9","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Tarek Mahmoud","student27@nafs.edu","STUDENT","Grade 9","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Sana Fouda","student28@nafs.edu","STUDENT","Grade 9","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Bassel Khaled","student29@nafs.edu","STUDENT","Grade 9","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Mariam Fathi","student2@nafs.edu","STUDENT","Grade 3","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Hana Seif","student30@nafs.edu","STUDENT","Grade 9","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Ziad Nasser","student3@nafs.edu","STUDENT","Grade 3","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Salma Hossam","student4@nafs.edu","STUDENT","Grade 3","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Ibrahim Yassin","student5@nafs.edu","STUDENT","Grade 3","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Farida Mostafa","student6@nafs.edu","STUDENT","Grade 3","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Yahya Galal","student7@nafs.edu","STUDENT","Grade 3","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Habiba Sherif","student8@nafs.edu","STUDENT","Grade 3","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
  ["Omar Fouda","student9@nafs.edu","STUDENT","Grade 3","","Password configured","Not retrievable (secure hash)","Reset if unknown","2026-09-15"],
];

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("User Directory");
sheet.showGridLines = false;
sheet.tabColor = navy;

sheet.getRange("A2:I2").merge();
sheet.getRange("A2").values = [["NAFS user directory and credential status"]];
sheet.getRange("A2").format = { font: { name: font, size: 16, bold: true, color: navy } };
sheet.getRange("A3:I3").merge();
sheet.getRange("A3").values = [["Login emails are listed below. Existing plaintext passwords cannot be recovered because the database stores secure password hashes."]];
sheet.getRange("A3").format = { font: { name: font, size: 10, italic: true, color: "#667085" } };
sheet.getRange("A4:I4").format.borders = { bottom: { style: "thin", color: blue } };

sheet.getRange("A6:H6").values = [["Total users",null,"Administrators",null,"Teachers",null,"Students",null]];
sheet.getRange("A7:H7").values = [[null,null,null,null,null,null,null,null]];
sheet.getRange("A7").formulas = [["=COUNTA(A12:A100)"]];
sheet.getRange("C7").formulas = [["=COUNTIFS(C12:C100,\"ADMIN\")"]];
sheet.getRange("E7").formulas = [["=COUNTIFS(C12:C100,\"TEACHER\")"]];
sheet.getRange("G7").formulas = [["=COUNTIFS(C12:C100,\"STUDENT\")"]];
for (const col of ["A","C","E","G"]) {
  sheet.getRange(`${col}6:${col}6`).format = { fill: navy, font: { name: font, size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center" };
  sheet.getRange(`${col}7:${col}7`).format = { fill: lightBlue, font: { name: font, size: 14, bold: true, color: navy }, horizontalAlignment: "center" };
}

sheet.getRange("A9:I9").merge();
sheet.getRange("A9").values = [["Security note: use the email as the login identifier. Do not share password hashes. If a password is unknown, reset it to a new temporary password and require the user to change it after login."]];
sheet.getRange("A9:I9").format = { fill: lightAmber, font: { name: font, size: 10, color: amber }, wrapText: true, borders: { preset: "outside", style: "thin", color: "#E5B454" } };

const headers = ["Name","Login email","Role","Grade","Class","Sign-in method","Existing password","Required action","Created date"];
sheet.getRange("A11:I11").values = [headers];
sheet.getRange("A11:I11").format = {
  fill: navy,
  font: { name: font, size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { insideVertical: { style: "thin", color: "#FFFFFF" } },
};
sheet.getRange(`A12:I${users.length + 11}`).values = users.map((row) => [...row.slice(0,8), new Date(`${row[8]}T00:00:00Z`)]);
sheet.getRange(`I12:I${users.length + 11}`).format.numberFormat = "yyyy-mm-dd";
sheet.getRange(`A12:I${users.length + 11}`).format = { font: { name: font, size: 10, color: "#1F2937" }, verticalAlignment: "center", wrapText: true };
sheet.getRange(`H12:H${users.length + 11}`).conditionalFormats.add("containsText", { text: "immediately", format: { fill: lightRed, font: { bold: true, color: red } } });
sheet.getRange(`C12:C${users.length + 11}`).conditionalFormats.add("containsText", { text: "ADMIN", format: { fill: lightRed, font: { bold: true, color: red } } });
sheet.getRange(`C12:C${users.length + 11}`).conditionalFormats.add("containsText", { text: "TEACHER", format: { fill: lightAmber, font: { bold: true, color: amber } } });
sheet.tables.add(`A11:I${users.length + 11}`, true, "UserDirectoryTable").style = "TableStyleMedium2";
sheet.freezePanes.freezeRows(11);
sheet.freezePanes.freezeColumns(2);

const widths = [22,31,13,13,16,22,31,24,15];
widths.forEach((width, index) => sheet.getRangeByIndexes(0,index,users.length+11,1).format.columnWidth = width);
sheet.getRange("A2:I4").format.rowHeight = 22;
sheet.getRange("A9:I9").format.rowHeight = 42;
sheet.getRange("A11:I11").format.rowHeight = 34;
sheet.getRange(`A12:I${users.length + 11}`).format.rowHeight = 28;

workbook.recalculate();
const tableCheck = await workbook.inspect({ kind: "table", range: `User Directory!A6:I${users.length + 11}`, include: "values,formulas", tableMaxRows: 15, tableMaxCols: 9 });
const errorCheck = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan" });

await fs.mkdir(outputDir, { recursive: true });
const preview = await workbook.render({ sheetName: "User Directory", range: "A1:I28", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/preview.png`, new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, userCount: users.length, tableCheck: tableCheck.ndjson, errorCheck: errorCheck.ndjson }, null, 2));
