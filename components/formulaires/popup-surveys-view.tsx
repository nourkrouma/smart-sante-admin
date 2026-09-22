"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { QuestionsList } from "@/components/onboarding/questions-list";
import { DeleteQuestionDialog } from "@/components/onboarding/delete-question-dialog";
import { SurveyFormDialog } from "@/components/formulaires/survey-form-dialog";
import {
  createPopupSurvey,
  deletePopupSurvey,
  getPopupSurveys,
  nextSurveyOrder,
  sortSurveyQuestions,
  updatePopupSurvey,
} from "@/lib/popup-surveys";
import type { PopupSurvey, PopupSurveyQuestion } from "@/types/popup-survey";

function sortSurveys(surveys: PopupSurvey[]) {
  return [...surveys].sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title, "fr"),
  );
}

function questionCountLabel(count: number) {
  return `${count} question${count === 1 ? "" : "s"}`;
}

export function PopupSurveysView() {
  const [surveys, setSurveys] = useState<PopupSurvey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PopupSurvey | null>(null);
  const [deleting, setDeleting] = useState<PopupSurvey | null>(null);
  const [openSurveyId, setOpenSurveyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getPopupSurveys()
      .then((loaded) => {
        if (!cancelled) setSurveys(loaded);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les enquêtes pop-up",
        );
        setSurveys([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const openSurvey =
    surveys && openSurveyId
      ? (surveys.find((survey) => survey.id === openSurveyId) ?? null)
      : null;

  function rememberSurvey(survey: PopupSurvey) {
    setSurveys((current) =>
      current
        ? sortSurveys(
            current.some((item) => item.id === survey.id)
              ? current.map((item) =>
                  item.id === survey.id
                    ? { ...survey, createdAt: item.createdAt }
                    : item,
                )
              : [...current, survey],
          )
        : current,
    );
  }

  async function persistSurvey(
    survey: PopupSurvey,
    questions: PopupSurveyQuestion[],
  ): Promise<PopupSurvey> {
    return updatePopupSurvey(survey.id, {
      title: survey.title,
      description: survey.description,
      active: survey.active,
      order: survey.order,
      questions: sortSurveyQuestions(questions),
    });
  }

  if (surveys === null) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-muted">
          <span
            className="size-4 animate-spin rounded-full border-2 border-border border-t-brand"
            aria-hidden
          />
          Chargement des enquêtes pop-up…
        </div>
      </div>
    );
  }

  if (openSurvey) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpenSurveyId(null)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Toutes les enquêtes
        </button>

        <div className="mb-6 rounded-xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Enquête pop-up
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                {openSurvey.title}
              </h2>
              {openSurvey.description ? (
                <p className="mt-1 text-sm text-muted">{openSurvey.description}</p>
              ) : null}
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                openSurvey.active
                  ? "bg-brand/10 text-brand"
                  : "bg-background text-muted ring-1 ring-border"
              }`}
            >
              {openSurvey.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {error ? (
          <p className="mb-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <QuestionsList
          key={openSurvey.id}
          questions={openSurvey.questions}
          emptyLabel="Ajoutez des questions à cette enquête. L’application les affichera ensemble."
          deleteDescription={(question) => (
            <>
              Cette question sera retirée de{" "}
              <span className="font-medium text-foreground">
                {openSurvey.title}
              </span>
              {" : "}
              <span className="font-medium text-foreground">{question.title}</span>
              .
            </>
          )}
          onSubmit={async (id, input) => {
            const question: PopupSurveyQuestion = {
              id: id ?? `${Date.now()}`,
              title: input.title,
              type: input.type,
              options: input.options,
              order: input.order,
              required: input.required,
            };
            const nextQuestions = id
              ? openSurvey.questions.map((item) =>
                  item.id === id ? question : item,
                )
              : [...openSurvey.questions, question];
            const saved = await persistSurvey(openSurvey, nextQuestions);
            rememberSurvey(saved);
            const savedQuestion =
              saved.questions.find((item) => item.id === question.id) ?? question;
            return savedQuestion;
          }}
          onDelete={async (id) => {
            const saved = await persistSurvey(
              openSurvey,
              openSurvey.questions.filter((item) => item.id !== id),
            );
            rememberSurvey(saved);
          }}
          onCreated={() => {}}
          onUpdated={() => {}}
          onDeleted={() => {}}
        />
      </div>
    );
  }

  return (
    <>
      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
        >
          <Plus size={16} strokeWidth={2} />
          Nouvelle enquête
        </button>
      </div>

      {surveys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-16 text-center">
          <p className="text-sm font-medium text-foreground">
            Aucune enquête pop-up
          </p>
          <p className="mt-1 text-sm text-muted">
            Créez une enquête, puis ajoutez-y un groupe de questions. L’application
            les affichera ensemble, de temps en temps.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {surveys.map((survey) => (
            <li
              key={survey.id}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">
                      {survey.title}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        survey.active
                          ? "bg-brand/10 text-brand"
                          : "bg-background text-muted ring-1 ring-border"
                      }`}
                    >
                      {survey.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {survey.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {survey.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted">
                    {questionCountLabel(survey.questions.length)} · ordre{" "}
                    {survey.order}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setOpenSurveyId(survey.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-black"
                >
                  <ListChecks size={14} strokeWidth={2} />
                  Questions
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(survey);
                    setFormOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-background"
                >
                  <Pencil size={14} strokeWidth={1.75} />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(survey)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SurveyFormDialog
        open={formOpen}
        survey={editing}
        nextOrder={nextSurveyOrder(surveys)}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={(input) => {
          const payload = {
            title: input.title,
            description: input.description,
            active: input.active,
            order: input.order,
            questions: editing?.questions ?? [],
          };
          return editing
            ? updatePopupSurvey(editing.id, payload)
            : createPopupSurvey(payload);
        }}
        onSaved={rememberSurvey}
      />

      <DeleteQuestionDialog
        question={deleting}
        heading="Supprimer l’enquête ?"
        description={
          deleting ? (
            <>
              Cette action supprimera{" "}
              <span className="font-medium text-foreground">
                {deleting.title}
              </span>{" "}
              et ses {questionCountLabel(deleting.questions.length)}. Les
              réponses déjà enregistrées dans l’application ne seront pas
              supprimées.
            </>
          ) : undefined
        }
        onClose={() => setDeleting(null)}
        onDelete={deletePopupSurvey}
        onDeleted={(id) => {
          setSurveys((current) =>
            current ? current.filter((item) => item.id !== id) : current,
          );
        }}
      />
    </>
  );
}
