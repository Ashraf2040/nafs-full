import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = "AIzaSyDRyigiGJhZCi1dXcx-AEl0X0ziG7GUyO4"; // Replace with your key
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ==========================================
// COMPREHENSIVE CORRECTIONS DICTIONARY
// ==========================================
const corrections: Record<string, string> = {
  // --- MATH G3 ---
  "Which of the following shapes has two lines of symmetry?": "A rectangle",
  "Which of the following shapes is symmetric about a vertical axis?": "A circle",
  "What shape has four sides and four right angles?": "A rectangle", // Both square/rect are true, rect is safer for 2 symmetry lines
  
  // --- MATH G6 ---
  "Solve for x: 2x + 5 = 11": "x = 3",
  "Solve for x: 4x = 24": "x = 6",
  "Solve for x: x + 2 = 9": "x = 7",
  "Solve for x: 2x + 2 = 12": "x = 5",
  "What is the formula for the area of a parallelogram?": "Area = Base x Height",
  "What is the formula for the area of a triangle?": "Area = 1/2 x Base x Height",
  "A parallelogram has a base of 10 cm and a height of 4 cm. What is its area?": "40 cm^2",
  "A triangle has a base of 8 cm and a height of 6 cm. What is its area?": "24 cm^2",
  "A composite shape is made up of a rectangle and a triangle. The rectangle has a length of 8 cm and a width of 5 cm, and the triangle has a base of 8 cm and a height of 6 cm. What is the total area of the composite shape?": "64 cm^2",
  
  // --- MATH G9 ---
  "What is the value of f(3) for the function f(x) = 2x + 1?": "7",
  "Which of the following equations represents a linear function with a slope of 0?": "y = 3", // Fixed logic
  "A quadratic equation in the form of y = ax^2 + bx + c can be graphed as a parabola. What is the x-coordinate of the vertex of the parabola if the equation is y = 2x^2 + 12x + 7?": "The x-coordinate of the vertex is -3.",
  "A quadratic equation in the form of y = ax^2 + bx + c can be graphed as a parabola. What is the x-coordinate of the axis of symmetry of the parabola if the equation is y = x^2 + 4x - 5?": "The x-coordinate of the axis of symmetry is -2.",
  "A quadratic equation in the form of y = ax^2 + bx + c can be graphed as a parabola. What is the y-intercept of the parabola if the equation is y = x^2 - 3x - 2?": "The y-intercept is -2.",

  // --- SCIENCE G6 ---
  "What happens to the appearance of the moon as it moves from the Full Moon phase to the New Moon phase?": "It appears to change shape",
  "What is the main reason why we have day and night?": "Because the Earth rotates on its axis.",
  
  // --- SCIENCE G9 ---
  "What is the primary method by which carbon is transported from the atmosphere to the Earth's crust?": "Weathering and erosion",
  "What is the process by which carbon is transported through the Earth's crust and released into the atmosphere?": "Plate tectonics and volcanic activity",
  "What is the process by which carbon is transported from the Earth's crust to the atmosphere?": "Plate tectonics and volcanic activity",
};

export async function POST(req: Request) {
  try {
    const row = await req.json();
    const question = String(row.question || '').trim();
    const grade = String(row.grade || '').trim();
    const subject = String(row.subject || '').trim();
    let answer = String(row.answer || '').trim();
    let logMessage = `Row ${row.rowIndex + 1}: Processing...`;

    // 1. Apply known correction if it exists
    if (corrections[question]) {
      answer = corrections[question];
      logMessage = `🔴 Row ${row.rowIndex + 1}: Corrected bad answer -> ${answer}`;
    }

    // 2. Generate AI Prompt using Gemini (Subject-Specific)
    let subjectContext = "";
    if (subject.toLowerCase().includes("math")) {
      subjectContext = "Create a prompt for a clean geometric diagram, graph, or shape measurement visual.";
    } else if (subject.toLowerCase().includes("science")) {
      subjectContext = "Create a prompt for a scientific diagram (e.g., life cycles, earth layers, anatomy, physics concepts).";
    } else {
      subjectContext = "Create a prompt for a scene illustration, story map, or reading concept visual.";
    }

    const promptInstruction = `
      I have a multiple-choice question for Grade ${grade} ${subject}: '${question}'. 
      The correct answer is '${answer}'. 
      
      ${subjectContext}
      
      Generate a single-sentence DALL-E 3 prompt for an educational diagram that visually represents the concept in the question. 
      Style: flat vector illustration on white background, clear labels, no speech bubbles, no cartoon characters, suitable for a school assessment worksheet.
      Output ONLY the prompt text, nothing else.
    `;

    const result = await model.generateContent(promptInstruction);
    const response = await result.response;
    const newPrompt = response.text().trim().replace(/"/g, '');

    if (!corrections[question]) {
      logMessage = `🟢 Row ${row.rowIndex + 1}: Generated new prompt successfully.`;
    }

    return NextResponse.json({ answer, ai_prompt: newPrompt, logMessage });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ 
      answer: "", 
      ai_prompt: "", 
      logMessage: `❌ API Error: ${error.message}`,
      isError: true
    }, { status: 500 });
  }
}