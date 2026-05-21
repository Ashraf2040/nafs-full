// components/SafeQuizImage.tsx
"use client";
import { useState } from "react";

interface SafeQuizImageProps {
  imageUrl: string | null;
  svgBackup: string | null;
  templateBackup: string | null;
  alt: string;
}

export default function SafeQuizImage({ imageUrl, svgBackup, templateBackup, alt }: SafeQuizImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(imageUrl);
  const [attempt, setAttempt] = useState(0);

  const handleError = () => {
    if (attempt === 0 && svgBackup) {
      console.log("Image: falling back to AI SVG");
      setCurrentSrc(svgBackup);
      setAttempt(1);
    } else if (attempt === 1 && templateBackup) {
      console.log("Image: falling back to template SVG");
      setCurrentSrc(templateBackup);
      setAttempt(2);
    } else {
      console.log("Image: all fallbacks failed");
      setCurrentSrc(null);
    }
  };

  if (!currentSrc) {
    return (
      <div className="my-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <span className="text-3xl mb-2 block">🖼️</span>
        <p className="text-xs text-slate-400 font-medium">{alt}</p>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-200 bg-white">
      <img
        src={currentSrc}
        alt={alt}
        className="w-full h-auto max-h-64 object-contain"
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}