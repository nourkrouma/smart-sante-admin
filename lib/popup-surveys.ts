import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { firestoreUserMessage } from "@/lib/firestore-errors";
import {
  isOnboardingQuestionType,
  type OnboardingQuestionType,
} from "@/types/onboarding";
import type { PopupSurvey, PopupSurveyQuestion } from "@/types/popup-survey";

const SURVEYS_COLLECTION = "popupSurveys";
const MAX_QUESTIONS = 40;

export type PopupSurveyInput = {
  title: string;
  description: string;
  active: boolean;
  order: number;
  questions: PopupSurveyQuestion[];
};

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

export function sortSurveyQuestions(
  questions: PopupSurveyQuestion[],
): PopupSurveyQuestion[] {
  return [...questions].sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title, "fr"),
  );
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
    type: input.type,
    options,
    order: Math.trunc(input.order),
    required: Boolean(input.required),
  };
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

  return {
    id: parseString(data.id) || id,
    title: parseString(data.title),
    description: parseString(data.description),
    active: data.active !== false,
    order: parseNumber(data.order),
    questions: sortSurveyQuestions(questions),
    createdAt: parseTimestamp(data.createdAt),
    updatedAt: parseTimestamp(data.updatedAt),
  };
}

function normalizeSurveyInput(input: PopupSurveyInput): PopupSurveyInput {
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

  if (input.questions.length > MAX_QUESTIONS) {
    throw new Error(`Une enquête peut contenir au plus ${MAX_QUESTIONS} questions`);
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

export function nextSurveyOrder(surveys: PopupSurvey[]): number {
  if (surveys.length === 0) return 1;
  return Math.max(...surveys.map((survey) => survey.order)) + 1;
}

export async function getPopupSurveys(
  db: Firestore = getFirebaseDb(),
): Promise<PopupSurvey[]> {
  const snapshot = await getDocs(collection(db, SURVEYS_COLLECTION));

  return snapshot.docs
    .map((docSnap) =>
      mapFirestoreSurvey(docSnap.id, docSnap.data() as Record<string, unknown>),
    )
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "fr"));
}

export async function createPopupSurvey(
  input: PopupSurveyInput,
  db: Firestore = getFirebaseDb(),
): Promise<PopupSurvey> {
  const normalized = normalizeSurveyInput(input);
  const id = `${Date.now()}`;
  const now = new Date().toISOString();

  try {
    await setDoc(doc(db, SURVEYS_COLLECTION, id), {
      id,
      ...normalized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(
      firestoreUserMessage(error, "Impossible de créer l’enquête"),
    );
  }

  return { id, ...normalized, createdAt: now, updatedAt: now };
}

export async function updatePopupSurvey(
  id: string,
  input: PopupSurveyInput,
  db: Firestore = getFirebaseDb(),
): Promise<PopupSurvey> {
  if (!id.trim()) {
    throw new Error("L’identifiant de l’enquête est requis");
  }

  const normalized = normalizeSurveyInput(input);
  const now = new Date().toISOString();

  try {
    await setDoc(
      doc(db, SURVEYS_COLLECTION, id),
      {
        id,
        ...normalized,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw new Error(
      firestoreUserMessage(error, "Impossible de modifier l’enquête"),
    );
  }

  return { id, ...normalized, createdAt: null, updatedAt: now };
}

export async function deletePopupSurvey(
  id: string,
  db: Firestore = getFirebaseDb(),
): Promise<void> {
  if (!id.trim()) {
    throw new Error("L’identifiant de l’enquête est requis");
  }

  try {
    await deleteDoc(doc(db, SURVEYS_COLLECTION, id));
  } catch (error) {
    throw new Error(
      firestoreUserMessage(error, "Impossible de supprimer l’enquête"),
    );
  }
}
