import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { model } from "@/lib/ai";
import { analyzeQuiz } from "@/lib/analyzeQuiz";

// simple in-memory rate limit (per server instance)
const lastRequestMap = new Map<string, number>();

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id || "anonymous";

    // -----------------------------
    // RATE LIMIT (5 seconds)
    // -----------------------------
    const now = Date.now();
    const last = lastRequestMap.get(userId) || 0;

    if (now - last < 5000) {
      return NextResponse.json(
        { message: "Please wait before generating again." },
        { status: 429 }
      );
    }

    lastRequestMap.set(userId, now);

    const { quizId } = await req.json();

    if (!quizId) {
      return NextResponse.json(
        { message: "quizId is required" },
        { status: 400 }
      );
    }

    const analysis = await analyzeQuiz(quizId);

    const weakQuestions = (analysis?.weakQuestions || []).slice(0, 10);

    // -----------------------------
    // SAFE PROMPT BUILDING
    // -----------------------------
    const prompt = `
You are an elite curriculum specialist and instructional coach.

Quiz: ${analysis?.quizTitle || "Unknown Quiz"}
Subject: ${analysis?.subject || "Unknown Subject"}
Grade: ${analysis?.grade || "Unknown Grade"}

Weak Questions:

${weakQuestions
  .map((q: any, i: number) => {
    // -----------------------------
    // SAFE COMMON WRONG ANSWERS
    // -----------------------------
    let commonMistakes = "None";

    if (Array.isArray(q?.commonWrongAnswers)) {
      commonMistakes =
        q.commonWrongAnswers.length > 0
          ? q.commonWrongAnswers.join("\n- ")
          : "None";
    } else if (typeof q?.commonWrongAnswers === "string") {
      commonMistakes = q.commonWrongAnswers;
    } else if (q?.commonWrongAnswers) {
      commonMistakes = String(q.commonWrongAnswers);
    }

    return `
${i + 1}. ${q?.questionText || "Unknown Question"}

Mastery: ${
      typeof q?.mastery === "number"
        ? q.mastery.toFixed(1)
        : "0"
    }%

Correct Answer:
${q?.correctAnswer || "N/A"}

Learning Indicator:
${q?.learningIndicator || "N/A"}

Common Mistakes:
- ${commonMistakes}
`;
  })
  .join("\n")}

Generate a COMPLETE PROFESSIONAL REMEDIAL PACKAGE including:

- Teacher Diagnostic Analysis
- Root Causes of Misunderstanding
- Re-Teaching Strategy
- Visual Concept Simplification
- Step-by-Step Solved Examples
- Guided Practice
- Independent Worksheet
- Exit Ticket
- Differentiated Instruction
- Homework
- Parent Support Tips
- Formative Assessment

Use clear professional markdown.
Base everything strictly on weak areas.
Do NOT be generic.
`;

    // -----------------------------
    // AI CALL WITH FALLBACK
    // -----------------------------
    let content = "";

    try {
      const result = await model.generateContent(prompt);

      content =
        result?.response?.text?.() ||
        "Failed to generate remediation content.";
    } catch (aiError: any) {
      console.error("Gemini Error:", aiError);

      // fallback response
      content = `
# Remedial Package (Fallback Mode)

⚠️ AI generation temporarily unavailable (quota or network issue).

## Teacher Guidance:
- Review weak concepts manually
- Focus on misconceptions in answers
- Re-teach step-by-step with examples
- Use formative assessment before moving on

## Weak Areas Summary:
${weakQuestions
  .map((q: any) => `- ${q?.questionText || "Unknown Question"}`)
  .join("\n")}
`;
    }

    return NextResponse.json({
      remediation: content,
      analysis,
    });
  } catch (error: any) {
    console.error("REMEDIATION_GENERATION_ERROR:", error);

    return NextResponse.json(
      {
        message: "Generation failed",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}