import type {
  QuestionAnswerStats,
  QuestionStatsSource,
} from "@/types/onboarding";

function parseNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function optionCountMap(value: unknown): Map<string, number> {
  const counts = new Map<string, number>();
  const record = asRecord(value);
  if (!record) return counts;

  for (const [key, raw] of Object.entries(record)) {
    if (key.startsWith("_")) continue;
    if (
      key === "answered" ||
      key === "total" ||
      key === "skipped" ||
      key === "other" ||
      key === "otherCount" ||
      key === "text" ||
      key === "options" ||
      key === "optionCounts" ||
      key === "counts"
    ) {
      continue;
    }
    counts.set(key, parseNumber(raw));
  }

  return counts;
}

function questionAggregate(value: unknown): {
  answered: number;
  otherCount: number;
  optionCounts: Map<string, number>;
} {
  const record = asRecord(value);
  if (!record) {
    return { answered: 0, otherCount: 0, optionCounts: new Map() };
  }

  const nestedOptions =
    asRecord(record.options) ??
    asRecord(record.optionCounts) ??
    asRecord(record.counts);

  const optionCounts = nestedOptions
    ? optionCountMap(nestedOptions)
    : optionCountMap(record);

  if (optionCounts.size === 0 && nestedOptions) {
    for (const [key, raw] of Object.entries(nestedOptions)) {
      if (/^\d+$/.test(key)) optionCounts.set(key, parseNumber(raw));
    }
  }

  const answered =
    parseNumber(record.answered) ||
    parseNumber(record.total) ||
    parseNumber(record.responseCount) ||
    [...optionCounts.values()].reduce((sum, count) => sum + count, 0);

  const otherCount =
    parseNumber(record.otherCount) || parseNumber(record.other);

  return { answered, otherCount, optionCounts };
}

function totalResponses(data: Record<string, unknown>): number {
  return (
    parseNumber(data.responseCount) ||
    parseNumber(data.totalResponses) ||
    parseNumber(data.completions) ||
    parseNumber(data.completionCount) ||
    parseNumber(data.total) ||
    parseNumber(data.answered)
  );
}

function questionsBucket(data: Record<string, unknown>): Record<string, unknown> {
  return (
    asRecord(data.questions) ??
    asRecord(data.questionStats) ??
    asRecord(data.byQuestion) ??
    asRecord(data.counts) ??
    data
  );
}

/** Build UI stats from `popupSurveys/{id}.stats` (anonymous aggregates). */
export function buildStatsFromAggregate(
  questions: QuestionStatsSource[],
  stats: unknown,
): QuestionAnswerStats[] {
  const data = asRecord(stats);

  if (!data) {
    return questions.map((question) => ({
      question,
      total: 0,
      answered: 0,
      skipped: 0,
      optionCounts: question.options.map((option) => ({ option, count: 0 })),
      otherCount: 0,
    }));
  }

  const total = totalResponses(data);
  const bucket = questionsBucket(data);

  return questions.map((question) => {
    const aggregate = questionAggregate(bucket[question.id]);
    const answered = aggregate.answered;
    const effectiveTotal = Math.max(total, answered);

    const optionCounts = question.options.map((option, index) => {
      const byLabel = aggregate.optionCounts.get(option);
      const byIndex = aggregate.optionCounts.get(String(index));
      return {
        option,
        count: byLabel ?? byIndex ?? 0,
      };
    });

    let otherCount = aggregate.otherCount;
    if (otherCount === 0 && question.type !== "text") {
      const known = new Set([
        ...question.options,
        ...question.options.map((_, index) => String(index)),
      ]);
      for (const [key, count] of aggregate.optionCounts) {
        if (!known.has(key)) otherCount += count;
      }
    }

    return {
      question,
      total: effectiveTotal,
      answered,
      skipped: Math.max(0, effectiveTotal - answered),
      optionCounts,
      otherCount,
    };
  });
}

export function getPopupSurveyStats(
  questions: QuestionStatsSource[],
  stats: unknown,
): QuestionAnswerStats[] {
  return buildStatsFromAggregate(questions, stats);
}
