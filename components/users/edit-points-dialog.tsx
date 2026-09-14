"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { X } from "lucide-react";
import {
  formatPoints,
  updateUserPoints,
  userDisplayName,
} from "@/lib/users";
import type { AppUser } from "@/types/user";

type EditPointsDialogProps = {
  user: AppUser | null;
  onClose: () => void;
  onSaved: (points: number) => void;
};

export function EditPointsDialog({
  user,
  onClose,
  onSaved,
}: EditPointsDialogProps) {
  const open = user !== null;
  const [points, setPoints] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) return;
    setPoints(String(user.points));
    setError(null);
  }, [user]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isPending, onClose]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setError(null);

    const parsed = Number.parseInt(points, 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("Les points doivent être un entier positif ou nul");
      return;
    }

    startTransition(async () => {
      try {
        const saved = await updateUserPoints(user.id, parsed);
        onSaved(saved);
        onClose();
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Impossible de modifier les points",
        );
      }
    });
  }

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => {
          if (!isPending) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-points-title"
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2
            id="edit-points-title"
            className="text-base font-semibold text-foreground"
          >
            Modifier les points
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
            aria-label="Fermer"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <p className="text-sm text-muted">
            {userDisplayName(user)} · actuel{" "}
            <span className="font-medium text-foreground">
              {formatPoints(user.points)}
            </span>
          </p>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Points
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              required
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
