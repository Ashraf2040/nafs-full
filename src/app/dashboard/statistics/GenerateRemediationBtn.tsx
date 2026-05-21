// src/app/dashboard/statistics/GenerateRemediationBtn.tsx
"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Wand2, Loader2, Sparkles, X } from "lucide-react";

export default function GenerateRemediationBtn({
  quizId,
}: {
  quizId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  async function handleGenerate() {
    try {
      setLoading(true);
      setIsOpen(true);

      const res = await fetch("/api/remediation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId }),
      });

      const data = await res.json();
      setContent(data.remediation);
    } catch (error) {
      console.error(error);
      setContent("Failed to generate remediation. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="group relative inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md active:scale-95"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 size={16} className="group-hover:rotate-12 transition-transform" />
            Generate Remedial Plan
          </>
        )}
      </button>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-700">
          <Sparkles size={16} />
          <span className="text-sm font-bold">AI Remedial Package</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Crafting personalized remedial plan...</p>
          <p className="text-xs text-slate-400 mt-1">Analyzing weak areas & generating strategies</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 prose prose-sm max-w-none max-h-[400px] overflow-y-auto">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}