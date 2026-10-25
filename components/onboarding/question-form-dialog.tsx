"use client";

import {
  useEffect,
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

const TYPE_DETAILS: Record<OnboardingQuestionType, string> = {
  single: "Une seule réponse",
  multiple: "Plusieurs réponses",
  text: "Réponse écrite",
};

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
  const [title, setTitle] = useState(question?.title ?? "");
  const [type, setType] = useState<OnboardingQuestionType>(
    question?.type ?? "single",
  );
  const [options, setOptions] = useState(() =>
    draftsFrom(question?.options ?? []),
  );
  const [order, setOrder] = useState(String(question?.order ?? nextOrder));
  const [required, setRequired] = useState(question?.required ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const optionRefs = useRef<Array<HTMLInputElement | null>>([]);
  const focusIndex = useRef<number | null>(null);

  useEffect(() => {
    if (focusIndex.current == null) return;
    const index = focusIndex.current;
    focusIndex.current = null;
    optionRefs.current[index]?.focus();
  }, [options]);

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

  function selectType(next: OnboardingQuestionType) {
    setType(next);
    if (next !== "text") {
      setOptions((current) => (current.length >= 2 ? current : draftsFrom(
        current.map((option) => option.value),
      )));
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
    setOptions((current) => current.filter((option) => option.key !== key));
  }

  function onOptionKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addOption(index);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedOrder = Number.parseInt(order, 10);
    const input: QuestionFormInput = {
      title,
      type,
      options: type === "text" ? [] : options.map((option) => option.value),
      order: Number.isFinite(parsedOrder) ? parsedOrder : Number.NaN,
      required,
    };

    if (type !== "text") {
      const distinct = new Set(
        filledValues(options).map((value) => value.toLowerCase()),
      );
      if (distinct.size < 2) {
        setError("Ajoutez au moins deux options distinctes");
        return;
      }
    }

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

  const filled = filledValues(options);
  const distinctCount = new Set(filled.map((value) => value.toLowerCase())).size;
  const showOptions = type !== "text";

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
        className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-surface shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <div>
            <h2
              id="question-form-title"
              className="text-base font-semibold text-foreground"
            >
              {isEdit ? "Modifier la question" : "Ajouter une question"}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Écrivez la question, puis choisissez comment on y répond.
            </p>
          </div>
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

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Question
            </span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              autoFocus
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              placeholder="Ex. Quel est votre objectif ?"
            />
          </label>

          <fieldset className="space-y-1.5" disabled={isPending}>
            <legend className="text-xs font-medium uppercase tracking-wide text-muted">
              Type de réponse
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {ONBOARDING_QUESTION_TYPES.map((value) => {
                const selected = type === value;
                return (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 ${
                      selected
                        ? "border-brand bg-brand/5 ring-2 ring-brand/20"
                        : "border-border hover:border-foreground/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="question-type"
                      value={value}
                      checked={selected}
                      onChange={() => selectType(value)}
                      className="mt-0.5 accent-brand"
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">
                        {ONBOARDING_QUESTION_TYPE_LABELS[value]}
                      </span>
                      <span className="block text-xs text-muted">
                        {TYPE_DETAILS[value]}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {showOptions ? (
            <div className="space-y-2">
              <span className="block text-xs font-medium uppercase tracking-wide text-muted">
                Options
              </span>
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
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
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
                      disabled={isPending}
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
              >
                <Plus size={14} strokeWidth={2} />
                Ajouter une option
              </button>
              <p className="text-xs text-muted">
                Au moins deux réponses différentes. Entrée ajoute la suivante.
                {filled.length > distinctCount
                  ? " Les doublons ne sont enregistrés qu’une fois."
                  : ""}
              </p>
            </div>
          ) : (
            <p className="rounded-lg bg-background px-3 py-2 text-sm text-muted">
              L’utilisateur écrit sa réponse. Il n’y a pas d’options à préparer.
            </p>
          )}

          <QuestionPreview
            title={title}
            type={type}
            options={filled}
            required={required}
          />

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Réglages
            </p>
            <SwitchRow
              checked={required}
              onChange={setRequired}
              disabled={isPending}
              title="Réponse obligatoire"
              description="L’utilisateur doit répondre avant de continuer."
            />
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Position
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={order}
                onChange={(event) => setOrder(event.target.value)}
                required
                disabled={isPending}
                className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              />
              <span className="block text-xs text-muted">
                1 s’affiche en premier. Les flèches de la liste font la même chose.
              </span>
            </label>
          </div>

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
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

function QuestionPreview({
  title,
  type,
  options,
  required,
}: {
  title: string;
  type: OnboardingQuestionType;
  options: string[];
  required: boolean;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        Aperçu
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">
        {title.trim() || "Votre question"}
        {required ? <span className="text-brand"> *</span> : null}
      </p>
      {type === "text" ? (
        <div className="mt-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted">
          Réponse de l’utilisateur
        </div>
      ) : options.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Les options apparaîtront ici.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {options.map((option, index) => (
            <li
              key={`${option}-${index}`}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <span
                className={`size-3.5 shrink-0 border border-foreground/30 ${
                  type === "single" ? "rounded-full" : "rounded-[3px]"
                }`}
              />
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
