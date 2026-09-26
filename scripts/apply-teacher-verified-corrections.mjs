import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";

const dir = path.resolve("outputs", "quiz-cleanup");
const sourcePath = path.join(dir, "cleaned-quizzes-with-images.csv");
const outputPath = path.join(dir, "cleaned-quizzes-with-images-teacher-verified.csv");
const audit = JSON.parse(await fs.readFile(path.join(dir, "curriculum-alignment-audit.json"), "utf8"));
const parsed = Papa.parse(await fs.readFile(sourcePath, "utf8"), { header: true, skipEmptyLines: true });
if (parsed.errors.length) throw new Error("Source CSV has parse errors.");

const stop = new Set("a an and are as at be by for from in into is it of on or that the this to using with what which how".split(" "));
const tokens = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter((token) => token.length > 2 && !stop.has(token));
const grams = (value) => {
  const values = tokens(value); const result = new Set();
  for (let index = 0; index < values.length - 1; index++) result.add(`${values[index]} ${values[index + 1]}`);
  for (let index = 0; index < values.length - 2; index++) result.add(`${values[index]} ${values[index + 1]} ${values[index + 2]}`);
  return result;
};

function isSafeCorrection(review) {
  if (review.severity !== "HIGH") return false;
  const query = grams(`${review.question} ${review.answer}`);
  const suggested = grams(`${review.suggestedOutcome} ${review.suggestedIndicator}`);
  const current = grams(`${review.currentOutcome} ${review.currentIndicator}`);
  const suggestedMatches = [...query].filter((phrase) => suggested.has(phrase));
  const currentMatches = [...query].filter((phrase) => current.has(phrase));
  const question = review.question.toLowerCase();
  const currentText = review.currentIndicator.toLowerCase();
  const suggestedText = review.suggestedIndicator.toLowerCase();
  if (/type of text|dialogue/.test(question) && /text type|type of text/.test(currentText)) return false;
  if (/similar/.test(question) && /similar/.test(currentText)) return false;
  if (/place value|value of the digit/.test(question) && /decimal/.test(suggestedText) && !/decimal/.test(question)) return false;
  if (/rock|weathering/.test(question) && /chemical reaction/.test(suggestedText)) return false;
  if (/cosecant|secant|cotangent/.test(question) && /trigonometric ratio/.test(currentText)) return false;
  const approvedPair = [
    [/volume of a right rectangular prism/, /surface area of a right rectangular prism/],
    [/comparing unicellular and multicellular/, /describing cell structures/],
    [/vocabulary similar in meaning/, /inferring synonyms/],
    [/distinguishing inequalities/, /system of two linear equations/],
    [/perimeters of the rectangle/, /areas of the rectangle/],
    [/concept of electric charge/, /electric current flows/],
    [/newton's first law/, /momentum/],
    [/concept of weight/, /acceleration of the body/],
    [/contributions of scientists/, /chemical symbols/],
    [/types of velocity/, /momentum/],
    [/change in the apparent shape of the moon/, /phases of the moon/],
    [/geological changes and processes/, /erosion, weathering/],
    [/gravitational force and the weights/, /acceleration/],
    [/concept of wave/, /potential energy and kinetic energy/],
    [/defining meiosis/, /defining mitosis/],
    [/generating electric current/, /direct current and alternating current/],
    [/metamorphic rocks/, /rock cycle/],
    [/transferred from one place/, /potential energy and kinetic energy/],
  ].some(([from, to]) => from.test(currentText) && to.test(suggestedText));
  const phraseBased = suggestedMatches.length > currentMatches.length && suggestedMatches.length > 0;
  return approvedPair || phraseBased;
}

const corrections = audit.reviews.filter(isSafeCorrection);
const correctionById = new Map(corrections.map((item) => [item.id, item]));
const updated = parsed.data.map((row) => {
  const correction = correctionById.get(row.id);
  if (!correction) return row;
  return { ...row, outcome_text: correction.suggestedOutcome, indicator_text: correction.suggestedIndicator };
});

const headers = parsed.meta.fields;
await fs.writeFile(outputPath, Papa.unparse(updated, { columns: headers, quotes: true, newline: "\r\n" }), "utf8");
const summary = {
  generatedAt: new Date().toISOString(), rows: updated.length, correctionsApplied: corrections.length,
  correctionsBySubject: Object.fromEntries(["English", "Math", "Science"].map((subject) => [subject, corrections.filter((item) => item.subject === subject).length])),
  preservedQuestionIds: new Set(updated.map((row) => row.id)).size,
  preservedImageUrls: updated.filter((row) => row.image_url).length,
  corrections,
};
await fs.writeFile(path.join(dir, "teacher-corrections-report.json"), JSON.stringify(summary, null, 2), "utf8");
console.log(JSON.stringify({ ...summary, corrections: undefined }, null, 2));
