'use client';

import React, { useState } from 'react';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

interface GeneratedImage {
  id: string;
  url: string;
}

export default function GenerateImagesPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [{ timestamp, type, message }, ...prev]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
      addLog(`File uploaded: ${e.target.files[0].name}`, 'info');
    }
  };

  // Simple CSV parser supporting standard quotes and commas
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    return lines
      .map((line) => {
        // Simple regex to match comma-separated values while respecting quotes
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        return matches ? matches.map(val => val.replace(/^"|"$/g, '')) : [];
      })
      .filter((row) => row.length > 1);
  };

  const startGeneration = async () => {
    if (!csvFile) {
      addLog('Error: Please upload a CSV file first.', 'error');
      return;
    }

    setIsProcessing(true);
    setLogs([]);
    setGeneratedImages([]);
    addLog('Starting CSV processing...', 'info');

    try {
      const text = await csvFile.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        addLog('Error: CSV file seems empty or malformed.', 'error');
        setIsProcessing(false);
        return;
      }

      addLog(`Found ${rows.length} valid rows to process.`, 'info');
      setProgress({ current: 0, total: rows.length });

      // Iterate through rows sequentially to prevent crashing and observe live updates
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const id = row[0];       // Column 1: Image ID (e.g., sci-g6-describing-factors-005)
        const prompt = row[11];  // Column 12: Image Prompt

        if (!id || !prompt) {
          addLog(`Skipping row ${i + 1}: Missing ID or Prompt data.`, 'error');
          continue;
        }

        setProgress((prev) => ({ ...prev, current: i + 1 }));
        addLog(`[${i + 1}/${rows.length}] Processing ID: ${id}...`, 'info');

        try {
          const res = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, prompt }),
          });

          const data = await res.json();

          if (!res.ok || data.error) {
            throw new Error(data.error || 'Failed generating asset');
          }

          addLog(`Successfully saved: ${data.fileName}`, 'success');
          setGeneratedImages((prev) => [{ id, url: data.url }, ...prev]);

        } catch (err: any) {
          addLog(`Failed processing ID ${id}: ${err.message}`, 'error');
        }

        // Optional short delay to respect rate-limiting thresholds
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      addLog('Batch generation completed!', 'success');
    } catch (err: any) {
      addLog(`Critical processing failure: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 font-sans">
      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Automated Assessment Asset Pipeline</h1>
        <p className="text-gray-500 text-sm">Upload CSV mapping to generate and auto-name dashboard assets directly to storage.</p>
      </header>

      {/* Control Actions */}
      <div className="bg-gray-50 border p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">Select Assessment CSV File</label>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange}
            disabled={isProcessing}
            className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
          />
        </div>

        <button
          onClick={startGeneration}
          disabled={isProcessing || !csvFile}
          className={`px-6 py-2.5 rounded-md font-medium text-sm transition-colors ${
            isProcessing || !csvFile 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-black text-white hover:bg-gray-800'
          }`}
        >
          {isProcessing ? `Processing (${progress.current}/${progress.total})` : 'Execute Generation'}
        </button>
      </div>

      {/* Main Panel splitting Live Logging and Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Terminal Logger */}
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Live Backend Execution Stream</h3>
          <div className="bg-gray-900 text-gray-100 font-mono p-4 rounded-lg h-96 overflow-y-auto flex flex-col-reverse gap-1 text-xs border border-gray-800 shadow-inner">
            {logs.length === 0 ? (
              <span className="text-gray-500 italic">Console idling. Upload data matrix and initiate run...</span>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="leading-5">
                  <span className="text-gray-500 mr-2">[{log.timestamp}]</span>
                  <span className={
                    log.type === 'success' ? 'text-green-400 font-semibold' : 
                    log.type === 'error' ? 'text-red-400 font-semibold' : 'text-blue-300'
                  }>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-time Rendered Asset Previews */}
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Generated Media Library</h3>
          <div className="border rounded-lg h-96 overflow-y-auto p-4 bg-gray-50 grid grid-cols-2 gap-4 shadow-inner">
            {generatedImages.length === 0 ? (
              <div className="col-span-2 flex items-center justify-center text-gray-400 italic text-sm">
                No items built in this session.
              </div>
            ) : (
              generatedImages.map((img) => (
                <div key={img.id} className="bg-white border rounded p-2 flex flex-col gap-2 shadow-sm">
                  <div className="relative aspect-video bg-gray-100 rounded overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.id} className="object-contain w-full h-full" />
                  </div>
                  <div className="text-[10px] font-mono truncate text-gray-600 font-semibold bg-gray-100 px-1.5 py-0.5 rounded" title={img.id}>
                    {img.id}.png
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}