import { NextResponse } from "next/server";
import { ALL_USERS_TOPIC } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only health check for push / Firebase Admin on Vercel.
 * Does not return secrets — only whether config works.
 */
export async function GET(request: Request) {
  const hasJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
  const hasBase64 = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim());
  const hasProjectId = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  );

  try {
    const { adminConfigErrorMessage, getAdminAuth, getAdminMessaging } =
      await import("@/lib/firebase-admin");

    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";

    if (!token) {
      return NextResponse.json(
        { ok: false, step: "auth", message: "Non authentifié", hasJson, hasBase64, hasProjectId },
        { status: 401 },
      );
    }

    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      if (decoded.admin !== true) {
        return NextResponse.json(
          {
            ok: false,
            step: "auth",
            message: "Accès refusé",
            hasJson,
            hasBase64,
            hasProjectId,
          },
          { status: 403 },
        );
      }
    } catch (error) {
      const configMessage = adminConfigErrorMessage(error);
      return NextResponse.json(
        {
          ok: false,
          step: configMessage ? "admin_init" : "auth",
          message: configMessage ?? "Session invalide",
          hasJson,
          hasBase64,
          hasProjectId,
        },
        { status: configMessage ? 500 : 401 },
      );
    }

    try {
      await getAdminMessaging().send(
        {
          topic: ALL_USERS_TOPIC,
          notification: { title: "health", body: "health" },
        },
        true,
      );

      return NextResponse.json({
        ok: true,
        step: "fcm",
        message: "Firebase Admin + FCM OK (dry-run).",
        topic: ALL_USERS_TOPIC,
        hasJson,
        hasBase64,
        hasProjectId,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
        prefers: "FIREBASE_SERVICE_ACCOUNT_BASE64 when set",
      });
    } catch (error) {
      const configMessage = adminConfigErrorMessage(error);
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : null;

      return NextResponse.json(
        {
          ok: false,
          step: "fcm",
          message:
            configMessage ??
            (error instanceof Error ? error.message : "Échec FCM"),
          code,
          hasJson,
          hasBase64,
          hasProjectId,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[notifications/health]", error);
    return NextResponse.json(
      {
        ok: false,
        step: "import",
        message:
          error instanceof Error
            ? error.message
            : "Impossible de charger firebase-admin",
        hasJson,
        hasBase64,
        hasProjectId,
      },
      { status: 500 },
    );
  }
}
