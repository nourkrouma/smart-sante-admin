import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import type { PopupSurveyInput } from "@/lib/popup-survey-input";

function instantOrNull(value: string | null): Timestamp | null {
  if (!value) return null;
  return Timestamp.fromDate(new Date(value));
}

/** Schedule instants are Firestore timestamps so the app can compare them. */
export function surveyDocumentFields(input: PopupSurveyInput) {
  const { startsAt, endsAt, ...rest } = input;
  return {
    ...rest,
    startsAt: instantOrNull(startsAt),
    endsAt: instantOrNull(endsAt),
  };
}
