import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";

const outputDir = path.resolve("outputs", "quiz-cleanup");
const quizPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(outputDir, "cleaned-quizzes-with-images.csv");
const indicatorPath = path.join(outputDir, "cleaned-indicators.csv");
const stop = new Set("a an and are as at be been between by can for from has have how in into is it its of on or that the their them this to using was were what when where which who why will with within grade math science english quiz set following given find choose calculate determine identify understanding identifying distinguishing describing explaining determining read text".split(" "));
const conceptTerms = new Set("absolute acceleration acid algebra angle area atom average base biodiversity bond cell chromosome circuit climate coefficient compound congruent conductor coordinate current decimal denominator density ecosystem electricity energy equation equivalent erosion factor force fraction function genetics gravity habitat heat integer ion light linear mass mean median meiosis microscope mixture mode momentum moon multiplication organism parallel percentage perimeter photosynthesis polygon probability quadratic ratio reflection resistance rock rotation sediment slope solubility solution speed symmetry temperature translation triangle variable velocity voltage volume wave weathering".split(" "));

function stem(token) {
  if (token.length > 6 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 6 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 5 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function words(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b\d+(?:[.-]\d+){2,}\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/)
    .map(stem).filter((token) => token.length > 1 && !stop.has(token) && !/^\d+$/.test(token));
}

const scopeKey = (subject, grade) => `${String(subject).trim().toLowerCase()}|||${String(grade).trim()}`;
const indicatorKey = (row) => [row.Subject ?? row.subject, row.Grade ?? row.grade, row["Learning Outcome"] ?? row.outcome_text, row.Indicator ?? row.indicator_text]
  .map((value) => String(value ?? "").trim().toLowerCase()).join("|||");

const [quizText, indicatorText] = await Promise.all([fs.readFile(quizPath, "utf8"), fs.readFile(indicatorPath, "utf8")]);
const quizzes = Papa.parse(quizText, { header: true, skipEmptyLines: true }).data;
const indicators = Papa.parse(indicatorText, { header: true, skipEmptyLines: true }).data;
const byScope = new Map();
for (const indicator of indicators) {
  const key = scopeKey(indicator.Subject, indicator.Grade);
  const label = `${indicator["Learning Outcome"]} ${indicator.Indicator}`;
  const tokens = words(label);
  byScope.set(key, [...(byScope.get(key) ?? []), { ...indicator, key: indicatorKey(indicator), label, tokens }]);
}

function rank(row) {
  const candidates = byScope.get(scopeKey(row.subject, row.grade)) ?? [];
  const queryParts = [row.question, row.question, row.answer, row.answer, row.explanation, row.option_1, row.option_2, row.option_3, row.option_4];
  const query = words(queryParts.join(" "));
  const title = words(row.quiz_title);
  const docsWithToken = new Map();
  for (const candidate of candidates) for (const token of new Set(candidate.tokens)) docsWithToken.set(token, (docsWithToken.get(token) ?? 0) + 1);
  const queryCounts = new Map();
  for (const token of query) queryCounts.set(token, (queryCounts.get(token) ?? 0) + 1);
  const titleSet = new Set(title);
  return candidates.map((candidate) => {
    const candidateCounts = new Map();
    for (const token of candidate.tokens) candidateCounts.set(token, (candidateCounts.get(token) ?? 0) + 1);
    let dot = 0, queryNorm = 0, candidateNorm = 0;
    const vocabulary = new Set([...queryCounts.keys(), ...candidateCounts.keys()]);
    const overlap = [];
    for (const token of vocabulary) {
      const idf = Math.log((candidates.length + 1) / ((docsWithToken.get(token) ?? 0) + 1)) + 1;
      const q = (queryCounts.get(token) ?? 0) * idf;
      const c = (candidateCounts.get(token) ?? 0) * idf;
      dot += q * c; queryNorm += q * q; candidateNorm += c * c;
      if (q > 0 && c > 0) overlap.push(token);
    }
    const cosine = queryNorm && candidateNorm ? dot / Math.sqrt(queryNorm * candidateNorm) : 0;
    const titleOverlap = candidate.tokens.filter((token) => titleSet.has(token)).length / Math.max(1, titleSet.size);
    const conceptOverlap = overlap.filter((token) => conceptTerms.has(token)).length;
    const score = cosine * 0.82 + titleOverlap * 0.1 + Math.min(conceptOverlap, 3) * 0.03;
    return { candidate, score, overlap, conceptOverlap };
  }).sort((a, b) => b.score - a.score);
}

const reviews = [];
let exactIndicatorLinks = 0;
for (const [index, row] of quizzes.entries()) {
  const ranking = rank(row);
  const selectedKey = indicatorKey(row);
  const selected = ranking.find((item) => item.candidate.key === selectedKey);
  if (selected) exactIndicatorLinks++;
  const best = ranking[0];
  if (!selected || !best) {
    reviews.push({ severity: "STRUCTURAL", row: index + 2, id: row.id, subject: row.subject, grade: row.grade, quiz: row.quiz_title, question: row.question, reason: "Selected indicator does not exist in canonical indicators" });
    continue;
  }
  const margin = best.score - selected.score;
  const highConfidence = best.candidate.key !== selectedKey && best.score >= 0.18 && margin >= 0.09 && best.overlap.length >= 2 && (best.conceptOverlap >= 1 || best.score >= 0.28);
  if (highConfidence) {
    reviews.push({
      severity: "HIGH", row: index + 2, id: row.id, subject: row.subject, grade: row.grade, quiz: row.quiz_title,
      question: row.question, answer: row.answer, currentOutcome: row.outcome_text, currentIndicator: row.indicator_text,
      suggestedOutcome: best.candidate["Learning Outcome"], suggestedIndicator: best.candidate.Indicator,
      currentScore: Number(selected.score.toFixed(4)), suggestedScore: Number(best.score.toFixed(4)), margin: Number(margin.toFixed(4)),
      evidenceTerms: best.overlap.join(" | "),
    });
  }
}

const pairCounts = new Map();
for (const item of reviews.filter((item) => item.severity === "HIGH")) {
  const key = `${item.currentIndicator}|||${item.suggestedIndicator}`;
  const current = pairCounts.get(key) ?? { subject: item.subject, currentIndicator: item.currentIndicator, suggestedIndicator: item.suggestedIndicator, count: 0, samples: [] };
  current.count += 1;
  if (current.samples.length < 3) current.samples.push(item.question);
  pairCounts.set(key, current);
}

const summary = {
  generatedAt: new Date().toISOString(), rowsChecked: quizzes.length, indicatorsChecked: indicators.length,
  exactIndicatorLinks, structuralIssues: reviews.filter((item) => item.severity === "STRUCTURAL").length,
  highConfidenceReviews: reviews.filter((item) => item.severity === "HIGH").length,
  reviewCountsBySubject: Object.fromEntries(["English", "Math", "Science"].map((subject) => [subject, reviews.filter((item) => item.subject === subject).length])),
};
await fs.writeFile(path.join(outputDir, "curriculum-alignment-audit.json"), JSON.stringify({ summary, pairGroups: [...pairCounts.values()].sort((a, b) => b.count - a.count), reviews }, null, 2), "utf8");
console.log(JSON.stringify(summary, null, 2));
