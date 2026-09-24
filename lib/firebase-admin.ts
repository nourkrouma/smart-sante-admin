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

function isConfigError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message;
  return (
    message.startsWith("Configuration serveur") ||
    message.startsWith("FIREBASE_SERVICE_ACCOUNT") ||
    message.includes("Failed to parse private key") ||
    message.includes("error:1E08010C") || // OpenSSL PEM parse
    message.includes("Invalid PEM") ||
    /credential|private[_ ]key|service account/i.test(message)
  );
}

export function adminConfigErrorMessage(error: unknown): string | null {
  if (!isConfigError(error)) return null;
  if (error instanceof Error && error.message.startsWith("Configuration serveur")) {
    return error.message;
  }
  if (
    error instanceof Error &&
    error.message.startsWith("FIREBASE_SERVICE_ACCOUNT")
  ) {
    return error.message;
  }
  return "Configuration Firebase Admin invalide (compte de service / clé privée). Vérifiez FIREBASE_SERVICE_ACCOUNT_JSON sur Vercel.";
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizePrivateKey(key: string): string {
  let normalized = key.trim();
  // Vercel / .env often store literal \n sequences
  if (normalized.includes("\\n") && !normalized.includes("\n")) {
    normalized = normalized.replace(/\\n/g, "\n");
  }
  // Sometimes double-escaped
  if (normalized.includes("\\n")) {
    normalized = normalized.replace(/\\n/g, "\n");
  }
  return normalized;
}

function parseJsonLenient(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    // Common Vercel / .env artifact: extra quotes before the closing brace
    const repaired = raw
      .replace(/^\uFEFF/, "")
      .replace(/"+(\s*})\s*$/, '"$1')
      .replace(/"""+/g, '"');
    return JSON.parse(repaired);
  }
}

function parseServiceAccountJson(rawInput: string): ServiceAccount {
  let raw = stripWrappingQuotes(rawInput.trim());

  // Optional base64 form (more reliable on Vercel than giant JSON strings)
  if (!raw.startsWith("{")) {
    try {
      const decoded = Buffer.from(raw, "base64").toString("utf8").trim();
      if (decoded.startsWith("{")) {
        raw = decoded;
      }
    } catch {
      // keep raw for JSON.parse error below
    }
  }

  let parsed: unknown;
  try {
    parsed = parseJsonLenient(raw);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON est invalide. Collez le JSON sur une seule ligne (ou une valeur base64 du JSON).",
    );
  }

  // Double-encoded: env value is a JSON string of the JSON object
  if (typeof parsed === "string") {
    try {
      parsed = parseJsonLenient(parsed);
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON est invalide (chaîne JSON doublement encodée).",
      );
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON est invalide.");
  }

  const account = parsed as ServiceAccount & { private_key?: string };
  if (typeof account.private_key === "string") {
    account.private_key = normalizePrivateKey(account.private_key);
  }

  if (!account.private_key?.includes("BEGIN")) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON : private_key manquante ou mal formée (newlines).",
    );
  }

  return account;
}

function parseServiceAccount(): ServiceAccount {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  // Vercel sometimes wraps or adds whitespace/newlines in env values
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim().replace(
    /\s+/g,
    "",
  );

  const errors: string[] = [];

  // Prefer BASE64 — JSON values are often mangled in the Vercel UI.
  if (b64) {
    try {
      return parseServiceAccountJson(b64);
    } catch (error) {
      errors.push(
        `BASE64: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (json) {
    try {
      return parseServiceAccountJson(json);
    } catch (error) {
      errors.push(
        `JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (!b64 && !json) {
    throw new Error(
      "Configuration serveur incomplète : définissez FIREBASE_SERVICE_ACCOUNT_BASE64 (recommandé) ou FIREBASE_SERVICE_ACCOUNT_JSON sur Vercel, puis redéployez.",
    );
  }

  throw new Error(
    `Compte de service invalide (${b64 ? "BASE64 défini" : "BASE64 absent"}, ${json ? "JSON défini" : "JSON absent"}). ${errors.join(" | ")}`,
  );
}

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const serviceAccount = parseServiceAccount();
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    (typeof (serviceAccount as { project_id?: string }).project_id === "string"
      ? (serviceAccount as { project_id?: string }).project_id
      : undefined);

  return initializeApp({
    credential: cert(serviceAccount),
    projectId,
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
