// src/components/CertificateButton.tsx
"use client";

import { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { CertificatePDF } from './CertificatePDF';
import { Award, Loader2, Download, AlertCircle } from 'lucide-react';

interface CertificateButtonProps {
  studentName: string;
  subject: string;
  date: string;
  teacherName: string;
  score?: number;
}

export default function CertificateButton({ studentName, subject, date, teacherName, score = 95 }: CertificateButtonProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-12 w-48 bg-slate-100 rounded-xl animate-pulse" />;

  return (
    <div suppressHydrationWarning={true}>
      <PDFDownloadLink
        document={<CertificatePDF studentName={studentName} subject={subject} date={date} teacherName={teacherName} score={score} />}
        fileName={`${studentName.replace(/\s+/g, '_')}_${subject}_Certificate.pdf`}
      >
        {({ loading, error, url }) => {
          if (error) {
            console.error("PDF generation failed:", error);
            return (
              <button className="bg-red-50 text-red-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold">
                <AlertCircle size={18} /> Error Generating PDF
              </button>
            );
          }

          return (
            <button
              disabled={loading || !url}
              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md
                ${loading || !url 
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-200 hover:shadow-lg'
                }`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
              {loading ? 'Generating...' : 'Download Certificate'}
            </button>
          );
        }}
      </PDFDownloadLink>
    </div>
  );
}