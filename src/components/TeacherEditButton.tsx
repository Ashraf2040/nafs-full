"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";
import TeacherEditModal from "./TeacherEditModal";


export default function TeacherEditButton({ teacher, subjects, grades }: any) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
        title="Edit Assignments"
      >
        <Pencil size={16} />
      </button>

      {open && (
        <TeacherEditModal
          teacher={teacher}
          subjects={subjects}
          grades={grades}
          onClose={() => setOpen(false)}
          onSaved={() => window.location.reload()}
        />
      )}
    </>
  );
}