// src/app/admin/image-generator/page.tsx
"use client";

import { useState } from "react";

export default function ImageGeneratorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setDownloadUrl("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/generate-images", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setDownloadUrl(data.downloadUrl);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto border rounded-xl p-6 shadow">
        <h1 className="text-2xl font-bold mb-6">
          CSV Image Generator
        </h1>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              setFile(e.target.files[0]);
            }
          }}
          className="mb-4"
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {loading ? "Generating..." : "Generate Images"}
        </button>

        {downloadUrl && (
          <div className="mt-6">
            <a
              href={downloadUrl}
              download
              className="text-blue-600 underline"
            >
              Download Updated CSV
            </a>
          </div>
        )}
      </div>
    </div>
  );
}