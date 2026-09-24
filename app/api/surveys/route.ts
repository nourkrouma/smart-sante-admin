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

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request) {
  try {
    await requireAdminUid(request);
  } catch (error) {
    if (error instanceof AdminApiAuthError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("Session invalide", 401);
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

  const id = `${Date.now()}`;
  const now = new Date().toISOString();

  try {
    await getAdminDb()
      .collection(POPUP_SURVEYS_COLLECTION)
      .doc(id)
      .set({
        id,
        ...normalized,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Impossible de créer l’enquête",
      500,
    );
  }

  return NextResponse.json({
    survey: {
      id,
      ...normalized,
      stats: null,
      statsUpdatedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  });
}
