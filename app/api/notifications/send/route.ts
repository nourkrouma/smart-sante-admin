import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, getAdminMessaging } from "@/lib/firebase-admin";
import {
  ALL_USERS_TOPIC,
  normalizePushNotification,
  type PushNotificationInput,
} from "@/lib/notifications";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ sent: false, message }, { status });
}

function isPushNotificationInput(value: unknown): value is PushNotificationInput {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.title === "string" && typeof record.body === "string";
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    return jsonError("Non authentifié", 401);
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (decoded.admin !== true) {
      return jsonError("Accès refusé", 403);
    }
    uid = decoded.uid;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Configuration serveur")
    ) {
      return jsonError(error.message, 500);
    }
    if (
      error instanceof Error &&
      error.message.startsWith("FIREBASE_SERVICE_ACCOUNT_JSON")
    ) {
      return jsonError(error.message, 500);
    }
    return jsonError("Session invalide", 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Requête invalide", 400);
  }

  if (!isPushNotificationInput(payload)) {
    return jsonError("Données invalides", 400);
  }

  let input: PushNotificationInput;
  try {
    input = normalizePushNotification(payload);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Données invalides",
      400,
    );
  }

  const topic = ALL_USERS_TOPIC;
  const imageUrl = input.imageUrl;

  try {
    const messageId = await getAdminMessaging().send({
      topic,
      notification: {
        title: input.title,
        body: input.body,
        ...(imageUrl ? { imageUrl } : {}),
      },
      data: {
        title: input.title,
        body: input.body,
        ...(imageUrl ? { imageUrl } : {}),
        audience: "all",
      },
      android: {
        priority: "high",
        ...(imageUrl ? { notification: { imageUrl } } : {}),
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            sound: "default",
          },
        },
        ...(imageUrl ? { fcmOptions: { imageUrl } } : {}),
      },
    });

    try {
      await getAdminDb().collection("notificationLogs").add({
        title: input.title,
        body: input.body,
        imageUrl: imageUrl ?? null,
        audience: "all",
        userId: null,
        topic,
        messageId,
        sentBy: uid,
        sentAt: FieldValue.serverTimestamp(),
      });
    } catch {
      // The push already went out; do not fail the request on audit logging.
    }

    return NextResponse.json({
      sent: true,
      messageId,
      topic,
      message: "Notification envoyée au sujet all_users.",
    });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";

    if (code === "messaging/invalid-argument") {
      return jsonError("Sujet FCM invalide ou message mal formé", 400);
    }

    return jsonError(
      error instanceof Error
        ? error.message
        : "Impossible d’envoyer la notification",
      500,
    );
  }
}
