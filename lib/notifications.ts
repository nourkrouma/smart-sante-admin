export type NotificationAudience = "all" | "user";

export type PushNotificationInput = {
  title: string;
  body: string;
  imageUrl?: string;
  audience: NotificationAudience;
  userId?: string;
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

export function pushNotificationTopic(
  audience: NotificationAudience,
  userId?: string,
): string {
  if (audience === "all") return ALL_USERS_TOPIC;
  const id = userId?.trim();
  if (!id) {
    throw new Error("Sélectionnez un utilisateur");
  }
  return `user_${id}`;
}

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
