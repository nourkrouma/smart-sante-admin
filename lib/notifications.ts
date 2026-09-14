export type NotificationAudience = "all" | "user";

export type PushNotificationInput = {
  title: string;
  body: string;
  imageUrl?: string;
  audience: NotificationAudience;
  userId?: string;
};

export type PushNotificationResult = {
  sent: false;
  message: string;
};

const MAX_TITLE_LENGTH = 80;
const MAX_BODY_LENGTH = 500;

export function normalizePushNotification(
  input: PushNotificationInput,
): PushNotificationInput {
  const title = input.title.trim();
  const body = input.body.trim();
  const imageUrl = input.imageUrl?.trim() ?? "";

  if (!title) {
    throw new Error("Le titre est requis");
  }

  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Le titre ne peut pas dépasser ${MAX_TITLE_LENGTH} caractères`);
  }

  if (!body) {
    throw new Error("Le message est requis");
  }

  if (body.length > MAX_BODY_LENGTH) {
    throw new Error(`Le message ne peut pas dépasser ${MAX_BODY_LENGTH} caractères`);
  }

  if (imageUrl && !isHttpUrl(imageUrl)) {
    throw new Error("L’URL de l’image est invalide");
  }

  if (input.audience !== "all" && input.audience !== "user") {
    throw new Error("Audience invalide");
  }

  if (input.audience === "user" && !input.userId?.trim()) {
    throw new Error("Sélectionnez un utilisateur");
  }

  return {
    title,
    body,
    imageUrl: imageUrl || undefined,
    audience: input.audience,
    userId: input.audience === "user" ? input.userId?.trim() : undefined,
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function sendPushNotification(
  input: PushNotificationInput,
): Promise<PushNotificationResult> {
  normalizePushNotification(input);

  return {
    sent: false,
    message:
      "L’envoi n’est pas encore connecté. Aucune notification n’a été envoyée.",
  };
}
