"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  const handlePrint = () => {
    window.print();
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
