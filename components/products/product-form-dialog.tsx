"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { X } from "lucide-react";
import { createProduct, updateProduct } from "@/lib/products";
import type { Product, ProductCategory, ProductColor } from "@/types/product";
import {
  DEFAULT_PRODUCT_CATEGORY,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
} from "@/types/product";
import { TagInput } from "@/components/products/tag-input";
import { ColorInput } from "@/components/products/color-input";

type ProductFormDialogProps = {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved?: () => void;
};

function imagesToText(images: string[]): string {
  return images.join("\n");
}

function textToImages(text: string): string[] {
  return text
    .split(/\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function ProductFormDialog({
  open,
  product,
  onClose,
  onSaved,
}: ProductFormDialogProps) {
  const isEdit = product !== null;
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<ProductCategory>(
    DEFAULT_PRODUCT_CATEGORY,
  );
  const [imagesText, setImagesText] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setPrice(product ? String(product.price) : "");
    setCategory(product?.category ?? DEFAULT_PRODUCT_CATEGORY);
    setImagesText(product ? imagesToText(product.images) : "");
    setSizes(product?.sizes ?? []);
    setColors(product?.colors ?? []);
    setTags(product?.tags ?? []);
    setError(null);
  }, [open, product]);

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
    setError(null);

    const parsedPrice = Number.parseFloat(price);
    const input = {
      name,
      price: parsedPrice,
      images: textToImages(imagesText),
      sizes,
      colors,
      tags,
      category,
    };

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateProduct(product.id, input);
        } else {
          await createProduct(input);
        }
        onSaved?.();
        onClose();
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : isEdit
              ? "Impossible de modifier le produit"
              : "Impossible de créer le produit",
        );
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => {
          if (!isPending) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <h2
            id="product-form-title"
            className="text-base font-semibold text-foreground"
          >
            {isEdit ? "Modifier le produit" : "Ajouter un produit"}
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
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Nom
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              placeholder="Nom du produit"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Prix
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              placeholder="0"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Catégorie
            </span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as ProductCategory)
              }
              required
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
            >
              {PRODUCT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {PRODUCT_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <TagInput
            label="Tailles"
            values={sizes}
            onChange={setSizes}
            placeholder="ex. M, L, XL"
            disabled={isPending}
          />

          <ColorInput
            label="Couleurs"
            values={colors}
            onChange={setColors}
            disabled={isPending}
          />

          <TagInput
            label="Tags"
            values={tags}
            onChange={setTags}
            placeholder="ex. confort, sport, étanche"
            disabled={isPending}
          />

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Images
            </span>
            <textarea
              value={imagesText}
              onChange={(event) => setImagesText(event.target.value)}
              disabled={isPending}
              rows={4}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              placeholder={"Une URL d’image par ligne"}
            />
            <span className="block text-xs text-muted">
              Saisissez une URL d’image par ligne
            </span>
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
              {isPending
                ? isEdit
                  ? "Enregistrement…"
                  : "Création…"
                : isEdit
                  ? "Enregistrer"
                  : "Créer le produit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
