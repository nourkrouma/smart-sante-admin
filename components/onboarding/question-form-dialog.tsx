"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { X } from "lucide-react";
import { TagInput } from "@/components/products/tag-input";
import {
  createOnboardingQuestion,
  updateOnboardingQuestion,
} from "@/lib/onboarding";
import {
  ONBOARDING_QUESTION_TYPES,
  ONBOARDING_QUESTION_TYPE_LABELS,
  type OnboardingQuestion,
  type OnboardingQuestionType,
} from "@/types/onboarding";

type QuestionFormDialogProps = {
  open: boolean;
  question: OnboardingQuestion | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: (question: OnboardingQuestion) => void;
};

export function QuestionFormDialog({
  open,
  question,
  nextOrder,
  onClose,
  onSaved,
}: QuestionFormDialogProps) {
  const isEdit = question !== null;
  const [title, setTitle] = useState("");
  const [type, setType] = useState<OnboardingQuestionType>("single");
  const [options, setOptions] = useState<string[]>([]);
  const [order, setOrder] = useState("1");
  const [required, setRequired] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setTitle(question?.title ?? "");
    setType(question?.type ?? "single");
    setOptions(question?.options ?? []);
    setOrder(String(question?.order ?? nextOrder));
    setRequired(question?.required ?? true);
    setError(null);
  }, [open, question, nextOrder]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isPending, onClose]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedOrder = Number.parseInt(order, 10);
    const input = {
      title,
      type,
      options: type === "text" ? [] : options,
      order: Number.isFinite(parsedOrder) ? parsedOrder : Number.NaN,
      required,
    };

    startTransition(async () => {
      try {
        const saved = isEdit
          ? await updateOnboardingQuestion(question.id, input)
          : await createOnboardingQuestion(input);
        onSaved({
          ...saved,
          createdAt: question?.createdAt ?? saved.createdAt,
        });
        onClose();
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : isEdit
              ? "Impossible de modifier la question"
              : "Impossible de créer la question",
        );
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => {
          if (!isPending) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-form-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <h2
            id="question-form-title"
            className="text-base font-semibold text-foreground"
          >
            {isEdit ? "Modifier la question" : "Ajouter une question"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
            aria-label="Fermer"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Question
            </span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              placeholder="Texte de la question"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Type
            </span>
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as OnboardingQuestionType)
              }
              required
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
            >
              {ONBOARDING_QUESTION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {ONBOARDING_QUESTION_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          {type !== "text" ? (
            <TagInput
              label="Options"
              values={options}
              onChange={setOptions}
              placeholder="Ajouter une option"
              disabled={isPending}
            />
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Ordre
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={order}
              onChange={(event) => setOrder(event.target.value)}
              required
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={required}
              onChange={(event) => setRequired(event.target.checked)}
              disabled={isPending}
              className="size-4 rounded border-border text-brand accent-brand"
            />
            Réponse obligatoire
          </label>

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? isEdit
                  ? "Enregistrement…"
                  : "Création…"
                : isEdit
                  ? "Enregistrer"
                  : "Créer la question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
