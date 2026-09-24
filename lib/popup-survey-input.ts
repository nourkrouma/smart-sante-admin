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
  order: number;
  questions: PopupSurveyQuestion[];
};

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
    typeof record.order === "number" &&
    Array.isArray(record.questions)
  );
}
