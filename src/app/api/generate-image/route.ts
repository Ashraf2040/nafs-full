import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// The SDK automatically picks up GOOGLE_GENAI_API_KEY from the environment
const ai = new GoogleGenAI({});

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'A prompt is required to generate an image.' },
        { status: 400 }
      );
    }

    // Call the Imagen 4.0 model (Updated from 3.0)
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001', // 👈 FIXED MODEL NAME
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        // 4:3 is usually a good aspect ratio for assessment diagrams
        aspectRatio: '4:3', 
      },
    });

    // Safety check in case the API blocks the prompt
    if (!response.generatedImages || response.generatedImages.length === 0) {
        return NextResponse.json(
          { error: 'No image returned. The prompt may have triggered a safety filter.' },
          { status: 400 }
        );
    }

    const imageObj = response.generatedImages[0].image;
    
    if (!imageObj || !imageObj.imageBytes) {
         return NextResponse.json(
          { error: 'Image data is missing from the API response.' },
          { status: 500 }
        );
    }

    // Extract the base64 string
    const base64Image = imageObj.imageBytes;

    return NextResponse.json({ success: true, imageBase64: base64Image });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image. Check server logs for details.' },
      { status: 500 }
    );
  }
}