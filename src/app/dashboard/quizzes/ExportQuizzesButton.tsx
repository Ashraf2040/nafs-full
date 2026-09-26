"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ExportQuizzesButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const res = await fetch("/api/quizzes/export");

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quizzes-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Quizzes exported successfully!", { duration: 3000 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to export quizzes";
      toast.error(message, { duration: 4000 });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className="flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
    >
      {isExporting ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Download size={16} />
      )}
      {isExporting ? "Exporting..." : "Export All to CSV"}
    </button>
  );
}
