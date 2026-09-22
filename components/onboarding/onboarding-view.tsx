"use client";

import { useEffect, useState } from "react";
import { QuestionsList } from "@/components/onboarding/questions-list";
import { ResponseStats } from "@/components/onboarding/response-stats";
import {
  createOnboardingQuestion,
  deleteOnboardingQuestion,
  getOnboardingQuestions,
  updateOnboardingQuestion,
} from "@/lib/onboarding";
import { getUsers } from "@/lib/users";
import type { OnboardingQuestion } from "@/types/onboarding";
import type { AppUser } from "@/types/user";

type OnboardingTab = "questions" | "stats";

function sortQuestions(questions: OnboardingQuestion[]) {
  return [...questions].sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title, "fr"),
  );
}

export function OnboardingView() {
  const [tab, setTab] = useState<OnboardingTab>("questions");
  const [questions, setQuestions] = useState<OnboardingQuestion[] | null>(null);
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getOnboardingQuestions(), getUsers()])
      .then(([loadedQuestions, loadedUsers]) => {
        if (cancelled) return;
        setQuestions(loadedQuestions);
        setUsers(loadedUsers);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger l’onboarding",
        );
        setQuestions([]);
        setUsers([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleQuestionCreated(question: OnboardingQuestion) {
    setQuestions((current) =>
      current ? sortQuestions([...current, question]) : current,
    );
  }

  function handleQuestionUpdated(question: OnboardingQuestion) {
    setQuestions((current) =>
      current
        ? sortQuestions(
            current.map((item) =>
              item.id === question.id
                ? { ...item, ...question, createdAt: item.createdAt }
                : item,
            ),
          )
        : current,
    );
  }

  function handleQuestionDeleted(id: string) {
    setQuestions((current) =>
      current ? current.filter((item) => item.id !== id) : current,
    );
  }

  const loaded = questions !== null && users !== null;

  return (
    <>
      <div
        role="tablist"
        aria-label="Sections onboarding"
        className="mb-6 flex gap-5 border-b border-border"
      >
        {(
          [
            { id: "questions", label: "Questions" },
            { id: "stats", label: "Statistiques" },
          ] as const
        ).map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item.id)}
              className={`-mb-px border-b-2 px-0.5 pb-2 text-sm font-medium transition-colors ${
                selected
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loaded ? (
        tab === "questions" ? (
          <QuestionsList
            questions={questions}
            onSubmit={(id, input) => {
              const payload = {
                title: input.title,
                type: input.type,
                options: input.options,
                order: input.order,
                required: input.required,
              };
              return id
                ? updateOnboardingQuestion(id, payload)
                : createOnboardingQuestion(payload);
            }}
            onDelete={deleteOnboardingQuestion}
            onCreated={handleQuestionCreated}
            onUpdated={handleQuestionUpdated}
            onDeleted={handleQuestionDeleted}
          />
        ) : (
          <ResponseStats questions={questions} users={users} />
        )
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-center gap-2 border-b border-border px-5 py-8 text-sm text-muted">
            <span
              className="size-4 animate-spin rounded-full border-2 border-border border-t-brand"
              aria-hidden
            />
            Chargement de l’onboarding…
          </div>
        </div>
      )}
    </>
  );
}
