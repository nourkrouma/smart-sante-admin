"use client";

import { useEffect, useState } from "react";
import { QuestionsList } from "@/components/onboarding/questions-list";
import { ResponseStats } from "@/components/onboarding/response-stats";
import { getOnboardingQuestions } from "@/lib/onboarding";
import { getUsers } from "@/lib/users";
import type { OnboardingQuestion } from "@/types/onboarding";
import type { AppUser } from "@/types/user";

type OnboardingTab = "questions" | "stats";

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
      current
        ? [...current, question].sort(
            (a, b) => a.order - b.order || a.title.localeCompare(b.title, "fr"),
          )
        : current,
    );
  }

  function handleQuestionUpdated(question: OnboardingQuestion) {
    setQuestions((current) =>
      current
        ? current
            .map((item) =>
              item.id === question.id
                ? { ...item, ...question, createdAt: item.createdAt }
                : item,
            )
            .sort(
              (a, b) =>
                a.order - b.order || a.title.localeCompare(b.title, "fr"),
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
    <div className="w-full px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Onboarding
        </h1>
        <p className="mt-1 text-sm text-muted">
          {loaded
            ? `${questions.length} question${questions.length === 1 ? "" : "s"} · ${users.length} utilisateur${users.length === 1 ? "" : "s"}`
            : "Chargement de l’onboarding…"}
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Sections onboarding"
        className="mb-6 flex gap-1 rounded-lg border border-border bg-surface p-1"
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
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                selected
                  ? "bg-brand text-white"
                  : "text-muted hover:bg-background hover:text-foreground"
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
    </div>
  );
}
