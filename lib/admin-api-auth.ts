import {
  adminConfigErrorMessage,
  getAdminAuth,
} from "@/lib/firebase-admin";

export async function requireAdminUid(request: Request): Promise<string> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    throw new AdminApiAuthError("Non authentifié", 401);
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (decoded.admin !== true) {
      throw new AdminApiAuthError("Accès refusé", 403);
    }
    return decoded.uid;
  } catch (error) {
    if (error instanceof AdminApiAuthError) throw error;
    const configMessage = adminConfigErrorMessage(error);
    if (configMessage) {
      throw new AdminApiAuthError(configMessage, 500);
    }
    throw new AdminApiAuthError("Session invalide", 401);
  }
}

export class AdminApiAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiAuthError";
    this.status = status;
  }
}
