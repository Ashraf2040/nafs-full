require("dotenv").config();

const fs = require("fs");
const csv = require("csv-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// IMPORTANT: replace this with a NEW key
const API_KEY = "YOUR_NEW_GEMINI_KEY";

const genAI = new GoogleGenerativeAI(API_KEY);

const INPUT_CSV = "comprehensive_indicators.csv";
const OUTPUT_JSON = "quizzes_seed.json";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function generateSmartTitle(outcomeText, subject, grade) {
    if (!outcomeText) return `${subject} Assessment - Grade ${grade}`;

    const clean = outcomeText.replace(/[^\w\s\-\.]/g, "").trim();

    const phrase = clean
        .split(/[\.;]/)[0]
        .split(/\s+/)
        .slice(0, 10)
        .join(" ");

    return `${phrase} - ${subject} (Grade ${grade})`;
}

async function generateWithRetry(prompt, retries = 3) {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
    });

    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(prompt);

            const text = result.response.text();

            const cleaned = text
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

            return JSON.parse(cleaned);

        } catch (error) {
            console.error(`⚠️ Attempt ${i + 1} failed: ${error.message}`);

            if (i < retries - 1) {
                const waitTime = (i + 1) * 4000;

                console.log(`Waiting ${waitTime / 1000}s before retry...`);

                await delay(waitTime);
            } else {
                throw error;
            }
        }
    }
}

async function main() {

    if (!fs.existsSync(INPUT_CSV)) {
        throw new Error(`CSV file not found: ${INPUT_CSV}`);
    }

    const indicators = [];

    console.log(`📂 Reading CSV file: ${INPUT_CSV}...`);

    await new Promise((resolve, reject) => {
        fs.createReadStream(INPUT_CSV)
            .pipe(csv())
            .on("data", (row) => {

                indicators.push({
                    grade: row["Grade"] || row["grade"] || "",
                    subject: row["Subject"] || row["subject"] || "",
                    outcome:
                        row["Learning Outcome"] ||
                        row["learning outcome"] ||
                        "",
                    indicator:
                        row["Indicator"] ||
                        row["indicator"] ||
                        "",
                });
            })
            .on("end", resolve)
            .on("error", reject);
    });

    console.log(`✅ Found ${indicators.length} indicators\n`);

    let generatedQuizzes = [];

    if (fs.existsSync(OUTPUT_JSON)) {
        generatedQuizzes = JSON.parse(
            fs.readFileSync(OUTPUT_JSON, "utf-8")
        );

        console.log(
            `⏩ Resuming from quiz ${generatedQuizzes.length}\n`
        );
    }

    for (
        let i = generatedQuizzes.length;
        i < indicators.length;
        i++
    ) {
        const item = indicators[i];

        const gradeNumber = parseInt(
            String(item.grade).replace(/\D/g, ""),
            10
        ) || 1;

        const subjectName = item.subject || "General";

        const indicatorText =
            item.indicator || "General understanding";

        const outcomeText =
            item.outcome || "General curriculum";

        console.log(
            `[${i + 1}/${indicators.length}] ${indicatorText.slice(0, 50)}`
        );

        const prompt = `
You are an expert curriculum designer.

Create 10 multiple-choice questions for Grade ${gradeNumber} ${subjectName}.

Learning Outcome:
${outcomeText}

Indicator:
${indicatorText}

Rules:
- Each question must have exactly 4 options.
- Return ONLY valid JSON.
- No markdown.
- No explanations outside JSON.

Format:
[
  {
    "question": "Question here",
    "options": ["A", "B", "C", "D"],
    "answer": "A",
    "explanation": "Explanation here"
  }
]
`;

        try {

            const questionsArray =
                await generateWithRetry(prompt);

            if (!Array.isArray(questionsArray)) {
                throw new Error("Gemini did not return array");
            }

            const quizObject = {
                title: generateSmartTitle(
                    indicatorText,
                    subjectName,
                    gradeNumber
                ),

                subjectName,

                gradeTarget: gradeNumber,

                isPublished: false,

                description:
                    `Assessment for Grade ${gradeNumber} ${subjectName}`,

                outcomeText,

                questions: questionsArray.map((q) => ({
                    question: q.question || "",
                    options: Array.isArray(q.options)
                        ? q.options
                        : [],

                    answer: q.answer || "",

                    explanation: q.explanation || "",

                    image_url: null,
                })),
            };

            generatedQuizzes.push(quizObject);

            fs.writeFileSync(
                OUTPUT_JSON,
                JSON.stringify(generatedQuizzes, null, 2)
            );

            console.log("✅ Saved\n");

        } catch (error) {

            console.error(`❌ Failed: ${error.message}`);

            generatedQuizzes.push({
                title: `FAILED-${i + 1}`,
                error: error.message,
                originalIndicator: indicatorText,
            });

            fs.writeFileSync(
                OUTPUT_JSON,
                JSON.stringify(generatedQuizzes, null, 2)
            );
        }

        if (i < indicators.length - 1) {
            await delay(3000);
        }
    }

    console.log("🎉 ALL DONE");
}

main().catch(console.error);