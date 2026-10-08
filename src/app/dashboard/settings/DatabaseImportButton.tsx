"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { strFromU8, unzipSync } from "fflate";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, X } from "lucide-react";
import { databaseBackupTableNames, type DatabaseBackupTable } from "@/lib/databaseBackup";

type BackupPreview = {
  exportedAt: string;
  tableCounts: Record<DatabaseBackupTable, number>;
  totalRows: number;
};

const maxFileSize = 100 * 1024 * 1024;

export default function DatabaseImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [importing, setImporting] = useState(false);

  const selectFile = async (selected: File | undefined) => {
    setFile(null);
    setPreview(null);
    setError(null);
    setSuccess(null);
    setConfirming(false);
    if (!selected) return;
    if (selected.size > maxFileSize) {
      setError("CSV backup archives must be 100 MB or smaller.");
      return;
    }

    try {
      const archive = unzipSync(new Uint8Array(await selected.arrayBuffer()), {
        filter: (entry) => entry.name === "manifest.csv" && entry.originalSize <= 500_000,
      });
      const manifestCsv = archive["manifest.csv"];
      if (!manifestCsv) throw new Error("This file does not contain a NAFS Prep CSV backup manifest.");
      const parsed = Papa.parse<{ key: string; value: string }>(strFromU8(manifestCsv), { header: true, skipEmptyLines: "greedy" });
      if (parsed.errors.length || !parsed.meta.fields?.includes("key") || !parsed.meta.fields.includes("value")) {
        throw new Error("The backup manifest is invalid.");
      }
      const manifest = Object.fromEntries(parsed.data.map((row) => [row.key, row.value]));
      if (manifest.format !== "nafs-prep-database-csv-backup" || manifest.formatVersion !== "1") {
        throw new Error("This file is not a supported NAFS Prep CSV backup.");
      }

      const tableCounts = {} as BackupPreview["tableCounts"];
      let totalRows = 0;
      for (const tableName of databaseBackupTableNames) {
        const count = Number(manifest[`count.${tableName}`]);
        if (!Number.isSafeInteger(count) || count < 0) throw new Error("The backup manifest is incomplete or invalid.");
        tableCounts[tableName] = count;
        totalRows += count;
      }
      setFile(selected);
      setPreview({ exportedAt: manifest.exportedAt || "Unknown date", tableCounts, totalRows });
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "The backup file could not be read.");
    }
  };

  const importBackup = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/database-import", {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: file,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The backup could not be imported.");
      setSuccess(`Imported ${Number(result.importedRows).toLocaleString()} records successfully.`);
      setFile(null);
      setPreview(null);
      setConfirming(false);
      if (inputRef.current) inputRef.current.value = "";
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "The backup could not be imported.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        onChange={(event) => void selectFile(event.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 py-3 font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
      >
        <FileUp size={18} /> Choose CSV backup
      </button>

      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
      {success && <p role="status" className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={17} />{success}</p>}

      {file && preview && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">Backup preview</h3>
              <p className="mt-1 break-all text-sm text-slate-600">{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</p>
              <p className="text-sm text-slate-500">Created: {preview.exportedAt}</p>
            </div>
            <button
              type="button"
              aria-label="Remove selected backup"
              onClick={() => void selectFile(undefined)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            ><X size={18} /></button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {databaseBackupTableNames.map((tableName) => (
              <div key={tableName} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="block truncate text-slate-500">{tableName}</span>
                <span className="font-bold text-slate-900">{preview.tableCounts[tableName].toLocaleString()} rows</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-700">{preview.totalRows.toLocaleString()} total records</p>
            {!confirming ? (
              <button type="button" onClick={() => setConfirming(true)} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700">
                Continue to import
              </button>
            ) : (
              <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 sm:max-w-xl">
                <p className="flex items-start gap-2 text-sm font-semibold leading-6 text-amber-900">
                  <AlertTriangle size={19} className="mt-0.5 shrink-0" />
                  Matching IDs will be updated and new records added. Records not present in this backup will remain. This may replace matching account and assessment data.
                </p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button type="button" disabled={importing} onClick={() => setConfirming(false)} className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 font-semibold text-amber-900 disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="button" disabled={importing} onClick={() => void importBackup()} className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 font-bold text-white hover:bg-amber-800 disabled:opacity-50">
                    {importing ? <Loader2 size={17} className="animate-spin" /> : <FileUp size={17} />}
                    {importing ? "Importing…" : "Confirm import"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
