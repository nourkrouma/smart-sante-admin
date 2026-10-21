"use client";

import { useEffect, useState, useTransition } from "react";
import { countProductsInCategory, deleteCategory } from "@/lib/categories";
import { firestoreUserMessage } from "@/lib/firestore-errors";
import type { Category } from "@/types/category";

type DeleteCategoryDialogProps = {
  category: Category | null;
  onClose: () => void;
  onDeleted?: (id: string) => void;
};

export function DeleteCategoryDialog({
  category,
  onClose,
  onDeleted,
}: DeleteCategoryDialogProps) {
  const open = category !== null;
  const [usage, setUsage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!category) return;

    let cancelled = false;

    countProductsInCategory(category.id)
      .then((count) => {
        if (!cancelled) setUsage(count);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          firestoreUserMessage(
            loadError,
            "Impossible de vérifier les produits de cette catégorie",
          ),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, isPending, onClose]);

  function handleDelete() {
    if (!category || usage !== 0) return;
    setError(null);

    startTransition(async () => {
      try {
        await deleteCategory(category.id);
        onDeleted?.(category.id);
        onClose();
      } catch (mutationError) {
        setError(
          firestoreUserMessage(
            mutationError,
            "Impossible de supprimer la catégorie",
          ),
        );
      }
    });
  }

  if (!open || !category) return null;

  const blocked = usage !== null && usage > 0;
  const checking = usage === null && !error;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => {
          if (!isPending) onClose();
        }}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-category-title"
        aria-describedby="delete-category-desc"
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
      >
        <h2
          id="delete-category-title"
          className="text-base font-semibold text-foreground"
        >
          Supprimer la catégorie ?
        </h2>
        <p id="delete-category-desc" className="mt-2 text-sm text-muted">
          {checking ? (
            "Vérification des produits liés…"
          ) : blocked ? (
            <>
              <span className="font-medium text-foreground">{category.name}</span>{" "}
              est utilisée par{" "}
              <span className="font-medium text-foreground">{usage}</span>{" "}
              produit{usage === 1 ? "" : "s"}. Réassignez-les avant de la
              supprimer.
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{category.name}</span>{" "}
              sera supprimée définitivement. Les produits ne sont pas affectés
              tant qu’aucun ne l’utilise.
            </>
          )}
        </p>

        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
          >
            {blocked ? "Fermer" : "Annuler"}
          </button>
          {blocked ? null : (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending || checking || Boolean(error)}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Suppression…" : "Supprimer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
