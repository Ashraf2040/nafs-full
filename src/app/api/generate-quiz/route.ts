import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1200;

async function generateWithRetry(model: any, prompt: string, attempt = 1): Promise<any> {
  try {
    return await model.generateContent(prompt);
  } catch (error: any) {
    const status = error?.status || error?.code;
    const message = error?.message || "";
    const isRetryable = status === 503 || status === 429 || status === 500 || 
      message.includes("high demand") || message.includes("Service Unavailable");
    if (isRetryable && attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return generateWithRetry(model, prompt, attempt + 1);
    }
    throw error;
  }
}

async function generateWithFallback(prompt: string) {
  const primary = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  try {
    return await generateWithRetry(primary, prompt);
  } catch (err: any) {
    const msg = err?.message || "";
    if (msg.includes("503") || msg.includes("high demand")) {
      const fallback = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      return generateWithRetry(fallback, prompt);
    }
    throw err;
  }
}

/** 
 * Pollinations: NO validation — it generates on-demand. 
 * The browser will handle loading/retrying. 
 */
function getPollinationsUrl(prompt: string): string {
  const encoded = encodeURIComponent(prompt.slice(0, 500)); // keep under limit
  return `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${Date.now()}`;
}

/** Extract SVG from Gemini response (handles markdown blocks, extra whitespace, etc.) */
function extractSVG(text: string): string | null {
  // Remove markdown code blocks
  let cleaned = text.replace(/```svg\s*/gi, "").replace(/```\s*/g, "");
  
  // Find SVG tags — FIX: was <<svg, now <svg
  const match = cleaned.match(/<<svg[\s\S]*?<\/svg>/i);
  if (!match) return null;
  
  let svg = match[0].trim();
  
  // Ensure xmlns is present (required for data URI)
  if (!svg.includes("xmlns")) {
    svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  
  // Basic validation: must have reasonable content
  if (svg.length < 50 || !svg.includes("</svg>")) return null;
  
  return svg;
}

/** Ask Gemini to generate SVG diagram code directly */
async function generateSVGDiagram(prompt: string): Promise<string | null> {
  try {
    const svgModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const svgPrompt = `You are an expert SVG illustrator for educational materials.

Create a clean, simple SVG diagram for: "${prompt}"

STRICT RULES:
- Output ONLY raw SVG code. No markdown, no \`\`\` blocks, no explanations.
- Use viewBox="0 0 400 300".
- Use only basic shapes: <rect>, <circle>, <ellipse>, <line>, <path>, <text>.
- Colors: soft blues, greens, oranges. No gradients.
- Font: generic sans-serif. Font size 14-18px.
- Must include xmlns="http://www.w3.org/2000/svg".
- Keep it simple enough for elementary/middle school students.

Example format:
<<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">...</svg>`;

    const result = await svgModel.generateContent(svgPrompt);
    const text = result.response.text();
    
    const svg = extractSVG(text);
    if (!svg) return null;
    
    // Convert to base64 data URI — works 100% offline, no CORS, no blocking
    const base64 = Buffer.from(svg).toString("base64");
    return `data:image/svg+xml;base64,${base64}`;
  } catch (error) {
    console.error("[SVG_GEN] Failed:", error);
    return null;
  }
}

/** FINAL FALLBACK: Generate a simple template SVG if AI fails */
function generateTemplateSVG(prompt: string): string {
  // Create a simple labeled diagram template based on keywords in prompt
  const keywords = prompt.toLowerCase();
  let shapes = "";
  
  if (keywords.includes("line") || keywords.includes("ray") || keywords.includes("segment")) {
    shapes = `
      <line x1="50" y1="150" x2="350" y2="150" stroke="#4F46E5" stroke-width="4" />
      <circle cx="50" cy="150" r="6" fill="#EF4444" />
      <circle cx="350" cy="150" r="6" fill="#EF4444" />
      <text x="200" y="140" text-anchor="middle" font-size="16" fill="#374151" font-family="sans-serif">Line / Ray / Segment</text>
    `;
  } else if (keywords.includes("angle") || keywords.includes("triangle")) {
    shapes = `
      <path d="M 100 250 L 200 50 L 300 250 Z" fill="#DBEAFE" stroke="#4F46E5" stroke-width="3"/>
      <text x="200" y="200" text-anchor="middle" font-size="16" fill="#374151" font-family="sans-serif">Diagram</text>
    `;
  } else if (keywords.includes("circle") || keywords.includes("round")) {
    shapes = `
      <circle cx="200" cy="150" r="100" fill="#DBEAFE" stroke="#4F46E5" stroke-width="3"/>
      <text x="200" y="155" text-anchor="middle" font-size="16" fill="#374151" font-family="sans-serif">Circle</text>
    `;
  } else {
    // Generic placeholder
    shapes = `
      <rect x="100" y="80" width="200" height="140" rx="10" fill="#F3F4F6" stroke="#4F46E5" stroke-width="3"/>
      <text x="200" y="155" text-anchor="middle" font-size="14" fill="#374151" font-family="sans-serif">Educational Diagram</text>
      <text x="200" y="175" text-anchor="middle" font-size="12" fill="#6B7280" font-family="sans-serif">${prompt.slice(0, 40)}...</text>
    `;
  }
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">${shapes}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonText, pdfBase64, grade, subject, outcome, indicator, questionCount, includeImages } = body;

    console.log("[QUIZ_GEN] Request received, includeImages:", includeImages);

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    let context = "";
    if (pdfBase64) context += `\n\nLesson PDF: ${pdfBase64.slice(0, 500)}...`;
    if (lessonText) context += `\n\nLesson Text:\n${lessonText}`;

    const prompt = `
You are an expert curriculum designer for the NAFS assessment system.
Create ${questionCount || 10} multiple-choice questions for Grade ${grade} ${subject}.

Learning Outcome: ${outcome || "General curriculum"}
Indicator: ${indicator || "General understanding"}
${context}

Rules:
- Each question must have exactly 4 options.
- Return ONLY a valid JSON array. No markdown, no explanations outside the JSON.
- Each object must have: question, options (string[]), answer (exact string), explanation (string).
${includeImages ? `- For exactly 2 questions that NEED a visual (geometry, diagrams, charts), include "image_prompt": "detailed description of a simple diagram, max 60 words"` : ""}

Example:
[
  {
    "question": "What is the powerhouse of the cell?",
    "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"],
    "answer": "Mitochondria",
    "explanation": "Mitochondria produce ATP."
  }
]`;

    const result = await generateWithFallback(prompt);
    const text = result.response.text();

    let questions;
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      questions = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[QUIZ_GEN] JSON parse error:", parseErr);
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
    }

    // Process images with 3-tier fallback: Pollinations → AI SVG → Template SVG
    const normalized = await Promise.all(
      questions.map(async (q: any, idx: number) => {
        let imageUrl = null;
        const imagePrompt = q.image_prompt || null;

        if (includeImages && imagePrompt) {
          console.log(`[QUIZ_GEN][Q${idx + 1}] Image prompt: ${imagePrompt.slice(0, 50)}...`);
          
          // Tier 1: Pollinations (fast, no validation needed)
          imageUrl = getPollinationsUrl(imagePrompt);
          console.log(`[QUIZ_GEN][Q${idx + 1}] Tier 1 (Pollinations): ${imageUrl.slice(0, 60)}`);
          
          // Tier 2: AI-generated SVG (if Pollinations fails in browser, we have this ready)
          // We still generate it as a backup, but return Pollinations first
          let svgBackup = null;
          try {
            svgBackup = await generateSVGDiagram(imagePrompt);
          } catch (e) {
            console.log(`[QUIZ_GEN][Q${idx + 1}] Tier 2 (AI SVG) failed`);
          }
          
          // Tier 3: Template SVG (guaranteed to work)
          const templateBackup = generateTemplateSVG(imagePrompt);
          
          // Store backups in extra fields so frontend can switch if main fails
          q._svg_backup = svgBackup;
          q._template_backup = templateBackup;
        }

        return {
          question: q.question || "",
          options: Array.isArray(q.options) ? q.options : [],
          answer: q.answer || "",
          explanation: q.explanation || "",
          image_url: imageUrl,           // Primary: Pollinations
          image_svg_backup: q._svg_backup || null,     // Secondary
          image_template_backup: q._template_backup || null, // Tertiary
          image_prompt: imagePrompt,
        };
      })
    );

    const withImages = normalized.filter((q: any) => q.image_url).length;
    console.log(`[QUIZ_GEN] Complete: ${normalized.length} questions, ${withImages} with image URLs`);

    return NextResponse.json({ questions: normalized });
  } catch (error: any) {
    console.error("[QUIZ_GEN] FATAL:", error);
    return NextResponse.json({ error: "Failed to generate quiz", details: error?.message }, { status: 500 });
  }
}