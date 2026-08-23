"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct } from "@/lib/products";
import type { Product } from "@/types/product";

type DeleteProductDialogProps = {
  product: Product | null;
  onClose: () => void;
};

export function DeleteProductDialog({
  product,
  onClose,
}: DeleteProductDialogProps) {
  const router = useRouter();
  const open = product !== null;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open, product?.id]);

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
    if (!product) return;
    setError(null);

    startTransition(async () => {
      try {
        await deleteProduct(product.id);
        router.refresh();
        onClose();
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Impossible de supprimer le produit",
        );
      }
    });
  }

  if (!open || !product) return null;

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
        aria-labelledby="delete-product-title"
        aria-describedby="delete-product-desc"
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
      >
        <h2
          id="delete-product-title"
          className="text-base font-semibold text-foreground"
        >
          Supprimer le produit ?
        </h2>
        <p id="delete-product-desc" className="mt-2 text-sm text-muted">
          Cette action supprimera définitivement{" "}
          <span className="font-medium text-foreground">{product.name}</span>{" "}
          de la base de données. Elle est irréversible.
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
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}
