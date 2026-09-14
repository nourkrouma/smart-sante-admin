"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteOnboardingQuestion } from "@/lib/onboarding";
import type { OnboardingQuestion } from "@/types/onboarding";

type DeleteQuestionDialogProps = {
  question: OnboardingQuestion | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
};

export function DeleteQuestionDialog({
  question,
  onClose,
  onDeleted,
}: DeleteQuestionDialogProps) {
  const open = question !== null;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open, question?.id]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, isPending, onClose]);

  function handleDelete() {
    if (!question) return;
    setError(null);

    startTransition(async () => {
      try {
        await deleteOnboardingQuestion(question.id);
        onDeleted(question.id);
        onClose();
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Impossible de supprimer la question",
        );
      }
    });
  }

  if (!open || !question) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => {
          if (!isPending) onClose();
        }}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-question-title"
        aria-describedby="delete-question-desc"
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
      >
        <h2
          id="delete-question-title"
          className="text-base font-semibold text-foreground"
        >
          Supprimer la question ?
        </h2>
        <p id="delete-question-desc" className="mt-2 text-sm text-muted">
          Cette action supprimera{" "}
          <span className="font-medium text-foreground">{question.title}</span>.
          Les réponses restent enregistrées sur les documents utilisateurs. Les
          statistiques n’incluront plus cette question.
        </p>

        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}
