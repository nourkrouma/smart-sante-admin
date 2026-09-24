import {
  collection,
  getDocs,
  Timestamp,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { firestoreUserMessage } from "@/lib/firestore-errors";
import {
  normalizeSurveyInput,
  sortSurveyQuestions,
  type PopupSurveyInput,
} from "@/lib/popup-survey-input";
import {
  isOnboardingQuestionType,
  type OnboardingQuestionType,
} from "@/types/onboarding";
import type { PopupSurvey, PopupSurveyQuestion } from "@/types/popup-survey";

const SURVEYS_COLLECTION = "popupSurveys";

export type { PopupSurveyInput };
export { sortSurveyQuestions, normalizeSurveyInput };

function parseString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBoolean(value: unknown): boolean {
  return value === true;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseTimestamp(value: unknown): string | null {
  if (!value) return null;

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === "object" && "seconds" in value) {
    const seconds = (value as { seconds: unknown }).seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000).toISOString();
    }
  }

  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

function parseQuestionType(value: unknown): OnboardingQuestionType {
  if (typeof value === "string" && isOnboardingQuestionType(value)) {
    return value;
  }
  return "text";
}

function mapFirestoreQuestion(value: unknown, index: number): PopupSurveyQuestion {
  const data =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    id: parseString(data.id) || `q-${index + 1}`,
    title: parseString(data.title),
    type: parseQuestionType(data.type),
    options: parseStringArray(data.options),
    order: parseNumber(data.order),
    required: parseBoolean(data.required),
  };
}

function mapFirestoreSurvey(
  id: string,
  data: Record<string, unknown>,
): PopupSurvey {
  const questions = Array.isArray(data.questions)
    ? data.questions.map((item, index) => mapFirestoreQuestion(item, index))
    : [];

  const stats =
    data.stats && typeof data.stats === "object" && !Array.isArray(data.stats)
      ? (data.stats as Record<string, unknown>)
      : null;

  return {
    id: parseString(data.id) || id,
    title: parseString(data.title),
    description: parseString(data.description),
    active: data.active !== false,
    order: parseNumber(data.order),
    questions: sortSurveyQuestions(questions),
    stats,
    statsUpdatedAt: parseTimestamp(data.statsUpdatedAt),
    createdAt: parseTimestamp(data.createdAt),
    updatedAt: parseTimestamp(data.updatedAt),
  };
}

export function nextSurveyOrder(surveys: PopupSurvey[]): number {
  if (surveys.length === 0) return 1;
  return Math.max(...surveys.map((survey) => survey.order)) + 1;
}

export async function getPopupSurveys(
  db: Firestore = getFirebaseDb(),
): Promise<PopupSurvey[]> {
  try {
    const snapshot = await getDocs(collection(db, SURVEYS_COLLECTION));

    return snapshot.docs
      .map((docSnap) =>
        mapFirestoreSurvey(docSnap.id, docSnap.data() as Record<string, unknown>),
      )
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "fr"));
  } catch (error) {
    throw new Error(
      firestoreUserMessage(error, "Impossible de charger les enquêtes"),
    );
  }
}

async function adminAuthHeaders(): Promise<HeadersInit> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Session expirée. Reconnectez-vous.");
  }
  const token = await user.getIdToken(true);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function readSurveyResponse(data: unknown): PopupSurvey {
  if (
    !data ||
    typeof data !== "object" ||
    !("survey" in data) ||
    !data.survey ||
    typeof data.survey !== "object"
  ) {
    throw new Error("Réponse serveur inattendue");
  }
  return data.survey as PopupSurvey;
}

/** Creates via Admin SDK API — bypasses shared client rules the app may overwrite. */
export async function createPopupSurvey(
  input: PopupSurveyInput,
): Promise<PopupSurvey> {
  const normalized = normalizeSurveyInput(input);
  const response = await fetch("/api/surveys", {
    method: "POST",
    headers: await adminAuthHeaders(),
    body: JSON.stringify(normalized),
  });

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Impossible de créer l’enquête";
    throw new Error(message);
  }

  return readSurveyResponse(data);
}

export async function updatePopupSurvey(
  id: string,
  input: PopupSurveyInput,
): Promise<PopupSurvey> {
  if (!id.trim()) {
    throw new Error("L’identifiant de l’enquête est requis");
  }

  const normalized = normalizeSurveyInput(input);
  const response = await fetch(`/api/surveys/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: await adminAuthHeaders(),
    body: JSON.stringify(normalized),
  });

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Impossible de modifier l’enquête";
    throw new Error(message);
  }

  return readSurveyResponse(data);
}

export async function deletePopupSurvey(id: string): Promise<void> {
  if (!id.trim()) {
    throw new Error("L’identifiant de l’enquête est requis");
  }

  const response = await fetch(`/api/surveys/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await adminAuthHeaders(),
  });

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Impossible de supprimer l’enquête";
    throw new Error(message);
  }
}
