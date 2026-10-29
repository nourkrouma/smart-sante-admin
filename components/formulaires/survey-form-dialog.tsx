"use client";

import {
  useEffect,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { ChevronDown, X } from "lucide-react";
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

const fieldClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-brand/30 placeholder:text-muted/70 focus:ring-2 disabled:opacity-60";

export function SurveyFormDialog({
  open,
  survey,
  nextOrder,
  onClose,
  onSubmit,
  onSaved,
}: SurveyFormDialogProps) {
  const isEdit = survey !== null;
  const titleId = useId();
  const descriptionId = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmedTitle = title.trim();
  const canSubmit = trimmedTitle.length > 0 && !isPending;
  const dirty = isEdit
    ? title !== (survey?.title ?? "") ||
      description !== (survey?.description ?? "") ||
      startsAt !== toDatetimeLocalInput(survey?.startsAt ?? null) ||
      endsAt !== toDatetimeLocalInput(survey?.endsAt ?? null)
    : trimmedTitle.length > 0 ||
      description.trim().length > 0 ||
      startsAt.length > 0 ||
      endsAt.length > 0;

  useEffect(() => {
    if (!open) return;
    setTitle(survey?.title ?? "");
    setDescription(survey?.description ?? "");
    setStartsAt(toDatetimeLocalInput(survey?.startsAt ?? null));
    setEndsAt(toDatetimeLocalInput(survey?.endsAt ?? null));
    setScheduleOpen(
      Boolean(survey?.startsAt || survey?.endsAt) || survey !== null,
    );
    setError(null);
  }, [open, survey]);

  function requestClose() {
    if (isPending) return;
    if (
      dirty &&
      !window.confirm(
        "Fermer sans enregistrer ? Les modifications seront perdues.",
      )
    ) {
      return;
    }
    onClose();
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || isPending) return;
      if (
        dirty &&
        !window.confirm(
          "Fermer sans enregistrer ? Les modifications seront perdues.",
        )
      ) {
        return;
      }
      onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isPending, dirty, onClose]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);

    let startsAtIso: string | null;
    let endsAtIso: string | null;
    try {
      startsAtIso = datetimeLocalToIso(
        startsAt,
        "La date de début est invalide",
      );
      endsAtIso = datetimeLocalToIso(endsAt, "La date de fin est invalide");
      if (
        startsAtIso &&
        endsAtIso &&
        new Date(endsAtIso) <= new Date(startsAtIso)
      ) {
        setError("La fin doit être postérieure au début");
        return;
      }
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
          title: trimmedTitle,
          description: description.trim(),
          order: survey?.order ?? nextOrder,
          // Publish is controlled on the survey detail screen only.
          active: survey?.active ?? false,
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={requestClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-form-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id="survey-form-title"
              className="text-base font-semibold text-foreground"
            >
              {isEdit ? "Modifier l’enquête" : "Nouvelle enquête"}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {isEdit
                ? "Titre, introduction et planning."
                : "Un titre suffit pour commencer."}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={isPending}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
            aria-label="Fermer"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="space-y-4 overflow-y-auto px-5 py-5">
            <label className="block space-y-1.5" htmlFor={titleId}>
              <span className="text-sm font-medium text-foreground">
                Titre
              </span>
              <input
                id={titleId}
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                autoFocus
                maxLength={200}
                disabled={isPending}
                className={fieldClassName}
                placeholder="Ex. Satisfaction de la semaine"
              />
            </label>

            <label className="block space-y-1.5" htmlFor={descriptionId}>
              <span className="text-sm font-medium text-foreground">
                Introduction
                <span className="ml-1 font-normal text-muted">· optionnel</span>
              </span>
              <textarea
                id={descriptionId}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
                rows={isEdit ? 3 : 2}
                disabled={isPending}
                className={`${fieldClassName} resize-none`}
                placeholder="Court texte affiché avant les questions"
              />
            </label>

            {isEdit ? (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">Planning</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-muted">Début</span>
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(event) => setStartsAt(event.target.value)}
                      disabled={isPending}
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-muted">Fin</span>
                    <input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(event) => setEndsAt(event.target.value)}
                      disabled={isPending}
                      className={fieldClassName}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted">
                  Laissez vide pour une diffusion immédiate, sans date de fin.
                  La publication se gère sur l’écran de l’enquête.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setScheduleOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-background"
                  aria-expanded={scheduleOpen}
                >
                  <span>
                    <span className="font-medium">Planning</span>
                    <span className="ml-1.5 text-muted">optionnel</span>
                  </span>
                  <ChevronDown
                    size={16}
                    strokeWidth={2}
                    className={`shrink-0 text-muted transition-transform ${
                      scheduleOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {scheduleOpen ? (
                  <div className="space-y-3 border-t border-border px-3 py-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-xs text-muted">Début</span>
                        <input
                          type="datetime-local"
                          value={startsAt}
                          onChange={(event) => setStartsAt(event.target.value)}
                          disabled={isPending}
                          className={fieldClassName}
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs text-muted">Fin</span>
                        <input
                          type="datetime-local"
                          value={endsAt}
                          onChange={(event) => setEndsAt(event.target.value)}
                          disabled={isPending}
                          className={fieldClassName}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-muted">
                      Utile seulement si vous voulez une fenêtre précise. Vous
                      pourrez aussi la définir plus tard.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-surface px-5 py-4 sm:flex-row-reverse sm:items-center">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? isEdit
                  ? "Enregistrement…"
                  : "Création…"
                : isEdit
                  ? "Enregistrer"
                  : "Créer et ajouter des questions"}
            </button>
            <button
              type="button"
              onClick={requestClose}
              disabled={isPending}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-background hover:text-foreground disabled:opacity-60 sm:mr-auto"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
