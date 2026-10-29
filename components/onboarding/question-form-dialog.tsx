"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { SwitchRow } from "@/components/ui/switch-row";
import {
  ONBOARDING_QUESTION_TYPES,
  ONBOARDING_QUESTION_TYPE_LABELS,
  type OnboardingQuestionType,
} from "@/types/onboarding";

export type QuestionFormInput = {
  title: string;
  type: OnboardingQuestionType;
  options: string[];
  order: number;
  required: boolean;
};

export type QuestionFormValue = {
  id: string;
  title: string;
  type: OnboardingQuestionType;
  options: string[];
  order: number;
  required: boolean;
};

type QuestionFormDialogProps<T> = {
  open: boolean;
  question: QuestionFormValue | null;
  nextOrder: number;
  onClose: () => void;
  onSubmit: (input: QuestionFormInput) => Promise<T>;
  onSaved: (question: T) => void;
};

type OptionDraft = {
  key: string;
  value: string;
};

const TYPE_HINTS: Record<OnboardingQuestionType, string> = {
  single: "Une seule réponse",
  multiple: "Plusieurs réponses possibles",
  text: "Champ libre",
};

const fieldClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-brand/30 placeholder:text-muted/70 focus:ring-2 disabled:opacity-60";

function newDraft(value = ""): OptionDraft {
  return { key: crypto.randomUUID(), value };
}

function draftsFrom(options: string[]): OptionDraft[] {
  const drafts = options.map((value) => newDraft(value));
  while (drafts.length < 2) drafts.push(newDraft());
  return drafts;
}

function filledValues(options: OptionDraft[]): string[] {
  return options.map((option) => option.value.trim()).filter(Boolean);
}

function distinctCount(values: string[]): number {
  return new Set(values.map((value) => value.toLowerCase())).size;
}

export function QuestionFormDialog<T>(props: QuestionFormDialogProps<T>) {
  if (!props.open) return null;
  return (
    <QuestionFormBody
      key={props.question?.id ?? `new-${props.nextOrder}`}
      {...props}
    />
  );
}

function QuestionFormBody<T>({
  open,
  question,
  nextOrder,
  onClose,
  onSubmit,
  onSaved,
}: QuestionFormDialogProps<T>) {
  const isEdit = question !== null;
  const titleId = useId();
  const [title, setTitle] = useState(question?.title ?? "");
  const [type, setType] = useState<OnboardingQuestionType>(
    question?.type ?? "single",
  );
  const [options, setOptions] = useState(() =>
    draftsFrom(question?.options ?? []),
  );
  const [required, setRequired] = useState(question?.required ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const optionRefs = useRef<Array<HTMLInputElement | null>>([]);
  const focusIndex = useRef<number | null>(null);

  const trimmedTitle = title.trim();
  const filled = filledValues(options);
  const uniqueOptions = distinctCount(filled);
  const showOptions = type !== "text";
  const optionsReady = !showOptions || uniqueOptions >= 2;
  const canSubmit = trimmedTitle.length > 0 && optionsReady && !isPending;
  const dirty = isEdit
    ? title !== (question?.title ?? "") ||
      type !== (question?.type ?? "single") ||
      required !== (question?.required ?? true) ||
      options.map((option) => option.value).join("\n") !==
        (question?.options ?? []).join("\n")
    : trimmedTitle.length > 0 ||
      type !== "single" ||
      required !== true ||
      filled.length > 0 ||
      options.length > 2;

  useEffect(() => {
    if (focusIndex.current == null) return;
    const index = focusIndex.current;
    focusIndex.current = null;
    optionRefs.current[index]?.focus();
  }, [options]);

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

  function selectType(next: OnboardingQuestionType) {
    setType(next);
    setError(null);
    if (next !== "text") {
      setOptions((current) =>
        current.length >= 2
          ? current
          : draftsFrom(current.map((option) => option.value)),
      );
    }
  }

  function updateOption(key: string, value: string) {
    setOptions((current) =>
      current.map((option) =>
        option.key === key ? { ...option, value } : option,
      ),
    );
  }

  function moveOption(index: number, direction: -1 | 1) {
    setOptions((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  function addOption(after?: number) {
    setOptions((current) => {
      const insertAt = after == null ? current.length : after + 1;
      focusIndex.current = insertAt;
      const next = [...current];
      next.splice(insertAt, 0, newDraft());
      return next;
    });
  }

  function removeOption(key: string) {
    setOptions((current) => {
      if (current.length <= 2) return current;
      return current.filter((option) => option.key !== key);
    });
  }

  function onOptionKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      addOption(index);
      return;
    }
    if (
      event.key === "Backspace" &&
      options[index]?.value === "" &&
      options.length > 2
    ) {
      event.preventDefault();
      const previous = Math.max(0, index - 1);
      focusIndex.current = previous;
      setOptions((current) => current.filter((_, i) => i !== index));
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);

    if (showOptions && uniqueOptions < 2) {
      setError("Ajoutez au moins deux options distinctes");
      return;
    }

    const input: QuestionFormInput = {
      title: trimmedTitle,
      type,
      options: showOptions ? options.map((option) => option.value) : [],
      order: question?.order ?? nextOrder,
      required,
    };

    startTransition(async () => {
      try {
        const saved = await onSubmit(input);
        onSaved(saved);
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={requestClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-form-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id="question-form-title"
              className="text-base font-semibold text-foreground"
            >
              {isEdit ? "Modifier la question" : "Nouvelle question"}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {isEdit
                ? "Mettez à jour le texte, le type ou les options."
                : "Posez la question, puis choisissez le type de réponse."}
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto px-5 py-5">
            <label className="block space-y-1.5" htmlFor={titleId}>
              <span className="text-sm font-medium text-foreground">
                Question
              </span>
              <input
                id={titleId}
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                autoFocus
                disabled={isPending}
                className={fieldClassName}
                placeholder="Ex. Quel est votre objectif ?"
              />
            </label>

            <fieldset className="space-y-2" disabled={isPending}>
              <legend className="text-sm font-medium text-foreground">
                Type de réponse
              </legend>
              <div
                role="radiogroup"
                aria-label="Type de réponse"
                className="grid grid-cols-3 gap-1 rounded-lg bg-background p-1 ring-1 ring-border"
              >
                {ONBOARDING_QUESTION_TYPES.map((value) => {
                  const selected = type === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => selectType(value)}
                      className={`rounded-md px-2 py-2 text-center text-xs font-medium transition-colors sm:text-sm ${
                        selected
                          ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {ONBOARDING_QUESTION_TYPE_LABELS[value]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted">{TYPE_HINTS[type]}</p>
            </fieldset>

            {showOptions ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Options
                  </span>
                  <span className="text-xs text-muted">
                    {uniqueOptions}/2 min.
                  </span>
                </div>
                <ol className="space-y-2">
                  {options.map((option, index) => (
                    <li key={option.key} className="flex items-center gap-1.5">
                      <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted">
                        {index + 1}
                      </span>
                      <input
                        ref={(node) => {
                          optionRefs.current[index] = node;
                        }}
                        type="text"
                        value={option.value}
                        onChange={(event) =>
                          updateOption(option.key, event.target.value)
                        }
                        onKeyDown={(event) => onOptionKeyDown(event, index)}
                        disabled={isPending}
                        autoComplete="off"
                        placeholder={`Option ${index + 1}`}
                        aria-label={`Option ${index + 1}`}
                        className={`min-w-0 flex-1 ${fieldClassName}`}
                      />
                      <button
                        type="button"
                        onClick={() => moveOption(index, -1)}
                        disabled={isPending || index === 0}
                        className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground disabled:opacity-40"
                        aria-label={`Monter l’option ${index + 1}`}
                      >
                        <ChevronUp size={16} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveOption(index, 1)}
                        disabled={isPending || index === options.length - 1}
                        className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground disabled:opacity-40"
                        aria-label={`Descendre l’option ${index + 1}`}
                      >
                        <ChevronDown size={16} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeOption(option.key)}
                        disabled={isPending || options.length <= 2}
                        className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                        aria-label={`Retirer l’option ${index + 1}`}
                      >
                        <X size={16} strokeWidth={2} />
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => addOption()}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-black disabled:opacity-60"
                >
                  <Plus size={14} strokeWidth={2} />
                  Ajouter une option
                </button>
                <p className="text-xs text-muted">
                  Entrée ajoute la suivante
                  {filled.length > uniqueOptions
                    ? " · les doublons sont ignorés"
                    : ""}
                  .
                </p>
              </div>
            ) : (
              <p className="rounded-lg bg-background px-3 py-2.5 text-sm text-muted ring-1 ring-border">
                L’utilisateur écrira sa réponse librement — pas d’options à
                préparer.
              </p>
            )}

            <SwitchRow
              checked={required}
              onChange={setRequired}
              disabled={isPending}
              title="Réponse obligatoire"
              description="Sinon l’utilisateur peut passer sans répondre."
            />

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
                  : "Ajout…"
                : isEdit
                  ? "Enregistrer"
                  : "Ajouter la question"}
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
