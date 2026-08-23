"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { firebaseAuthMessage, signInAdmin } from "@/lib/auth";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/products";
  }
  if (value.startsWith("/login")) {
    return "/products";
  }
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = safeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (ready && user) {
      router.replace(nextPath);
    }
  }, [ready, user, nextPath, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signInAdmin(email, password);
      router.replace(nextPath);
    } catch (authError) {
      setError(firebaseAuthMessage(authError));
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || user) {
    return (
      <div className="flex items-center justify-center py-16">
        <span
          className="size-4 animate-spin rounded-full border-2 border-border border-t-brand"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <p className="text-sm font-medium text-brand">Smart Santé</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        Connexion admin
      </h1>
      <p className="mt-1 text-sm text-muted">
        Connectez-vous avec votre e-mail et votre mot de passe.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            E-mail
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            disabled={submitting}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
            placeholder="admin@smartsante.com"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Mot de passe
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            minLength={6}
            disabled={submitting}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
            placeholder="••••••••"
          />
        </label>

        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
