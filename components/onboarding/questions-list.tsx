"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import {
  QuestionFormDialog,
  type QuestionFormInput,
  type QuestionFormValue,
} from "@/components/onboarding/question-form-dialog";
import { DeleteQuestionDialog } from "@/components/onboarding/delete-question-dialog";
import { nextQuestionOrder } from "@/lib/onboarding";
import { moveItem } from "@/lib/reorder";
import {
  onboardingQuestionTypeLabel,
  type OnboardingQuestionType,
} from "@/types/onboarding";

export type ListedQuestion = {
  id: string;
  title: string;
  type: OnboardingQuestionType;
  options: string[];
  order: number;
  required: boolean;
};

type QuestionsListProps<T extends ListedQuestion> = {
  questions: T[];
  addLabel?: string;
  emptyLabel?: string;
  deleteDescription?: (question: T) => ReactNode;
  onSubmit: (id: string | null, input: QuestionFormInput) => Promise<T>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (questions: T[]) => Promise<void>;
  onCreated: (question: T) => void;
  onUpdated: (question: T) => void;
  onDeleted: (id: string) => void;
};

export function QuestionsList<T extends ListedQuestion>({
  questions,
  addLabel = "Ajouter une question",
  emptyLabel = "Aucune question pour le moment.",
  deleteDescription,
  onSubmit,
  onDelete,
  onReorder,
  onCreated,
  onUpdated,
  onDeleted,
}: QuestionsListProps<T>) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const canReorder = questions.length > 1;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(question: T) {
    setEditing(question);
    setFormOpen(true);
  }

  function toFormValue(question: T): QuestionFormValue {
    return {
      id: question.id,
      title: question.title,
      type: question.type,
      options: question.options,
      order: question.order,
      required: question.required,
    };
  }

  async function move(index: number, direction: -1 | 1) {
    if (reordering) return;
    const next = moveItem(questions, index, direction);
    if (!next) return;

    setReordering(true);
    setReorderError(null);
    try {
      await onReorder(next);
    } catch (error) {
      setReorderError(
        error instanceof Error
          ? error.message
          : "Impossible de changer l’ordre",
      );
    } finally {
      setReordering(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {questions.length === 0
            ? "Commencez par la première question."
            : `${questions.length} question${questions.length > 1 ? "s" : ""}, dans l’ordre d’affichage.`}
        </p>
        {questions.length > 0 ? (
          <button
            type="button"
            onClick={openCreate}
            disabled={reordering}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-60"
          >
            <Plus size={16} strokeWidth={2} />
            {addLabel}
          </button>
        ) : null}
      </div>

      {reorderError ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {reorderError}
        </p>
      ) : null}

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-5 py-12 text-center">
          <p className="text-sm font-medium text-foreground">Aucune question</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">{emptyLabel}</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
          >
            <Plus size={16} strokeWidth={2} />
            {addLabel}
          </button>
        </div>
      ) : (
        <ol className="space-y-3">
          {questions.map((question, index) => (
            <li
              key={question.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-1">
                  {canReorder ? (
                    <button
                      type="button"
                      onClick={() => void move(index, -1)}
                      disabled={reordering || index === 0}
                      className="rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Monter « ${question.title} »`}
                    >
                      <ChevronUp size={16} strokeWidth={2} />
                    </button>
                  ) : null}
                  <span className="flex size-7 items-center justify-center rounded-full bg-surface text-xs font-semibold text-foreground tabular-nums ring-1 ring-border">
                    {index + 1}
                  </span>
                  {canReorder ? (
                    <button
                      type="button"
                      onClick={() => void move(index, 1)}
                      disabled={reordering || index === questions.length - 1}
                      className="rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Descendre « ${question.title} »`}
                    >
                      <ChevronDown size={16} strokeWidth={2} />
                    </button>
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-foreground ring-1 ring-border">
                        {onboardingQuestionTypeLabel(question.type)}
                      </span>
                      <span className="text-xs text-muted">
                        {question.required ? "Obligatoire" : "Facultative"}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-medium text-foreground">
                      {question.title}
                    </h3>
                    {question.type === "text" ? (
                      <p className="mt-2 text-sm text-muted">
                        Réponse écrite par l’utilisateur
                      </p>
                    ) : question.options.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {question.options.slice(0, 4).map((option, optionIndex) => (
                          <li
                            key={`${option}-${optionIndex}`}
                            className="max-w-full truncate rounded-md bg-surface px-2 py-0.5 text-xs text-foreground ring-1 ring-border"
                          >
                            {option}
                          </li>
                        ))}
                        {question.options.length > 4 ? (
                          <li className="px-1 text-xs text-muted">
                            +{question.options.length - 4}
                          </li>
                        ) : null}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-muted">Aucune option</p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(question)}
                      disabled={reordering}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-50"
                      aria-label={`Modifier ${question.title}`}
                    >
                      <Pencil size={14} strokeWidth={1.75} />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(question)}
                      disabled={reordering}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                      aria-label={`Supprimer ${question.title}`}
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <QuestionFormDialog
        open={formOpen}
        question={editing ? toFormValue(editing) : null}
        nextOrder={nextQuestionOrder(questions)}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={(input) => onSubmit(editing?.id ?? null, input)}
        onSaved={(saved) => {
          if (editing) onUpdated(saved);
          else onCreated(saved);
        }}
      />

      <DeleteQuestionDialog
        question={deleting}
        description={
          deleting && deleteDescription
            ? deleteDescription(deleting)
            : undefined
        }
        onClose={() => setDeleting(null)}
        onDelete={onDelete}
        onDeleted={onDeleted}
      />
    </>
  );
}
