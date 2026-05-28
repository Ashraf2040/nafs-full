"use client";

import { Upload, Download, Loader2, FileSpreadsheet, XCircle, CheckCircle2 } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";

interface ImportProgress {
  status: "idle" | "uploading" | "processing" | "creating" | "complete" | "error";
  progress: number; // 0-100
  message: string;
  currentQuiz?: number;
  totalQuizzes?: number;
}

export default function CsvImportButton() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const simulateProgress = useCallback((targetProgress: number, duration: number = 800) => {
    return new Promise<void>((resolve) => {
      const start = Date.now();
      const startProgress = progress.progress;

      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const ratio = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - ratio, 3); // ease-out cubic
        const current = startProgress + (targetProgress - startProgress) * easeOut;

        setProgress((prev) => ({
          ...prev,
          progress: Math.round(current),
        }));

        if (ratio >= 1) {
          clearInterval(interval);
          resolve();
        }
      }, 16);
    });
  }, [progress.progress]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Start progress tracking
    setProgress({
      status: "uploading",
      progress: 0,
      message: "Reading CSV file...",
    });

    try {
      // Phase 1: Upload (0-30%)
      await simulateProgress(15, 400);

      const formData = new FormData();
      formData.append("file", file);

      setProgress((prev) => ({
        ...prev,
        status: "processing",
        message: "Parsing CSV data...",
      }));
      await simulateProgress(30, 300);

      // Phase 2: Server processing (30-70%) - we can't track server-side, so we animate
      setProgress((prev) => ({
        ...prev,
        status: "creating",
        message: "Creating quizzes in database...",
      }));

      // Start a progress animation for the server processing phase
      const serverProgressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev.progress >= 85) return prev;
          return {
            ...prev,
            progress: Math.min(prev.progress + Math.random() * 3 + 1, 85),
          };
        });
      }, 400);

      const res = await fetch("/api/quizzes/import", {
        method: "POST",
        body: formData,
      });

      clearInterval(serverProgressInterval);

      if (res.ok) {
        const data = await res.json();

        // Phase 3: Complete (85-100%)
        setProgress({
          status: "complete",
          progress: 100,
          message: `Successfully imported ${data.count || 1} quiz${data.count !== 1 ? 'zes' : ''}!`,
          totalQuizzes: data.count,
        });

        await simulateProgress(100, 400);

        toast.success(`Imported ${data.count || 1} quiz${data.count !== 1 ? 'zes' : ''} successfully!`, {
          duration: 4000,
          icon: '🎉',
        });

        // Small delay before reload so user sees completion
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        const err = await res.json();
        setProgress({
          status: "error",
          progress: 0,
          message: err.error || "Import failed",
        });
        toast.error(`Import failed: ${err.error || err.details || "Unknown error"}`, {
          duration: 6000,
        });
      }
    } catch (error) {
      setProgress({
        status: "error",
        progress: 0,
        message: "Failed to import CSV",
      });
      toast.error("Failed to import CSV. Please try again.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";

      // Reset progress after a delay if there was an error
      if (progress.status === "error") {
        setTimeout(() => {
          setProgress({ status: "idle", progress: 0, message: "" });
        }, 3000);
      }
    }
  };

  const getProgressColor = () => {
    switch (progress.status) {
      case "error": return "bg-red-500";
      case "complete": return "bg-emerald-500";
      default: return "bg-indigo-500";
    }
  };

  const getStatusIcon = () => {
    if (progress.status === "error") return <XCircle size={16} className="text-red-500" />;
    if (progress.status === "complete") return <CheckCircle2 size={16} className="text-emerald-500" />;
    return <Loader2 size={16} className="animate-spin text-indigo-500" />;
  };

  return (
    <div className="flex flex-col items-start w-full max-w-md">
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="bg-white border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 text-sm disabled:opacity-50 w-full justify-center"
      >
        {isUploading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Upload size={16} />
        )}
        {isUploading ? "Importing..." : "Import Quizzes from CSV"}
      </button>

      <a
        href="/sample-quizzes-import.csv"
        download
        className="text-xs text-indigo-500 hover:text-indigo-700 font-medium mt-1.5 ml-1 flex items-center gap-1 hover:underline"
      >
        <Download size={10} /> Download sample file
      </a>

      {/* Progress Bar */}
      {isUploading && progress.status !== "idle" && (
        <div className="w-full mt-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-indigo-500" />
              <span className="text-sm font-semibold text-slate-700">
                {progress.status === "complete" ? "Import Complete" : "Importing..."}
              </span>
            </div>
            <span className="text-sm font-bold text-slate-500">
              {Math.round(progress.progress)}%
            </span>
          </div>

          {/* Progress track */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${getProgressColor()}`}
              style={{ 
                width: `${progress.progress}%`,
                transition: "width 0.3s ease-out",
              }}
            />
          </div>

          {/* Status message */}
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-xs text-slate-500 font-medium">
              {progress.message}
            </span>
          </div>

          {/* Quiz count if available */}
          {progress.totalQuizzes && progress.totalQuizzes > 0 && (
            <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 size={12} />
              {progress.totalQuizzes} quiz{progress.totalQuizzes !== 1 ? 'zes' : ''} created
            </div>
          )}
        </div>
      )}
    </div>
  );
}