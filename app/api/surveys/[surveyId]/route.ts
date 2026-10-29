import { NextResponse } from "next/server";
import {
  isPopupSurveyInput,
  normalizeSurveyInput,
  POPUP_SURVEYS_COLLECTION,
} from "@/lib/popup-survey-input";
import { surveyDocumentFields } from "@/lib/popup-survey-write";
import type { PopupSurveyStats } from "@/types/popup-survey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ surveyId: string }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function readPreservedMeta(data: Record<string, unknown> | undefined) {
  const stats =
    data?.stats &&
    typeof data.stats === "object" &&
    !Array.isArray(data.stats)
      ? (data.stats as PopupSurveyStats)
      : null;

  return {
    stats,
    statsUpdatedAt: timestampToIso(data?.statsUpdatedAt),
    createdAt: timestampToIso(data?.createdAt),
  };
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { AdminApiAuthError, requireAdminUid } = await import(
      "@/lib/admin-api-auth"
    );
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const { FieldValue } = await import("firebase-admin/firestore");

    try {
      await requireAdminUid(request);
    } catch (error) {
      if (error instanceof AdminApiAuthError) {
        return jsonError(error.message, error.status);
      }
      return jsonError("Session invalide", 401);
    }

    const { surveyId: rawId } = await context.params;
    const surveyId = rawId?.trim() ?? "";
    if (!surveyId) {
      return jsonError("L’identifiant de l’enquête est requis", 400);
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return jsonError("Requête invalide", 400);
    }

    if (!isPopupSurveyInput(payload)) {
      return jsonError("Données invalides", 400);
    }

    let normalized;
    try {
      normalized = normalizeSurveyInput(payload);
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Données invalides",
        400,
      );
    }

    const now = new Date().toISOString();
    const ref = getAdminDb().collection(POPUP_SURVEYS_COLLECTION).doc(surveyId);

    try {
      const existing = await ref.get();
      if (!existing.exists) {
        return jsonError("Enquête introuvable", 404);
      }

      const preserved = readPreservedMeta(
        existing.data() as Record<string, unknown> | undefined,
      );

      await ref.set(
        {
          id: surveyId,
          ...surveyDocumentFields(normalized),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return NextResponse.json({
        survey: {
          id: surveyId,
          ...normalized,
          stats: preserved.stats,
          statsUpdatedAt: preserved.statsUpdatedAt,
          createdAt: preserved.createdAt,
          updatedAt: now,
        },
      });
    } catch (error) {
      return jsonError(
        error instanceof Error
          ? error.message
          : "Impossible de modifier l’enquête",
        500,
      );
    }
  } catch (error) {
    console.error("[surveys/PUT]", error);
    return jsonError(
      error instanceof Error
        ? `Échec Admin SDK : ${error.message}`
        : "Erreur serveur inattendue",
      500,
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { AdminApiAuthError, requireAdminUid } = await import(
      "@/lib/admin-api-auth"
    );
    const { getAdminDb } = await import("@/lib/firebase-admin");

    try {
      await requireAdminUid(_request);
    } catch (error) {
      if (error instanceof AdminApiAuthError) {
        return jsonError(error.message, error.status);
      }
      return jsonError("Session invalide", 401);
    }

    const { surveyId: rawId } = await context.params;
    const surveyId = rawId?.trim() ?? "";
    if (!surveyId) {
      return jsonError("L’identifiant de l’enquête est requis", 400);
    }

    try {
      await getAdminDb()
        .collection(POPUP_SURVEYS_COLLECTION)
        .doc(surveyId)
        .delete();
    } catch (error) {
      return jsonError(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer l’enquête",
        500,
      );
    }

    return NextResponse.json({ deleted: true, id: surveyId });
  } catch (error) {
    console.error("[surveys/DELETE]", error);
    return jsonError(
      error instanceof Error
        ? `Échec Admin SDK : ${error.message}`
        : "Erreur serveur inattendue",
      500,
    );
  }
}
