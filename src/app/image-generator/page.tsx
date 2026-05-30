'use client';

import { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';

export default function CsvFixer() {
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setDownloadUrl(null);
    setLogs([]);
    addLog("📂 Parsing CSV file...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const rows = results.data as any[];
        setTotal(rows.length);
        setProgress(0);
        addLog(`✅ Found ${rows.length} rows. Starting backend processing...`);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          row.rowIndex = i; // Pass index to backend for logging

          try {
            const res = await fetch('/api/fix-row', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(row),
            });

            if (res.ok) {
              const fixedData = await res.json();
              rows[i].answer = fixedData.answer || rows[i].answer;
              rows[i].ai_prompt = fixedData.ai_prompt || rows[i].ai_prompt;
              addLog(fixedData.logMessage);
            } else {
              const errorData = await res.json().catch(() => ({}));
              addLog(`❌ Row ${i + 1}: Server error - ${errorData.logMessage || 'Unknown error'}`);
            }
          } catch (err) {
            addLog(`❌ Row ${i + 1}: Network error. Check connection.`);
          }

          setProgress(i + 1);

          // Delay to respect Gemini's Rate Limits (1.5 to 2 seconds is safe)
          await new Promise(resolve => setTimeout(resolve, 1500)); 
        }

        addLog("🎉 Finished processing all rows! Generating download link...");
        const csv = Papa.unparse(rows);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setIsProcessing(false);
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <h1 className="text-2xl font-bold mb-2">CSV Auto-Fixer & AI Prompt Generator</h1>
      <p className="text-gray-500 mb-6">Upload your CSV. The system will fix known errors and generate suitable image prompts for all subjects.</p>
      
      {!isProcessing && !downloadUrl && (
        <div className="bg-white p-6 border-2 border-dashed border-gray-300 rounded-xl text-center">
          <input type="file" accept=".csv" onChange={handleFileUpload} className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        </div>
      )}

      {(isProcessing || downloadUrl) && (
        <div className="mt-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-blue-700">Progress</span>
            <span className="text-sm font-medium text-blue-700">{progress} / {total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-300" 
              style={{ width: `${total ? (progress / total) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      )}

      {downloadUrl && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-lg font-semibold text-green-800 mb-2">✅ Processing Complete!</h2>
          <a 
            href={downloadUrl} 
            download="full-merged-FIXED.csv"
            className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Download Fixed CSV
          </a>
        </div>
      )}

      {/* LIVE LOG CONSOLE */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <span>Live Backend Console</span>
          {isProcessing && <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>}
        </h3>
        <div className="bg-gray-900 text-gray-200 p-4 rounded-xl h-80 overflow-y-auto font-mono text-sm shadow-inner">
          {logs.length === 0 ? (
            <div className="text-gray-500">Waiting for upload...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`py-0.5 ${log.includes('❌') ? 'text-red-400' : log.includes('🔴') ? 'text-yellow-400' : 'text-green-400'}`}>
                <span className="text-gray-500 mr-2">[{new Date().toLocaleTimeString()}]</span> 
                {log}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}