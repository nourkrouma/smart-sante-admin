"use client";

import { useMemo } from "react";
import {
  formatAnswerPercent,
  getQuestionAnswerStats,
} from "@/lib/onboarding";
import {
  onboardingQuestionTypeLabel,
  type OnboardingQuestion,
} from "@/types/onboarding";
import type { AppUser } from "@/types/user";

type ResponseStatsProps = {
  questions: OnboardingQuestion[];
  users: AppUser[];
};

export function ResponseStats({ questions, users }: ResponseStatsProps) {
  const stats = useMemo(
    () => getQuestionAnswerStats(questions, users),
    [questions, users],
  );

  if (questions.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted">
        Aucune question pour le moment.
      </p>
    );
  }

  if (users.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted">
        Aucun utilisateur pour calculer des statistiques.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {stats.map(
        ({ question, total, answered, skipped, optionCounts, otherCount }) => {
          const denominator = answered;
          const rows =
            question.type === "text"
              ? []
              : [
                  ...optionCounts,
                  ...(otherCount > 0
                    ? [{ option: "Autre", count: otherCount }]
                    : []),
                ];

          return (
            <article
              key={question.id}
              className="rounded-lg border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {onboardingQuestionTypeLabel(question.type)}
                    {question.required ? " · Obligatoire" : ""}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-foreground">
                    {question.title}
                  </h2>
                </div>
                <p className="text-sm tabular-nums text-muted">
                  <span className="font-medium text-foreground">{answered}</span>
                  /{total} réponses
                </p>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-background px-3 py-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                    Ont répondu
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                    {answered}{" "}
                    <span className="font-normal text-muted">
                      ({formatAnswerPercent(answered, total)})
                    </span>
                  </dd>
                </div>
                <div className="rounded-md bg-background px-3 py-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                    Sans réponse
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                    {skipped}{" "}
                    <span className="font-normal text-muted">
                      ({formatAnswerPercent(skipped, total)})
                    </span>
                  </dd>
                </div>
              </dl>

              {question.type === "text" ? (
                <p className="mt-4 text-sm text-muted">
                  Les réponses libres ne sont pas affichées individuellement.
                </p>
              ) : rows.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  Cette question n’a pas d’options.
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {rows.map(({ option, count }) => {
                    const width =
                      denominator > 0 ? (count / denominator) * 100 : 0;
                    return (
                      <li key={option}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate text-foreground">
                            {option}
                          </span>
                          <span className="shrink-0 tabular-nums text-muted">
                            {count} ({formatAnswerPercent(count, denominator)})
                          </span>
                        </div>
                        <div
                          className="mt-1 h-1.5 overflow-hidden rounded-full bg-background"
                          aria-hidden
                        >
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${Math.min(width, 100)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          );
        },
      )}
    </div>
  );
}
