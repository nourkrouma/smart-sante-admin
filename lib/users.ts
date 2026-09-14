import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { firestoreUserMessage } from "@/lib/firestore-errors";
import { parseOnboardingAnswers } from "@/lib/onboarding";
import type { AppUser } from "@/types/user";

const USERS_COLLECTION = "users";
const PUBLIC_PROFILES_COLLECTION = "publicProfiles";
const MAX_POINTS = 1_000_000;

function parseString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function mapFirestoreUser(id: string, data: Record<string, unknown>): AppUser {
  return {
    id,
    fullName:
      parseString(data.fullName) ||
      parseString(data.displayName) ||
      parseString(data.name),
    email: parseString(data.email),
    phone: parseString(data.phone) || parseString(data.phoneNumber),
    points: Math.max(0, parseNumber(data.points)),
    onboardingAnswers: parseOnboardingAnswers(data.onboardingAnswers),
    createdAt: parseTimestamp(data.createdAt),
    updatedAt: parseTimestamp(data.updatedAt),
  };
}

export function normalizePoints(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Les points doivent être un entier positif ou nul");
  }

  if (value > MAX_POINTS) {
    throw new Error(`Les points ne peuvent pas dépasser ${MAX_POINTS}`);
  }

  return value;
}

export async function getUsers(
  db: Firestore = getFirebaseDb(),
): Promise<AppUser[]> {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));

  return snapshot.docs
    .map((docSnap) =>
      mapFirestoreUser(docSnap.id, docSnap.data() as Record<string, unknown>),
    )
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"));
}

export async function updateUserPoints(
  userId: string,
  points: number,
  db: Firestore = getFirebaseDb(),
): Promise<number> {
  if (!userId.trim()) {
    throw new Error("L’identifiant de l’utilisateur est requis");
  }

  const normalized = normalizePoints(points);

  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      points: normalized,
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, PUBLIC_PROFILES_COLLECTION, userId),
      {
        points: normalized,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    throw new Error(
      firestoreUserMessage(error, "Impossible de modifier les points"),
    );
  }

  return normalized;
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat("fr-DZ").format(points);
}

export function userDisplayName(user: AppUser): string {
  const name = user.fullName.trim();
  if (name) return name;
  const email = user.email.trim();
  if (email) return email;
  return user.id;
}
