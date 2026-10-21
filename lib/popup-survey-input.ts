import {
  isOnboardingQuestionType,
  type OnboardingQuestionType,
} from "@/types/onboarding";
import type { PopupSurveyQuestion } from "@/types/popup-survey";

export const POPUP_SURVEYS_COLLECTION = "popupSurveys";
export const MAX_SURVEY_QUESTIONS = 40;

export type PopupSurveyInput = {
  title: string;
  description: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  order: number;
  questions: PopupSurveyQuestion[];
};

export type SurveyAvailability = "inactive" | "scheduled" | "live" | "ended";

const SURVEY_DATE_FORMAT = new Intl.DateTimeFormat("fr-DZ", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function toDatetimeLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Browser-local `datetime-local` value to a UTC ISO instant. */
export function datetimeLocalToIso(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error(label);
  }
  return date.toISOString();
}

function normalizeOptionalInstant(
  value: string | null,
  label: string,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error(label);
  }
  return date.toISOString();
}

export function surveyAvailability(
  survey: Pick<PopupSurveyInput, "active" | "startsAt" | "endsAt">,
  now = new Date(),
): SurveyAvailability {
  if (!survey.active) return "inactive";
  const start = survey.startsAt ? new Date(survey.startsAt) : null;
  const end = survey.endsAt ? new Date(survey.endsAt) : null;
  if (start && !Number.isNaN(start.getTime()) && now < start) return "scheduled";
  if (end && !Number.isNaN(end.getTime()) && now >= end) return "ended";
  return "live";
}

export const SURVEY_AVAILABILITY_LABELS: Record<SurveyAvailability, string> = {
  inactive: "Inactive",
  scheduled: "Programmée",
  live: "En ligne",
  ended: "Terminée",
};

export function surveyScheduleLabel(
  survey: Pick<PopupSurveyInput, "startsAt" | "endsAt">,
): string {
  const start = survey.startsAt ? SURVEY_DATE_FORMAT.format(new Date(survey.startsAt)) : null;
  const end = survey.endsAt ? SURVEY_DATE_FORMAT.format(new Date(survey.endsAt)) : null;
  if (start && end) return `Du ${start} au ${end}`;
  if (start) return `Mise en ligne le ${start}`;
  if (end) return `Jusqu’au ${end}`;
  return "Mise en ligne immédiate";
}

export function sortSurveyQuestions(
  questions: PopupSurveyQuestion[],
): PopupSurveyQuestion[] {
  return [...questions].sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title, "fr"),
  );
}

function normalizeStringArray(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function normalizeQuestion(
  input: PopupSurveyQuestion,
  fallbackId: string,
): PopupSurveyQuestion {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Le titre de la question est requis");
  }

  if (!isOnboardingQuestionType(input.type)) {
    throw new Error("Type de question invalide");
  }

  if (!Number.isFinite(input.order) || input.order < 0) {
    throw new Error("L’ordre doit être un entier positif ou nul");
  }

  const options =
    input.type === "text" ? [] : normalizeStringArray(input.options);

  if (input.type !== "text" && options.length < 2) {
    throw new Error("Ajoutez au moins deux options distinctes");
  }

  return {
    id: input.id.trim() || fallbackId,
    title,
    type: input.type as OnboardingQuestionType,
    options,
    order: Math.trunc(input.order),
    required: Boolean(input.required),
  };
}

export function normalizeSurveyInput(input: PopupSurveyInput): PopupSurveyInput {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Le titre de l’enquête est requis");
  }

  if (title.length > 200) {
    throw new Error("Le titre ne peut pas dépasser 200 caractères");
  }

  const description = input.description.trim();
  if (description.length > 1000) {
    throw new Error("La description ne peut pas dépasser 1000 caractères");
  }

  if (!Number.isFinite(input.order) || input.order < 0) {
    throw new Error("L’ordre doit être un entier positif ou nul");
  }

  const startsAt = normalizeOptionalInstant(
    input.startsAt,
    "La date de mise en ligne est invalide",
  );
  const endsAt = normalizeOptionalInstant(
    input.endsAt,
    "La date de fin est invalide",
  );
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw new Error("La fin doit être postérieure à la mise en ligne");
  }

  if (input.questions.length > MAX_SURVEY_QUESTIONS) {
    throw new Error(
      `Une enquête peut contenir au plus ${MAX_SURVEY_QUESTIONS} questions`,
    );
  }

  const questions = sortSurveyQuestions(
    input.questions.map((question, index) =>
      normalizeQuestion(question, `${Date.now()}-${index}`),
    ),
  );

  const ids = new Set<string>();
  for (const question of questions) {
    if (ids.has(question.id)) {
      throw new Error("Chaque question doit avoir un identifiant unique");
    }
    ids.add(question.id);
  }

  return {
    title,
    description,
    active: Boolean(input.active),
    startsAt,
    endsAt,
    order: Math.trunc(input.order),
    questions,
  };
}

export function isPopupSurveyInput(value: unknown): value is PopupSurveyInput {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.title === "string" &&
    typeof record.description === "string" &&
    typeof record.active === "boolean" &&
    (record.startsAt === null || typeof record.startsAt === "string") &&
    (record.endsAt === null || typeof record.endsAt === "string") &&
    typeof record.order === "number" &&
    Array.isArray(record.questions)
  );
}
