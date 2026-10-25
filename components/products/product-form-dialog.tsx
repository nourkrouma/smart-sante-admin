"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { createProduct, updateProduct } from "@/lib/products";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";
import { TagInput } from "@/components/products/tag-input";
import { ColorInput } from "@/components/products/color-input";
import { ProductImageField } from "@/components/products/product-image-field";

type ProductFormDialogProps = {
  open: boolean;
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved?: () => void;
};

function selectableCategories(
  categories: Category[],
  selectedId: string,
): Category[] {
  return categories.filter(
    (category) => category.active || category.id === selectedId,
  );
}

function imagesToText(images: string[]): string {
  return images.join("\n");
}

function textToImages(text: string): string[] {
  return text
    .split(/\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function ProductFormDialog(props: ProductFormDialogProps) {
  if (!props.open) return null;
  return (
    <ProductFormDialogBody key={props.product?.id ?? "new"} {...props} />
  );
}

function ProductFormDialogBody({
  open,
  product,
  categories,
  onClose,
  onSaved,
}: ProductFormDialogProps) {
  const isEdit = product !== null;
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [imagesText, setImagesText] = useState(
    product ? imagesToText(product.images) : "",
  );
  const [sizes, setSizes] = useState(product?.sizes ?? []);
  const [colors, setColors] = useState(product?.colors ?? []);
  const [tags, setTags] = useState(product?.tags ?? []);
  const [error, setError] = useState<string | null>(null);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const busy = isPending || imagesUploading;

  const categoryValue =
    category ||
    (product ? "" : (categories.find((item) => item.active)?.id ?? ""));

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, busy, onClose]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (imagesUploading) {
      setError("Attendez la fin de l’envoi des images.");
      return;
    }

    const parsedPrice = Number.parseFloat(price);
    const input = {
      name,
      price: parsedPrice,
      images: textToImages(imagesText),
      sizes,
      colors,
      tags,
      category: categoryValue,
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
          if (!busy) onClose();
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        aria-busy={imagesUploading}
        className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-surface shadow-xl"
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
            disabled={busy}
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
              disabled={busy}
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
              disabled={busy}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              placeholder="0"
            />
          </label>

          <div className="block space-y-1.5">
            <span
              id="product-category-label"
              className="text-xs font-medium uppercase tracking-wide text-muted"
            >
              Catégorie
            </span>
            {categories.length === 0 && !categoryValue ? (
              <span className="block rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
                Aucune catégorie.{" "}
                <Link href="/categories" className="font-medium text-brand">
                  Créez-en une
                </Link>{" "}
                avant d’ajouter un produit.
              </span>
            ) : (
              <select
                value={categoryValue}
                onChange={(event) => setCategory(event.target.value)}
                required
                disabled={busy}
                aria-labelledby="product-category-label"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              >
                <option value="" disabled>
                  Choisir une catégorie
                </option>
                {!categories.some((item) => item.id === categoryValue) &&
                categoryValue ? (
                  <option value={categoryValue}>{categoryValue}</option>
                ) : null}
                {selectableCategories(categories, categoryValue).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.active ? "" : " (masquée)"}
                  </option>
                ))}
              </select>
            )}
          </div>

          <TagInput
            label="Tailles"
            values={sizes}
            onChange={setSizes}
            placeholder="ex. M, L, XL"
            disabled={busy}
          />

          <ColorInput
            label="Couleurs"
            values={colors}
            onChange={setColors}
            disabled={busy}
          />

          <TagInput
            label="Tags"
            values={tags}
            onChange={setTags}
            placeholder="ex. confort, sport, étanche"
            disabled={busy}
          />

          <ProductImageField
            value={imagesText}
            onChange={setImagesText}
            disabled={isPending}
            onBusyChange={setImagesUploading}
          />

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {imagesUploading
                ? "Envoi des images…"
                : isPending
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
