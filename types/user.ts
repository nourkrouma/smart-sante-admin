import type { OnboardingAnswers } from "@/types/onboarding";

export type AppUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  points: number;
  onboardingAnswers: OnboardingAnswers;
  createdAt: string | null;
  updatedAt: string | null;
};
