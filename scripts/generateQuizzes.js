require("dotenv").config({ path: "../.env" });

const fs = require("fs");
const csv = require("csv-parser");
const Groq = require("groq-sdk");

// 1. Initialize Groq Client
const API_KEY = process.env.GROQ_API_KEY 
if (!API_KEY) {
    console.error("❌ GROQ_API_KEY missing in .env file");
    console.error("Get a free key at: https://console.groq.com/keys");
    process.exit(1);
}

const groq = new Groq({ apiKey: API_KEY });

const INPUT_CSV = "missed_indicators.csv";
const OUTPUT_JSON = "quizzes_seed2.json";

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

// 2. Updated Generation Function for Groq
async function generateWithRetry(prompt, retries = 3) {
    const modelsToTry = [
        "llama-3.1-8b-instant", 
        "gemma2-9b-it",         
        "llama-3.3-70b-versatile" 
    ];

    for (const modelName of modelsToTry) {
        const model = groq; 
        
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`   🔄 Trying model: ${modelName}...`);
                
                const chatCompletion = await model.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert curriculum designer. You output ONLY valid JSON. No markdown, no conversational text."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    model: modelName,
                    temperature: 0.2, // Lowered temperature further for strict JSON adherence
                    response_format: { type: "json_object" }
                });

                const content = chatCompletion.choices[0]?.message?.content;

                if (!content) {
                    throw new Error("Empty response from model");
                }

                const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
                return JSON.parse(cleaned);

            } catch (error) {
                const msg = error?.message || "";
                console.error(`⚠️ [${modelName}] Attempt ${i + 1} failed: ${msg}`);

                if (msg.includes("429") || msg.includes("503") || msg.includes("rate limit")) {
                    if (i < retries - 1) {
                        const waitTime = (i + 1) * 2000; 
                        console.log(`   ⏳ Rate limit hit. Waiting ${waitTime / 1000}s before retry...`);
                        await delay(waitTime);
                        continue; 
                    }
                }

                console.log(`   🔀 Switching to next model...`);
                break; 
            }
        }
    }
    
    throw new Error("❌ Generation failed: All Groq models exhausted or failed.");
}

async function main() {
    if (!fs.existsSync(INPUT_CSV)) {
        throw new Error(`CSV file not found: ${INPUT_CSV}`);
    }

    const indicators = [];
    console.log(`📂 Reading CSV file: ${INPUT_CSV}...`);

    await new Promise((resolve, reject) => {
        fs.createReadStream(INPUT_CSV)
            // Fixes the BOM issue on the first column header
            .pipe(csv({ mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '') }))
            .on("data", (row) => {
                indicators.push({
                    grade: row["Grade"] || row["grade"] || "",
                    subject: row["Subject"] || row["subject"] || "",
                    outcome: row["Learning Outcome"] || row["learning outcome"] || "",
                    indicator: row["Indicator"] || row["indicator"] || "",
                });
            })
            .on("end", resolve)
            .on("error", reject);
    });

    console.log(`✅ Found ${indicators.length} indicators\n`);

    let generatedQuizzes = [];

    if (fs.existsSync(OUTPUT_JSON)) {
        try {
            const fileContent = fs.readFileSync(OUTPUT_JSON, "utf-8");
            generatedQuizzes = JSON.parse(fileContent);
            generatedQuizzes = generatedQuizzes.filter(q => !q.title.startsWith("FAILED"));
            console.log(`⏩ Resuming from quiz ${generatedQuizzes.length}\n`);
        } catch (e) {
            console.log("⚠️ Existing output JSON was corrupt, starting fresh.");
            generatedQuizzes = [];
        }
    }

    for (let i = generatedQuizzes.length; i < indicators.length; i++) {
        const item = indicators[i];
        const gradeNumber = parseInt(String(item.grade).replace(/\D/g, ""), 10) || 1;
        const subjectName = item.subject || "General";
        const indicatorText = item.indicator || "General understanding";
        const outcomeText = item.outcome || "General curriculum";

        console.log(`[${i + 1}/${indicators.length}] Processing: ${indicatorText.slice(0, 60)}...`);

        // Updated Prompt with strict negative constraints and realistic examples
        const prompt = `
Create 10 multiple-choice questions for Grade ${gradeNumber} ${subjectName}.

Learning Outcome:
 ${outcomeText}

Indicator:
 ${indicatorText}

CRITICAL RULES:
1. The "options" array MUST contain exactly 4 distinct, fully written text answers.
2. NEVER output just ["A", "B", "C", "D"] in the options array.
3. NEVER include letter prefixes (like "A." or "B.") inside the option text strings.
4. Vocabulary and concepts MUST be strictly appropriate for Grade ${gradeNumber}.
5. Return ONLY valid JSON. No markdown. No conversational text.

Format:
{
  "questions": [
    {
      "question": "What is the actual question text?",
      "options": ["First real option", "Second real option", "Third real option", "Fourth real option"],
      "answer": "A",
      "explanation": "Explanation of why A is correct."
    }
  ]
}
`;

        try {
            const responseObj = await generateWithRetry(prompt);
            
            // Handle cases where the model wraps the array in a "questions" key
            const questionsArray = Array.isArray(responseObj) ? responseObj : responseObj.questions;

            if (!Array.isArray(questionsArray)) {
                throw new Error("Model did not return a valid array of questions");
            }

            const quizObject = {
                title: generateSmartTitle(indicatorText, subjectName, gradeNumber),
                subjectName,
                gradeTarget: gradeNumber,
                description: `Assessment for Grade ${gradeNumber} ${subjectName}`,
                outcomeText,
                questions: questionsArray.map((q) => ({
                    question: q.question || "",
                    options: Array.isArray(q.options) ? q.options : [],
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

            console.log(`   ✅ Saved\n`);

        } catch (error) {
            console.error(`   ❌ Failed: ${error.message}`);

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
            await delay(500);
        }
    }

    console.log("🎉 ALL DONE");
}

main().catch(console.error);