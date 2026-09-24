export type PushNotificationInput = {
  title: string;
  body: string;
  imageUrl?: string;
};

export type PushNotificationResult = {
  sent: boolean;
  message: string;
  messageId?: string;
  topic?: string;
};

export const ALL_USERS_TOPIC = "all_users";

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

  return {
    title,
    body,
    imageUrl: imageUrl || undefined,
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
