"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  const handlePrint = () => {
    // Add print-specific styles
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #student-report, #student-report * { visibility: visible; }
        #student-report { position: absolute; left: 0; top: 0; width: 100%; }
        nav, aside, footer, button, .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    window.print();

    // Remove the style after printing
    setTimeout(() => {
      document.head.removeChild(style);
    }, 100);
  };

  return (
    <button 
      onClick={handlePrint} 
      className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-md no-print"
    >
      <Printer size={20} /> Print Report
    </button>
  );
}