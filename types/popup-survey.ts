import type { OnboardingQuestionType } from "@/types/onboarding";

export type PopupSurveyQuestion = {
  id: string;
  title: string;
  type: OnboardingQuestionType;
  options: string[];
  order: number;
  required: boolean;
};

export type PopupSurvey = {
  id: string;
  title: string;
  description: string;
  active: boolean;
  order: number;
  questions: PopupSurveyQuestion[];
  createdAt: string | null;
  updatedAt: string | null;
};
