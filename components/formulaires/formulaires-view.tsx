"use client";

import { useState, type ComponentType } from "react";
import { MessageCircleQuestion, UserPlus } from "lucide-react";
import { OnboardingView } from "@/components/onboarding/onboarding-view";
import { PopupSurveysView } from "@/components/formulaires/popup-surveys-view";

type FormKind = "onboarding" | "popup";

const KINDS: {
  id: FormKind;
  label: string;
  when: string;
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}[] = [
  {
    id: "onboarding",
    label: "Onboarding",
    when: "À l’inscription",
    description:
      "Une seule série de questions, posée une fois quand l’utilisateur crée son compte.",
    icon: UserPlus,
  },
  {
    id: "popup",
    label: "Enquêtes pop-up",
    when: "Pendant l’utilisation",
    description:
      "Plusieurs enquêtes, chacune avec un groupe de questions, affichées de temps en temps dans l’application.",
    icon: MessageCircleQuestion,
  },
];

export function FormulairesView() {
  const [kind, setKind] = useState<FormKind>("onboarding");
  const current = KINDS.find((item) => item.id === kind) ?? KINDS[0];

  return (
    <div className="w-full px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Formulaires
        </h1>
        <p className="mt-1 text-sm text-muted">
          Deux types distincts : l’onboarding à l’inscription, et les enquêtes
          pop-up pendant l’usage de l’app.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Types de formulaires"
        className="mb-8 grid gap-3 sm:grid-cols-2"
      >
        {KINDS.map((item) => {
          const selected = kind === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setKind(item.id)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                selected
                  ? "border-brand bg-brand/5 ring-2 ring-brand/30"
                  : "border-border bg-surface hover:border-brand/40 hover:bg-background"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                    selected
                      ? "bg-brand text-white"
                      : "bg-background text-muted ring-1 ring-border"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    {item.when}
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-foreground">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {item.description}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <section
        aria-labelledby="formulaires-section-title"
        className="rounded-xl border border-border bg-surface p-5 sm:p-6"
      >
        <div className="mb-6 border-b border-border pb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {current.when}
          </p>
          <h2
            id="formulaires-section-title"
            className="mt-1 text-lg font-semibold text-foreground"
          >
            {current.label}
          </h2>
        </div>
        {kind === "onboarding" ? <OnboardingView /> : <PopupSurveysView />}
      </section>
    </div>
  );
}
