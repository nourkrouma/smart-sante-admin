"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { QuestionFormDialog } from "@/components/onboarding/question-form-dialog";
import { DeleteQuestionDialog } from "@/components/onboarding/delete-question-dialog";
import { nextQuestionOrder } from "@/lib/onboarding";
import {
  onboardingQuestionTypeLabel,
  type OnboardingQuestion,
} from "@/types/onboarding";

const PAGE_SIZE = 10;

type QuestionsListProps = {
  questions: OnboardingQuestion[];
  onCreated: (question: OnboardingQuestion) => void;
  onUpdated: (question: OnboardingQuestion) => void;
  onDeleted: (id: string) => void;
};

export function QuestionsList({
  questions,
  onCreated,
  onUpdated,
  onDeleted,
}: QuestionsListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OnboardingQuestion | null>(null);
  const [deleting, setDeleting] = useState<OnboardingQuestion | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageQuestions = questions.slice(startIndex, startIndex + PAGE_SIZE);
  const rangeStart = questions.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + PAGE_SIZE, questions.length);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(question: OnboardingQuestion) {
    setEditing(question);
    setFormOpen(true);
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
        >
          <Plus size={16} strokeWidth={2} />
          Ajouter une question
        </button>
      </div>

      {questions.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          Aucune question pour le moment.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="px-5 py-3.5 font-medium">Ordre</th>
                  <th className="px-5 py-3.5 font-medium">Question</th>
                  <th className="px-5 py-3.5 font-medium">Type</th>
                  <th className="px-5 py-3.5 font-medium">Options</th>
                  <th className="px-5 py-3.5 font-medium">Requis</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageQuestions.map((question) => (
                  <tr
                    key={question.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-5 py-4 tabular-nums text-muted">
                      {question.order}
                    </td>
                    <td className="px-5 py-4 font-medium text-foreground">
                      {question.title}
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {onboardingQuestionTypeLabel(question.type)}
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {question.type === "text"
                        ? "—"
                        : question.options.length > 0
                          ? question.options.join(", ")
                          : "—"}
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {question.required ? "Oui" : "Non"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(question)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background"
                          aria-label={`Modifier ${question.title}`}
                        >
                          <Pencil size={14} strokeWidth={1.75} />
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(question)}
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                          aria-label={`Supprimer ${question.title}`}
                        >
                          <Trash2 size={14} strokeWidth={1.75} />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-muted">
              Affichage{" "}
              <span className="font-medium text-foreground">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              sur{" "}
              <span className="font-medium text-foreground">
                {questions.length}
              </span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} strokeWidth={2} />
                Précédent
              </button>
              <span className="min-w-24 text-center text-sm tabular-nums text-muted">
                Page {safePage} sur {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suivant
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        </>
      )}

      <QuestionFormDialog
        open={formOpen}
        question={editing}
        nextOrder={nextQuestionOrder(questions)}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={(saved) => {
          if (editing) onUpdated(saved);
          else onCreated(saved);
        }}
      />

      <DeleteQuestionDialog
        question={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={onDeleted}
      />
    </>
  );
}
