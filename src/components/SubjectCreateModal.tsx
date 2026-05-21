"use client";
import { useState } from "react";
import { X, Plus, Save, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const COLOR_OPTIONS = [
  "from-red-500 to-pink-500",
  "from-orange-500 to-amber-500",
  "from-emerald-500 to-teal-500",
  "from-blue-500 to-indigo-500",
  "from-indigo-500 to-purple-500",
  "from-violet-500 to-fuchsia-500",
];

export default function SubjectCreateModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [colorCode, setColorCode] = useState("from-indigo-500 to-purple-500");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, colorCode }),
      });
      if (res.ok) {
        setOpen(false);
        setName("");
        setDescription("");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create subject");
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-2 active:scale-95"
      >
        <Plus size={20} /> Add Subject
      </button>
    );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Create New Subject</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Subject Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Physics"
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Color Theme
            </label>
            <div className="flex flex-wrap gap-3">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColorCode(c)}
                  className={`w-10 h-10 rounded-full bg-gradient-to-r ${c} border-2 transition-all ${
                    colorCode === c ? "border-slate-800 scale-110" : "border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          Create Subject
        </button>
      </div>
    </div>
  );
}