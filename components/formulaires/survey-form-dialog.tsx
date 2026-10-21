"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { X } from "lucide-react";
import {
  datetimeLocalToIso,
  toDatetimeLocalInput,
} from "@/lib/popup-survey-input";
import type { PopupSurvey } from "@/types/popup-survey";

export type SurveyFormInput = {
  title: string;
  description: string;
  order: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

type SurveyFormDialogProps = {
  open: boolean;
  survey: PopupSurvey | null;
  nextOrder: number;
  onClose: () => void;
  onSubmit: (input: SurveyFormInput) => Promise<PopupSurvey>;
  onSaved: (survey: PopupSurvey) => void;
};

export function SurveyFormDialog({
  open,
  survey,
  nextOrder,
  onClose,
  onSubmit,
  onSaved,
}: SurveyFormDialogProps) {
  const isEdit = survey !== null;
  const [title, setTitle] = useState(survey?.title ?? "");
  const [description, setDescription] = useState(survey?.description ?? "");
  const [order, setOrder] = useState(String(survey?.order ?? nextOrder));
  const [startsAt, setStartsAt] = useState(
    toDatetimeLocalInput(survey?.startsAt ?? null),
  );
  const [endsAt, setEndsAt] = useState(toDatetimeLocalInput(survey?.endsAt ?? null));
  const [active, setActive] = useState(survey?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    let startsAtIso: string | null;
    let endsAtIso: string | null;
    try {
      startsAtIso = datetimeLocalToIso(
        startsAt,
        "La date de mise en ligne est invalide",
      );
      endsAtIso = datetimeLocalToIso(endsAt, "La date de fin est invalide");
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Date invalide",
      );
      return;
    }

    startTransition(async () => {
      try {
        const saved = await onSubmit({
          title,
          description,
          order: Number.isFinite(parsedOrder) ? parsedOrder : Number.NaN,
          active,
          startsAt: startsAtIso,
          endsAt: endsAtIso,
        });
        onSaved(saved);
        onClose();
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : isEdit
              ? "Impossible de modifier l’enquête"
              : "Impossible de créer l’enquête",
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
        aria-labelledby="survey-form-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <h2
            id="survey-form-title"
            className="text-base font-semibold text-foreground"
          >
            {isEdit ? "Modifier l’enquête" : "Nouvelle enquête pop-up"}
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
              Titre
            </span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={200}
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              placeholder="Ex. Satisfaction de la semaine"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Description (optionnel)
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              rows={3}
              disabled={isPending}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              placeholder="Texte d’introduction affiché avec l’enquête"
            />
          </label>

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

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Mise en ligne
            </span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
            />
            <span className="block text-xs text-muted">
              Laissez vide pour une mise en ligne immédiate.
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Fin (optionnel)
            </span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
            />
            <span className="block text-xs text-muted">
              Laissez vide pour la laisser en ligne jusqu’à désactivation.
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              disabled={isPending}
              className="mt-0.5 size-4 rounded border-border text-brand accent-brand"
            />
            <span>
              Enquête active
              <span className="mt-0.5 block text-xs text-muted">
                Une enquête inactive ne s’affiche pas, même si la date de mise
                en ligne est atteinte.
              </span>
            </span>
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
                  : "Créer l’enquête"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
