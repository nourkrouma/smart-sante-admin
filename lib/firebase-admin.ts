import "server-only";

import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function parseServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error(
      "Configuration serveur incomplète : ajoutez FIREBASE_SERVICE_ACCOUNT_JSON dans .env.local",
    );
  }

  try {
    const parsed = JSON.parse(raw) as ServiceAccount & { private_key?: string };
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON est invalide. Collez le JSON du compte de service sur une seule ligne.",
    );
  }
}

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  return initializeApp({
    credential: cert(parseServiceAccount()),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminMessaging() {
  return getMessaging(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
