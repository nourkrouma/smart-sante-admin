import { getFirebaseAuth } from "@/lib/firebase";
import {
  normalizePushNotification,
  type PushNotificationInput,
  type PushNotificationResult,
} from "@/lib/notifications";

function isPushNotificationResult(
  value: unknown,
): value is PushNotificationResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.sent === "boolean" && typeof record.message === "string";
}

export async function sendPushNotification(
  input: PushNotificationInput,
): Promise<PushNotificationResult> {
  const normalized = normalizePushNotification(input);
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Session expirée. Reconnectez-vous.");
  }

  const token = await user.getIdToken(true);
  const response = await fetch("/api/notifications/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
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
        : "Impossible d’envoyer la notification";
    throw new Error(message);
  }

  if (!isPushNotificationResult(data)) {
    throw new Error("Réponse serveur inattendue");
  }

  return data;
}
