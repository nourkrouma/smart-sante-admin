import type { OnboardingQuestionType } from "@/types/onboarding";

export type PopupSurveyQuestion = {
  id: string;
  title: string;
  type: OnboardingQuestionType;
  options: string[];
  order: number;
  required: boolean;
};

/** Anonymous aggregates written by the mobile app on the survey doc. */
export type PopupSurveyStats = Record<string, unknown>;

export type PopupSurvey = {
  id: string;
  title: string;
  description: string;
  active: boolean;
  order: number;
  questions: PopupSurveyQuestion[];
  stats: PopupSurveyStats | null;
  statsUpdatedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
