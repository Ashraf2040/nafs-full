// src/components/MathRenderer.tsx
"use client";
import katex from "katex";
import { useEffect, useRef } from "react";

export function MathRenderer({ math, block = false }: { math: string; block?: boolean }) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      katex.render(math, containerRef.current, {
        displayMode: block,
        throwOnError: false, // Prevents app crash on bad user input
      });
    }
  }, [math, block]);

  return <span ref={containerRef} />;
}