"use client";

import { Upload, Download, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import toast from "react-hot-toast";

export default function CsvImportButton() {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Importing quizzes from CSV...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/quizzes/import", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("Quizzes imported successfully!", { id: toastId });
        window.location.reload();
      } else {
        const err = await res.json();
        toast.error(`Import failed: ${err.error || err.details || "Unknown error"}`, {
          id: toastId,
          duration: 6000,
        });
      }
    } catch (error) {
      toast.error("Failed to import CSV. Please try again.", { id: toastId });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-start">
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
        className="bg-white border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 text-sm disabled:opacity-50"
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
    </div>
  );
}