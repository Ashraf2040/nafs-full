import { NextResponse } from 'next/server';
import { requireRole } from "@/lib/guard";
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { user, response } = await requireRole("TEACHER", "ADMIN");
    if (response) return response;

    const { id, prompt } = await request.json();

    if (!id || !prompt) {
      return NextResponse.json({ error: 'Missing ID or Prompt' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
    }

    // 1. Call the Google AI endpoint for image generation
    const model = 'gemini-3.1-flash-image'; 
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      throw new Error(errorData.error?.message || 'Failed to generate image from API');
    }

    const data = await apiResponse.json();

    // 2. Extract base64 data from the Gemini response structure
    // Adding a safety check to ensure the payload contains the expected inlineData
    const candidatePart = data.candidates?.[0]?.content?.parts?.[0];
    if (!candidatePart || !candidatePart.inlineData || !candidatePart.inlineData.data) {
      throw new Error('Unexpected response structure: Image data not found');
    }

    const base64Data = candidatePart.inlineData.data;
    const buffer = Buffer.from(base64Data, 'base64');

    // 3. Define target directory and filename inside the public folder
    const outputDir = path.join(process.cwd(), 'public', 'images');
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Define final path (saving as PNG)
    const fileName = `${id.replace(/\.[^/.]+$/, "")}.png`; 
    const filePath = path.join(outputDir, fileName);

    // 4. Write file to disk
    fs.writeFileSync(filePath, buffer);

    // Return the accessible public URL path
    return NextResponse.json({ 
      success: true, 
      fileName: fileName,
      url: `/images/${fileName}` 
    });

  } catch (error: any) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}