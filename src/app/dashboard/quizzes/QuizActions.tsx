"use client";

import { useState } from "react";
import { Send, CheckCircle2, Trash2, Loader2, AlertTriangle } from "lucide-react";

interface QuizActionsProps {
  quizId: string;
  isPublished: boolean;
  title: string;
}

export default function QuizActions({ quizId, isPublished, title }: QuizActionsProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handlePublish = async () => {
    if (isPublishing) return;
    setIsPublishing(true);

    try {
      const res = await fetch(`/api/quizzes/${quizId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        // Refresh the page to show updated status
        window.location.reload();
      } else {
        const err = await res.json();
        alert(`Failed to publish: ${err.error || "Unknown error"}`);
      }
    } catch (error) {
      alert("Network error while publishing. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        // Refresh the page to remove the deleted quiz
        window.location.reload();
      } else {
        const err = await res.json();
        alert(`Failed to delete: ${err.error || "Unknown error"}`);
      }
    } catch (error) {
      alert("Network error while deleting. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Delete confirmation modal
  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-xl text-red-600">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Delete Quiz?</h3>
          </div>
          <p className="text-slate-600 mb-6">
            Are you sure you want to delete <strong className="text-slate-800">"{title}"</strong>? 
            This action cannot be undone. All questions and student results for this quiz will be permanently removed.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-4 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Publish button for draft quizzes */}
      {!isPublished ? (
        <button
          onClick={handlePublish}
          disabled={isPublishing}
          className="flex-[2] bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-center py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-amber-200"
        >
          {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {isPublishing ? "Publishing..." : "Publish"}
        </button>
      ) : (
        <button
          disabled
          className="flex-[2] bg-emerald-50 text-emerald-600 text-center py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 cursor-default"
        >
          <CheckCircle2 size={16} /> Published
        </button>
      )}

      {/* Delete button */}
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="flex-1 bg-slate-50 text-slate-400 text-center py-2.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"
        title="Delete Quiz"
      >
        <Trash2 size={18} />
      </button>
    </>
  );
}