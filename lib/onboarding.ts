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
  type OnboardingAnswerValue,
  type OnboardingAnswers,
  type OnboardingQuestion,
  type OnboardingQuestionType,
  type QuestionAnswerStats,
  type QuestionStatsSource,
} from "@/types/onboarding";

const QUESTIONS_COLLECTION = "onboardingQuestions";

export type OnboardingQuestionInput = {
  title: string;
  type: OnboardingQuestionType;
  options: string[];
  order: number;
  required: boolean;
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

function mapFirestoreQuestion(
  id: string,
  data: Record<string, unknown>,
): OnboardingQuestion {
  return {
    id: parseString(data.id) || id,
    title: parseString(data.title),
    type: parseQuestionType(data.type),
    options: parseStringArray(data.options),
    order: parseNumber(data.order),
    required: parseBoolean(data.required),
    createdAt: parseTimestamp(data.createdAt),
    updatedAt: parseTimestamp(data.updatedAt),
  };
}

function normalizeQuestionInput(
  input: OnboardingQuestionInput,
): OnboardingQuestionInput {
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
    title,
    type: input.type,
    options,
    order: Math.trunc(input.order),
    required: Boolean(input.required),
  };
}

export async function getOnboardingQuestions(
  db: Firestore = getFirebaseDb(),
): Promise<OnboardingQuestion[]> {
  const snapshot = await getDocs(collection(db, QUESTIONS_COLLECTION));

  return snapshot.docs
    .map((docSnap) =>
      mapFirestoreQuestion(
        docSnap.id,
        docSnap.data() as Record<string, unknown>,
      ),
    )
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "fr"));
}

export async function createOnboardingQuestion(
  input: OnboardingQuestionInput,
  db: Firestore = getFirebaseDb(),
): Promise<OnboardingQuestion> {
  const normalized = normalizeQuestionInput(input);
  const id = `${Date.now()}`;
  const now = new Date().toISOString();

  try {
    await setDoc(doc(db, QUESTIONS_COLLECTION, id), {
      id,
      ...normalized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(
      firestoreUserMessage(error, "Impossible de créer la question"),
    );
  }

  return { id, ...normalized, createdAt: now, updatedAt: now };
}

export async function updateOnboardingQuestion(
  id: string,
  input: OnboardingQuestionInput,
  db: Firestore = getFirebaseDb(),
): Promise<OnboardingQuestion> {
  if (!id.trim()) {
    throw new Error("L’identifiant de la question est requis");
  }

  const normalized = normalizeQuestionInput(input);
  const now = new Date().toISOString();

  try {
    await setDoc(
      doc(db, QUESTIONS_COLLECTION, id),
      {
        id,
        ...normalized,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw new Error(
      firestoreUserMessage(error, "Impossible de modifier la question"),
    );
  }

  return { id, ...normalized, createdAt: null, updatedAt: now };
}

export async function deleteOnboardingQuestion(
  id: string,
  db: Firestore = getFirebaseDb(),
): Promise<void> {
  if (!id.trim()) {
    throw new Error("L’identifiant de la question est requis");
  }

  try {
    await deleteDoc(doc(db, QUESTIONS_COLLECTION, id));
  } catch (error) {
    throw new Error(
      firestoreUserMessage(error, "Impossible de supprimer la question"),
    );
  }
}

export function parseOnboardingAnswers(value: unknown): OnboardingAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const answers: OnboardingAnswers = {};

  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string") {
      answers[key] = raw;
      continue;
    }

    if (Array.isArray(raw)) {
      answers[key] = raw.filter((item): item is string => typeof item === "string");
    }
  }

  return answers;
}

function selectedChoices(value: OnboardingAnswerValue | undefined): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  const trimmed = value.trim();
  return trimmed ? [trimmed] : [];
}

export function getQuestionAnswerStats(
  questions: QuestionStatsSource[],
  answerSets: OnboardingAnswers[],
): QuestionAnswerStats[] {
  const total = answerSets.length;

  return questions.map((question) => {
    const counts = new Map<string, number>();
    for (const option of question.options) {
      counts.set(option, 0);
    }

    let answered = 0;
    let otherCount = 0;

    for (const answers of answerSets) {
      const choices = selectedChoices(answers[question.id]);
      if (choices.length === 0) continue;
      answered += 1;

      if (question.type === "text") continue;

      for (const choice of choices) {
        if (counts.has(choice)) {
          counts.set(choice, (counts.get(choice) ?? 0) + 1);
        } else {
          otherCount += 1;
        }
      }
    }

    return {
      question,
      total,
      answered,
      skipped: total - answered,
      optionCounts: question.options.map((option) => ({
        option,
        count: counts.get(option) ?? 0,
      })),
      otherCount,
    };
  });
}

export function formatAnswerPercent(count: number, total: number): string {
  if (total <= 0) return "0 %";
  return `${Math.round((count / total) * 100)} %`;
}

export function nextQuestionOrder(questions: { order: number }[]): number {
  if (questions.length === 0) return 1;
  return Math.max(...questions.map((question) => question.order)) + 1;
}
