import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { AdminApiAuthError, requireAdminUid } from "@/lib/admin-api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  isPopupSurveyInput,
  normalizeSurveyInput,
  POPUP_SURVEYS_COLLECTION,
} from "@/lib/popup-survey-input";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ surveyId: string }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function PUT(request: Request, context: RouteContext) {
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

  try {
    // merge keeps client-written stats / statsUpdatedAt
    await getAdminDb()
      .collection(POPUP_SURVEYS_COLLECTION)
      .doc(surveyId)
      .set(
        {
          id: surveyId,
          ...normalized,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Impossible de modifier l’enquête",
      500,
    );
  }

  return NextResponse.json({
    survey: {
      id: surveyId,
      ...normalized,
      stats: null,
      statsUpdatedAt: null,
      createdAt: null,
      updatedAt: now,
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
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
}
