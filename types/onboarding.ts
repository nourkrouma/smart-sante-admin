export const ONBOARDING_QUESTION_TYPES = ["single", "multiple", "text"] as const;

export type OnboardingQuestionType = (typeof ONBOARDING_QUESTION_TYPES)[number];

export const ONBOARDING_QUESTION_TYPE_LABELS: Record<
  OnboardingQuestionType,
  string
> = {
  single: "Choix unique",
  multiple: "Choix multiple",
  text: "Texte libre",
};

export function isOnboardingQuestionType(
  value: string,
): value is OnboardingQuestionType {
  return (ONBOARDING_QUESTION_TYPES as readonly string[]).includes(value);
}

export function onboardingQuestionTypeLabel(type: string): string {
  return isOnboardingQuestionType(type)
    ? ONBOARDING_QUESTION_TYPE_LABELS[type]
    : type.trim() || "—";
}

export type OnboardingAnswerValue = string | string[];

export type OnboardingAnswers = Record<string, OnboardingAnswerValue>;

export type OnboardingQuestion = {
  id: string;
  title: string;
  type: OnboardingQuestionType;
  options: string[];
  order: number;
  required: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type OptionAnswerStat = {
  option: string;
  count: number;
};

export type QuestionStatsSource = {
  id: string;
  title: string;
  type: OnboardingQuestionType;
  options: string[];
  order: number;
  required: boolean;
};

export type QuestionAnswerStats = {
  question: QuestionStatsSource;
  total: number;
  answered: number;
  skipped: number;
  optionCounts: OptionAnswerStat[];
  otherCount: number;
};
