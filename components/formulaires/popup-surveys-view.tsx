"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { QuestionsList } from "@/components/onboarding/questions-list";
import { ResponseStats } from "@/components/onboarding/response-stats";
import { DeleteQuestionDialog } from "@/components/onboarding/delete-question-dialog";
import { SurveyFormDialog } from "@/components/formulaires/survey-form-dialog";
import {
  SURVEY_AVAILABILITY_LABELS,
  surveyAvailability,
  surveyScheduleLabel,
} from "@/lib/popup-survey-input";
import { getPopupSurveyStats } from "@/lib/popup-survey-stats";
import { moveItem } from "@/lib/reorder";
import {
  createPopupSurvey,
  deletePopupSurvey,
  getPopupSurveys,
  nextSurveyOrder,
  sortSurveyQuestions,
  updatePopupSurvey,
} from "@/lib/popup-surveys";
import type { PopupSurvey, PopupSurveyQuestion } from "@/types/popup-survey";

type SurveyDetailTab = "questions" | "stats";

function SurveyStatusBadge({ survey }: { survey: PopupSurvey }) {
  const status = surveyAvailability(survey);
  const live = status === "live";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        live
          ? "bg-brand/10 text-brand"
          : "bg-background text-muted ring-1 ring-border"
      }`}
    >
      {SURVEY_AVAILABILITY_LABELS[status]}
    </span>
  );
}

function sortSurveys(surveys: PopupSurvey[]) {
  return [...surveys].sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title, "fr"),
  );
}

function questionCountLabel(count: number) {
  return `${count} question${count === 1 ? "" : "s"}`;
}

export function PopupSurveysView({
  onDetailOpenChange,
}: {
  onDetailOpenChange?: (open: boolean) => void;
}) {
  const [surveys, setSurveys] = useState<PopupSurvey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PopupSurvey | null>(null);
  const [deleting, setDeleting] = useState<PopupSurvey | null>(null);
  const [openSurveyId, setOpenSurveyId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<SurveyDetailTab>("questions");
  const [movingId, setMovingId] = useState<string | null>(null);

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

  const detailOpen = openSurvey !== null;

  useEffect(() => {
    onDetailOpenChange?.(detailOpen);
  }, [detailOpen, onDetailOpenChange]);

  const surveyStats = useMemo(
    () =>
      openSurvey
        ? getPopupSurveyStats(openSurvey.questions, openSurvey.stats)
        : null,
    [openSurvey],
  );

  function rememberSurvey(survey: PopupSurvey) {
    setSurveys((current) =>
      current
        ? sortSurveys(
            current.some((item) => item.id === survey.id)
              ? current.map((item) =>
                  item.id === survey.id
                    ? {
                        ...survey,
                        createdAt: item.createdAt,
                        // Preserve aggregates written by the app.
                        stats: survey.stats ?? item.stats,
                        statsUpdatedAt:
                          survey.statsUpdatedAt ?? item.statsUpdatedAt,
                      }
                    : item,
                )
              : [...current, survey],
          )
        : current,
    );
  }

  async function moveSurvey(index: number, direction: -1 | 1) {
    if (!surveys || movingId) return;
    const next = moveItem(surveys, index, direction);
    if (!next) return;

    const changed = next.filter((survey) => {
      const before = surveys.find((item) => item.id === survey.id);
      return before != null && before.order !== survey.order;
    });

    setSurveys(next);
    setMovingId(changed[0]?.id ?? "moving");
    setError(null);
    try {
      const saved = await Promise.all(
        changed.map((survey) =>
          updatePopupSurvey(survey.id, {
            title: survey.title,
            description: survey.description,
            active: survey.active,
            startsAt: survey.startsAt,
            endsAt: survey.endsAt,
            order: survey.order,
            questions: survey.questions,
          }),
        ),
      );
      saved.forEach((survey) => rememberSurvey(survey));
    } catch (moveError) {
      setError(
        moveError instanceof Error
          ? moveError.message
          : "Impossible de changer l’ordre",
      );
      try {
        setSurveys(sortSurveys(await getPopupSurveys()));
      } catch {
        setSurveys(surveys);
      }
    } finally {
      setMovingId(null);
    }
  }

  async function persistSurvey(
    survey: PopupSurvey,
    questions: PopupSurveyQuestion[],
  ): Promise<PopupSurvey> {
    return updatePopupSurvey(survey.id, {
      title: survey.title,
      description: survey.description,
      active: survey.active,
      startsAt: survey.startsAt,
      endsAt: survey.endsAt,
      order: survey.order,
      questions: sortSurveyQuestions(questions),
    });
  }

  function hideSurvey() {
    setOpenSurveyId(null);
    setDetailTab("questions");
    onDetailOpenChange?.(false);
  }

  function showSurvey(id: string, tab: SurveyDetailTab) {
    setDetailTab(tab);
    setOpenSurveyId(id);
    onDetailOpenChange?.(true);
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
          onClick={hideSurvey}
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(openSurvey);
                  setFormOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background"
              >
                <Pencil size={14} strokeWidth={1.75} />
                Modifier
              </button>
              <SurveyStatusBadge survey={openSurvey} />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            {questionCountLabel(openSurvey.questions.length)} ·{" "}
            {surveyScheduleLabel(openSurvey)}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Sections enquête"
          className="mb-6 flex gap-5 border-b border-border"
        >
          {(
            [
              {
                id: "questions",
                label: `Questions (${openSurvey.questions.length})`,
              },
              { id: "stats", label: "Statistiques" },
            ] as const
          ).map((item) => {
            const selected = detailTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setDetailTab(item.id)}
                className={`-mb-px border-b-2 px-0.5 pb-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-brand text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="mb-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        {detailTab === "questions" ? (
          <QuestionsList
            key={openSurvey.id}
            questions={openSurvey.questions}
            emptyLabel="Ajoutez la première question. L’application les affichera dans cet ordre."
            deleteDescription={(question) => (
              <>
                Cette question sera retirée de{" "}
                <span className="font-medium text-foreground">
                  {openSurvey.title}
                </span>
                {" : "}
                <span className="font-medium text-foreground">
                  {question.title}
                </span>
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
                saved.questions.find((item) => item.id === question.id) ??
                question;
              return savedQuestion;
            }}
            onDelete={async (id) => {
              const saved = await persistSurvey(
                openSurvey,
                openSurvey.questions.filter((item) => item.id !== id),
              );
              rememberSurvey(saved);
            }}
            onReorder={async (next) => {
              const snapshot = openSurvey;
              rememberSurvey({ ...snapshot, questions: next });
              try {
                const saved = await persistSurvey(
                  { ...snapshot, questions: next },
                  next,
                );
                rememberSurvey(saved);
              } catch (reorderError) {
                rememberSurvey(snapshot);
                throw reorderError;
              }
            }}
            onCreated={() => {}}
            onUpdated={() => {}}
            onDeleted={() => {}}
          />
        ) : (
          <>
            {openSurvey.questions.length > 0 ? (
              <p className="mb-4 text-sm text-muted">
                Totaux envoyés par l’application. Les réponses écrites ne sont pas
                listées une à une.
              </p>
            ) : null}
            <ResponseStats
              stats={surveyStats ?? []}
              emptyAnswersLabel="Aucune réponse agrégée pour cette enquête."
            />
          </>
        )}

        {formOpen ? (
          <SurveyFormDialog
            key={editing?.id ?? "new"}
            open
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
                startsAt: input.startsAt,
                endsAt: input.endsAt,
                order: input.order,
                questions: editing?.questions ?? [],
              };
              return editing
                ? updatePopupSurvey(editing.id, payload)
                : createPopupSurvey(payload);
            }}
            onSaved={(survey) => {
              const created = editing === null;
              rememberSurvey(survey);
              if (created) showSurvey(survey.id, "questions");
            }}
          />
        ) : null}
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
          {surveys.map((survey, index) => {
            const preview = sortSurveyQuestions(survey.questions).slice(0, 3);
            return (
              <li
                key={survey.id}
                className="rounded-xl border border-border bg-background p-4 sm:p-5"
              >
                <div className="flex gap-3">
                  {surveys.length > 1 ? (
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void moveSurvey(index, -1)}
                        disabled={movingId !== null || index === 0}
                        className="rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Monter « ${survey.title} »`}
                      >
                        <ChevronUp size={16} strokeWidth={2} />
                      </button>
                      <span className="flex size-7 items-center justify-center rounded-full bg-surface text-xs font-semibold text-foreground tabular-nums ring-1 ring-border">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => void moveSurvey(index, 1)}
                        disabled={
                          movingId !== null || index === surveys.length - 1
                        }
                        className="rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Descendre « ${survey.title} »`}
                      >
                        <ChevronDown size={16} strokeWidth={2} />
                      </button>
                    </div>
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => showSurvey(survey.id, "questions")}
                      className="w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-foreground">
                          {survey.title}
                        </h2>
                        <SurveyStatusBadge survey={survey} />
                      </div>
                      {survey.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted">
                          {survey.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted">
                        {questionCountLabel(survey.questions.length)} ·{" "}
                        {surveyScheduleLabel(survey)}
                      </p>
                      {preview.length > 0 ? (
                        <ol className="mt-3 space-y-1">
                          {preview.map((question, questionIndex) => (
                            <li
                              key={question.id}
                              className="truncate text-sm text-muted"
                            >
                              <span className="mr-2 text-xs tabular-nums">
                                {questionIndex + 1}.
                              </span>
                              {question.title}
                            </li>
                          ))}
                          {survey.questions.length > preview.length ? (
                            <li className="text-xs text-muted">
                              + {survey.questions.length - preview.length} autres
                            </li>
                          ) : null}
                        </ol>
                      ) : (
                        <p className="mt-3 text-sm text-muted">
                          Aucune question pour le moment.
                        </p>
                      )}
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand">
                        Gérer les questions
                        <ChevronRight size={16} strokeWidth={2} />
                      </span>
                    </button>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => showSurvey(survey.id, "stats")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-background"
                      >
                        <BarChart3 size={14} strokeWidth={2} />
                        Statistiques
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(survey);
                          setFormOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-background"
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
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {formOpen ? (
      <SurveyFormDialog
        key={editing?.id ?? "new"}
        open
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
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            order: input.order,
            questions: editing?.questions ?? [],
          };
          return editing
            ? updatePopupSurvey(editing.id, payload)
            : createPopupSurvey(payload);
        }}
        onSaved={(survey) => {
          const created = editing === null;
          rememberSurvey(survey);
          if (created) showSurvey(survey.id, "questions");
        }}
      />
      ) : null}

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
