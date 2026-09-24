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
    message.startsWith("Compte de service") ||
    message.includes("Failed to parse private key") ||
    message.includes("error:1E08010C") ||
    message.includes("Invalid PEM") ||
    /credential|private[_ ]key|service account/i.test(message)
  );
}

export function adminConfigErrorMessage(error: unknown): string | null {
  if (!isConfigError(error)) return null;
  if (error instanceof Error) {
    if (
      error.message.startsWith("Configuration serveur") ||
      error.message.startsWith("FIREBASE_SERVICE_ACCOUNT") ||
      error.message.startsWith("Compte de service")
    ) {
      return error.message;
    }
  }
  return "Configuration Firebase Admin invalide (compte de service / clé privée). Vérifiez FIREBASE_SERVICE_ACCOUNT_BASE64 sur Vercel.";
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
  if (normalized.includes("\\n") && !normalized.includes("\n")) {
    normalized = normalized.replace(/\\n/g, "\n");
  }
  if (normalized.includes("\\n")) {
    normalized = normalized.replace(/\\n/g, "\n");
  }
  return normalized;
}

function parseJsonLenient(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const repaired = raw
      .replace(/^\uFEFF/, "")
      .replace(/"+(\s*})\s*$/, '"$1')
      .replace(/"""+/g, '"');
    return JSON.parse(repaired);
  }
}

function envDiagnostics(): string {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ?? "";
  const b64 = (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ?? "")
    .trim()
    .replace(/\s+/g, "");
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? "";
  return `diag: base64=${b64 ? `yes(${b64.length})` : "no"} json=${json ? `yes(${json.length})` : "no"} projectId=${projectId ? "yes" : "no"}`;
}

function accountFromObject(parsed: unknown, source: string): ServiceAccount {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Compte de service invalide (${source}): objet JSON attendu.`);
  }

  const account = parsed as ServiceAccount & {
    private_key?: string;
    project_id?: string;
  };

  if (typeof account.private_key === "string") {
    account.private_key = normalizePrivateKey(account.private_key);
  }

  if (!account.private_key?.includes("BEGIN")) {
    throw new Error(
      `Compte de service invalide (${source}): private_key manquante ou mal formée.`,
    );
  }

  return account;
}

function parseFromBase64(rawInput: string): ServiceAccount {
  const raw = stripWrappingQuotes(rawInput).replace(/\s+/g, "");
  let decoded: string;
  try {
    decoded = Buffer.from(raw, "base64").toString("utf8").trim();
  } catch {
    throw new Error("Compte de service invalide (BASE64): décodage impossible.");
  }

  if (!decoded.startsWith("{")) {
    throw new Error(
      `Compte de service invalide (BASE64): le décodage ne donne pas du JSON (starts=${decoded.slice(0, 8) || "empty"}).`,
    );
  }

  let parsed: unknown;
  try {
    parsed = parseJsonLenient(decoded);
  } catch (error) {
    throw new Error(
      `Compte de service invalide (BASE64): JSON après décodage illisible (${error instanceof Error ? error.message : "parse"}).`,
    );
  }

  if (typeof parsed === "string") {
    parsed = parseJsonLenient(parsed);
  }

  return accountFromObject(parsed, "BASE64");
}

function parseFromJsonEnv(rawInput: string): ServiceAccount {
  let raw = stripWrappingQuotes(rawInput.trim());

  if (!raw.startsWith("{")) {
    // Accidentally pasted base64 into the JSON variable
    if (/^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s+/g, ""))) {
      return parseFromBase64(raw);
    }
    throw new Error(
      "Compte de service invalide (JSON): doit commencer par { ou être du base64.",
    );
  }

  let parsed: unknown;
  try {
    parsed = parseJsonLenient(raw);
  } catch (error) {
    throw new Error(
      `Compte de service invalide (JSON): ${error instanceof Error ? error.message : "parse"}. Prefer FIREBASE_SERVICE_ACCOUNT_BASE64.`,
    );
  }

  if (typeof parsed === "string") {
    try {
      parsed = parseJsonLenient(parsed);
    } catch {
      throw new Error(
        "Compte de service invalide (JSON): chaîne JSON doublement encodée.",
      );
    }
  }

  return accountFromObject(parsed, "JSON");
}

function parseServiceAccount(): ServiceAccount {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const b64 = (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ?? "")
    .trim()
    .replace(/\s+/g, "");

  const errors: string[] = [];

  if (b64) {
    try {
      return parseFromBase64(b64);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (json) {
    try {
      return parseFromJsonEnv(json);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const diag = envDiagnostics();

  if (!b64 && !json) {
    throw new Error(
      `Configuration serveur incomplète: définissez FIREBASE_SERVICE_ACCOUNT_BASE64 pour Production ET Preview, puis redéployez. ${diag}`,
    );
  }

  throw new Error(
    `Compte de service invalide. ${errors.join(" | ")} — ${diag}`,
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
