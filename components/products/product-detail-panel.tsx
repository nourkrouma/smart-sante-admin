"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Pencil, X } from "lucide-react";
import type { Product } from "@/types/product";
import { PRODUCT_CATEGORY_LABELS } from "@/types/product";
import { formatOptionalList, formatPrice } from "@/lib/products";

type ProductDetailPanelProps = {
  product: Product | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
  suppressEscape?: boolean;
};

export function ProductDetailPanel({
  product,
  onClose,
  onEdit,
  suppressEscape = false,
}: ProductDetailPanelProps) {
  const open = product !== null;
  const [activeImage, setActiveImage] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setActiveImage(0);
  }, [product?.id]);

  useEffect(() => {
    setImageLoaded(false);
  }, [product?.id, activeImage]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !suppressEscape) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, suppressEscape]);

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={product ? `Détails de ${product.name}` : "Détails du produit"}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Détails du produit
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground"
            aria-label="Fermer"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {product && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-background">
                {product.images[activeImage] ? (
                  <>
                    {!imageLoaded ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2
                          size={24}
                          strokeWidth={2}
                          className="animate-spin text-muted"
                          aria-label="Chargement de l’image"
                        />
                      </div>
                    ) : null}
                    <Image
                      src={product.images[activeImage]}
                      alt={product.name}
                      fill
                      sizes="(max-width: 448px) 100vw, 448px"
                      className={`object-cover transition-opacity duration-200 ${
                        imageLoaded ? "opacity-100" : "opacity-0"
                      }`}
                      priority
                      onLoad={() => setImageLoaded(true)}
                    />
                  </>
                ) : (
                  <div className="flex size-full items-center justify-center text-sm text-muted">
                    Aucune image
                  </div>
                )}
              </div>

              {product.images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((src, index) => (
                    <button
                      key={`${product.id}-thumb-${index}`}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`relative size-14 shrink-0 overflow-hidden rounded-md ${
                        index === activeImage
                          ? "ring-2 ring-brand"
                          : "ring-1 ring-border hover:ring-brand/40"
                      }`}
                    >
                      <Image
                        src={src}
                        alt={`${product.name} ${index + 1}`}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Nom
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                    {product.name}
                  </h2>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Prix
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-brand">
                    {formatPrice(product.price)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Catégorie
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {PRODUCT_CATEGORY_LABELS[product.category]}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Tailles
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {formatOptionalList(product.sizes)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Couleurs
                  </p>
                  {product.colors.length === 0 ? (
                    <p className="mt-1 text-sm text-foreground">—</p>
                  ) : (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {product.colors.map((color, index) => (
                        <li
                          key={`${product.id}-color-${color.type}-${color.value}-${index}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-1 text-xs font-medium text-foreground ring-1 ring-border"
                        >
                          {color.type === "hex" ? (
                            <span
                              aria-hidden
                              className="size-3 shrink-0 rounded-full ring-1 ring-border"
                              style={{ backgroundColor: color.value }}
                            />
                          ) : null}
                          {color.value}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Tags
                  </p>
                  {product.tags.length === 0 ? (
                    <p className="mt-1 text-sm text-foreground">—</p>
                  ) : (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {product.tags.map((tag) => (
                        <li
                          key={`${product.id}-tag-${tag}`}
                          className="rounded-md bg-background px-2 py-1 text-xs font-medium text-foreground ring-1 ring-border"
                        >
                          {tag}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Images
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {product.images.length} image
                    {product.images.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => onEdit(product)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
              >
                <Pencil size={16} strokeWidth={2} />
                Modifier le produit
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
