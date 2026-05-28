"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

type Question = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  image_url?: string;
};

type Outcome = {
  id: string;
  outcomeText: string;
  indicatorText: string;
};

export function useQuizManager() {
  // ===== Form State =====
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lessonText, setLessonText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [includeImages, setIncludeImages] = useState(false);

  // ===== Questions =====
  const [questions, setQuestions] = useState<Question[]>([]);

  // ===== Outcomes =====
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState("");
  const [loadingOutcomes, setLoadingOutcomes] = useState(false);

  // ===== UI States =====
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // ===== Fetch Outcomes =====
  const fetchOutcomes = async () => {
    if (!subject || !grade) return;

    setLoadingOutcomes(true);
    try {
      const res = await fetch(
        `/api/outcomes?subject=${subject}&grade=${grade}`
      );

      const data = await res.json();
      setOutcomes(data.outcomes || []);
    } catch (e: any) {
      toast.error("Failed to load outcomes");
    } finally {
      setLoadingOutcomes(false);
    }
  };

  useEffect(() => {
    fetchOutcomes();
  }, [subject, grade]);

  // ===== Generate Questions =====
  const generateQuestions = async () => {
    setGenerating(true);
    const toastId = toast.loading("Generating...");

    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          grade,
          lessonText,
          outcomeId: selectedOutcomeId,
          includeImages,
        }),
      });

      const data = await res.json();

      setQuestions((prev) => [...prev, ...(data.questions || [])]);

      toast.success("Questions generated", { id: toastId });
    } catch (e: any) {
      toast.error("Generation failed", { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  // ===== Save Quiz =====
  const saveQuiz = async () => {
    if (questions.length === 0) {
      toast.error("Add questions first");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Saving...");

    try {
      await fetch("/api/quizzes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          grade,
          dueDate,
          questions,
        }),
      });

      toast.success("Saved successfully", { id: toastId });

      // reset
      setQuestions([]);
      setLessonText("");
      setPdfFile(null);
      setSelectedOutcomeId("");
    } catch {
      toast.error("Save failed", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // ===== Question Helpers =====
  const addQuestion = () => {
    setQuestions((p) => [
      ...p,
      { question: "", options: ["", "", "", ""], answer: "", explanation: "" },
    ]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const copy = [...questions];
    (copy[index] as any)[field] = value;
    setQuestions(copy);
  };

  const removeQuestion = (index: number) => {
    setQuestions((p) => p.filter((_, i) => i !== index));
  };

  return {
    // state
    subject,
    setSubject,
    grade,
    setGrade,
    dueDate,
    setDueDate,
    lessonText,
    setLessonText,
    pdfFile,
    setPdfFile,
    includeImages,
    setIncludeImages,

    questions,
    outcomes,
    selectedOutcomeId,
    setSelectedOutcomeId,

    loadingOutcomes,
    generating,
    saving,

    // actions
    fetchOutcomes,
    generateQuestions,
    saveQuiz,

    addQuestion,
    updateQuestion,
    removeQuestion,
  };
}