import "dotenv/config";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

const filePath = process.argv[2];

if (!filePath) {
  console.log("❌ Please provide a file path");
  process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.log("❌ Missing GEMINI_API_KEY");
  process.exit(1);
}

async function run() {
  try {
    const code = fs.readFileSync(filePath, "utf-8");

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent(`
Refactor this React/Next.js component without changing behavior:

${code}
    `);

    const response = await result.response;
    const text = response.text();

    // ====== CREATE OUTPUT FILE ======
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);

    const outputPath = path.join(
      dir,
      `${base}.refactored${ext}`
    );

    fs.writeFileSync(outputPath, text, "utf-8");

    console.log("\n✅ Refactor completed!");
    console.log("📁 File saved at:");
    console.log(outputPath);
  } catch (err) {
    console.log("❌ Error:", err.message);
  }
}

run();