"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { SwitchRow } from "@/components/ui/switch-row";
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
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [, startPublishTransition] = useTransition();

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
    overrides: Partial<Pick<PopupSurvey, "active">> = {},
  ): Promise<PopupSurvey> {
    const requestedActive = overrides.active ?? survey.active;
    // Empty surveys cannot stay published.
    const active = questions.length > 0 && requestedActive;

    return updatePopupSurvey(survey.id, {
      title: survey.title,
      description: survey.description,
      active,
      startsAt: survey.startsAt,
      endsAt: survey.endsAt,
      order: survey.order,
      questions: sortSurveyQuestions(questions),
    });
  }

  function setPublished(survey: PopupSurvey, active: boolean) {
    if (publishingId) return;
    if (active && survey.questions.length === 0) {
      setError("Ajoutez au moins une question avant de publier");
      return;
    }
    setError(null);
    setPublishingId(survey.id);
    const previous = survey;
    rememberSurvey({ ...survey, active });

    startPublishTransition(async () => {
      try {
        const saved = await persistSurvey(survey, survey.questions, { active });
        rememberSurvey(saved);
      } catch (publishError) {
        rememberSurvey(previous);
        setError(
          publishError instanceof Error
            ? publishError.message
            : "Impossible de mettre à jour la publication",
        );
      } finally {
        setPublishingId(null);
      }
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

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(survey: PopupSurvey) {
    setEditing(survey);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function submitForm(input: {
    title: string;
    description: string;
    active: boolean;
    startsAt: string | null;
    endsAt: string | null;
    order: number;
  }) {
    const questions = editing?.questions ?? [];
    const payload = {
      title: input.title,
      description: input.description,
      // Publish only from the detail toggle; create/edit keep current state.
      active: editing ? editing.active && questions.length > 0 : false,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      order: input.order,
      questions,
    };
    return editing
      ? updatePopupSurvey(editing.id, payload)
      : createPopupSurvey(payload);
  }

  function handleFormSaved(survey: PopupSurvey) {
    const created = editing === null;
    rememberSurvey(survey);
    if (created) showSurvey(survey.id, "questions");
  }

  const formDialog = formOpen ? (
    <SurveyFormDialog
      key={editing?.id ?? "new"}
      open
      survey={editing}
      nextOrder={nextSurveyOrder(surveys ?? [])}
      onClose={closeForm}
      onSubmit={submitForm}
      onSaved={handleFormSaved}
    />
  ) : null;

  if (surveys === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
        <span
          className="size-4 animate-spin rounded-full border-2 border-border border-t-brand"
          aria-hidden
        />
        Chargement des enquêtes…
      </div>
    );
  }

  if (openSurvey) {
    return (
      <div>
        <button
          type="button"
          onClick={hideSurvey}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Toutes les enquêtes
        </button>

        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {openSurvey.title}
                </h2>
                <SurveyStatusBadge survey={openSurvey} />
              </div>
              {openSurvey.description ? (
                <p className="mt-1 text-sm text-muted">{openSurvey.description}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted">
                {questionCountLabel(openSurvey.questions.length)}
                {openSurvey.active
                  ? ` · ${surveyScheduleLabel(openSurvey)}`
                  : null}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openEdit(openSurvey)}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background"
            >
              <Pencil size={14} strokeWidth={1.75} />
              Modifier
            </button>
          </div>

          <SwitchRow
            checked={openSurvey.active}
            onChange={(active) => setPublished(openSurvey, active)}
            disabled={
              publishingId === openSurvey.id ||
              (!openSurvey.active && openSurvey.questions.length === 0)
            }
            title={openSurvey.active ? "Publiée" : "Publier"}
            description={
              openSurvey.active
                ? "Visible dans l’app selon le planning. Désactivez pour repasser en brouillon."
                : openSurvey.questions.length === 0
                  ? "Ajoutez au moins une question avant de publier."
                  : "Une fois publiée, l’enquête peut s’afficher dans l’application."
            }
          />
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
            emptyLabel="Ajoutez la première question, puis publiez l’enquête."
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
                Totaux envoyés par l’application.
              </p>
            ) : null}
            <ResponseStats
              stats={surveyStats ?? []}
              emptyAnswersLabel="Aucune réponse agrégée pour cette enquête."
            />
          </>
        )}

        {formDialog}
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

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {surveys.length === 0
            ? "Aucune enquête"
            : `${surveys.length} enquête${surveys.length === 1 ? "" : "s"}`}
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
        >
          <Plus size={16} strokeWidth={2} />
          Nouvelle enquête
        </button>
      </div>

      {surveys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-5 py-14 text-center">
          <p className="text-sm font-medium text-foreground">
            Créez votre première enquête
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Elle sera enregistrée en brouillon. Ajoutez des questions, puis
            publiez-la pour l’afficher dans l’app.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
          >
            <Plus size={16} strokeWidth={2} />
            Nouvelle enquête
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {surveys.map((survey, index) => (
            <li key={survey.id} className="bg-background">
              <div className="flex items-stretch gap-1 p-3 sm:gap-2 sm:p-4">
                {surveys.length > 1 ? (
                  <div className="flex flex-col justify-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => void moveSurvey(index, -1)}
                      disabled={movingId !== null || index === 0}
                      className="rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Monter « ${survey.title} »`}
                    >
                      <ChevronUp size={16} strokeWidth={2} />
                    </button>
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

                <button
                  type="button"
                  onClick={() => showSurvey(survey.id, "questions")}
                  className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-left outline-none transition-colors hover:bg-surface/80 focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-foreground">
                      {survey.title}
                    </h2>
                    <SurveyStatusBadge survey={survey} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {questionCountLabel(survey.questions.length)} ·{" "}
                    {surveyScheduleLabel(survey)}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand">
                    Ouvrir
                    <ChevronRight size={14} strokeWidth={2} />
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => showSurvey(survey.id, "stats")}
                    className="rounded-md p-2 text-muted transition-colors hover:bg-surface hover:text-foreground"
                    aria-label={`Statistiques de « ${survey.title} »`}
                    title="Statistiques"
                  >
                    <BarChart3 size={16} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(survey)}
                    className="rounded-md p-2 text-muted transition-colors hover:bg-surface hover:text-foreground"
                    aria-label={`Modifier « ${survey.title} »`}
                    title="Modifier"
                  >
                    <Pencil size={16} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(survey)}
                    className="rounded-md p-2 text-muted transition-colors hover:bg-red-50 hover:text-red-700"
                    aria-label={`Supprimer « ${survey.title} »`}
                    title="Supprimer"
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formDialog}

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
