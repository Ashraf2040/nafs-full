// src/app/api/generate-images/route.ts

import { NextRequest, NextResponse } from "next/server";
import csvParser from "csv-parser";
import path from "path";
import { Readable } from "stream";
import { v2 as cloudinary } from "cloudinary";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createObjectCsvWriter } from "csv-writer";

// ================= CLOUDINARY =================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ================= GEMINI =================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  console.log("🚀 START /api/generate-images");

  try {
    // ================= GET FILE =================
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: "No file uploaded",
      });
    }

    console.log("📄 File:", file.name);

    // ================= BUFFER =================
    const buffer = Buffer.from(await file.arrayBuffer());

    // ================= PARSE CSV =================
    const rows: any[] = [];

    await new Promise<void>((resolve, reject) => {
      Readable.from(buffer)
        .pipe(csvParser())
        .on("data", (row) => rows.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    if (!rows.length) {
      return NextResponse.json({
        success: false,
        error: "CSV is empty",
      });
    }

    console.log("📊 Rows:", rows.length);

    // ================= GEMINI MODEL =================
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });

    // ================= PROCESS ROWS =================
    for (const [index, row] of rows.entries()) {
      console.log(`\n➡️ Row ${index + 1}/${rows.length}`);

      const promptText = row.ai_prompt;

      if (!promptText) {
        row.status = "failed";
        row.error = "missing ai_prompt";
        continue;
      }

      try {
        console.log("🧠 Prompt:", promptText);

        // ================= GEMINI CALL (TEXT ONLY) =================
        const result = await model.generateContent(
          `Improve this image prompt for educational illustration: ${promptText}`
        );

        const response = await result.response;
        const improvedPrompt = response.text();

        if (!improvedPrompt) {
          row.status = "failed";
          row.error = "no gemini response";
          continue;
        }

        console.log("✨ Improved Prompt:", improvedPrompt);

        // ================= TEMP IMAGE PLACEHOLDER =================
        // ⚠️ Gemini does NOT generate images
        // so we create a placeholder image based on text

        const placeholderUrl = `https://via.placeholder.com/1024x1024.png?text=${encodeURIComponent(
          improvedPrompt.slice(0, 60)
        )}`;

        console.log("🖼️ Using placeholder image");

        // ================= CLOUDINARY UPLOAD =================
        const upload = await cloudinary.uploader.upload(placeholderUrl, {
          folder: "quiz-images",
        });

        console.log("☁️ Uploaded:", upload.secure_url);

        row.imageUrl = upload.secure_url;
        row.improvedPrompt = improvedPrompt;
        row.status = "done";
        row.error = "";

      } catch (err: any) {
        console.log("❌ Row error:", err.message);

        row.status = "failed";
        row.error = err.message;
      }
    }

    // ================= OUTPUT CSV =================
    const outputPath = path.join(
      process.cwd(),
      "public",
      `updated-${Date.now()}.csv`
    );

    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: Object.keys(rows[0]).map((key) => ({
        id: key,
        title: key,
      })),
    });

    await csvWriter.writeRecords(rows);

    console.log("🎉 DONE FILE:", outputPath);

    return NextResponse.json({
      success: true,
      downloadUrl: `/${path.basename(outputPath)}`,
      totalRows: rows.length,
    });

  } catch (err: any) {
    console.error("🔥 GLOBAL ERROR:", err);

    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}