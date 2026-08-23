"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import type { Product } from "@/types/product";
import { formatPrice } from "@/lib/products";
import { ProductDetailPanel } from "@/components/products/product-detail-panel";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { DeleteProductDialog } from "@/components/products/delete-product-dialog";

const PAGE_SIZE = 10;

type ProductListProps = {
  products: Product[];
};

type ProductThumbProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
};

function ProductThumb({ src, alt, sizes, className = "" }: ProductThumbProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-background ${className}`}>
      {!loaded ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2
            size={14}
            strokeWidth={2}
            className="animate-spin text-muted"
            aria-hidden
          />
        </div>
      ) : null}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

export function ProductList({ products }: ProductListProps) {
  const [selected, setSelected] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageProducts = products.slice(startIndex, startIndex + PAGE_SIZE);
  const rangeStart = products.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + PAGE_SIZE, products.length);

  useEffect(() => {
    if (!selected) return;
    const fresh = products.find((product) => product.id === selected.id);
    setSelected(fresh ?? null);
  }, [products, selected?.id]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setFormOpen(true);
  }

  function openDelete(product: Product) {
    setSelected(null);
    setDeleting(product);
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
        >
          <Plus size={16} strokeWidth={2} />
          Ajouter un produit
        </button>
      </div>

      {products.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">Aucun produit pour le moment.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                  <th className="px-5 py-3.5 font-medium">Image</th>
                  <th className="px-5 py-3.5 font-medium">Nom</th>
                  <th className="px-5 py-3.5 font-medium">Prix</th>
                  <th className="px-5 py-3.5 font-medium">Galerie</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageProducts.map((product) => {
                  const isSelected = selected?.id === product.id;
                  return (
                    <tr
                      key={product.id}
                      tabIndex={0}
                      onClick={() => setSelected(product)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelected(product);
                        }
                      }}
                      className={`cursor-pointer border-b border-border last:border-0 transition-colors ${
                        isSelected ? "bg-brand/5" : "hover:bg-background/80"
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="size-14 overflow-hidden rounded-md">
                          {product.images[0] ? (
                            <ProductThumb
                              src={product.images[0]}
                              alt={product.name}
                              sizes="56px"
                              className="size-14"
                            />
                          ) : (
                            <div className="flex size-14 items-center justify-center bg-background text-xs text-muted">
                              —
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-foreground">
                        {product.name}
                      </td>
                      <td className="px-5 py-4 tabular-nums text-muted">
                        {formatPrice(product.price)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {product.images.slice(0, 4).map((src, index) => (
                            <ProductThumb
                              key={`${product.id}-${index}`}
                              src={src}
                              alt={`${product.name} ${index + 1}`}
                              sizes="36px"
                              className="size-9 rounded ring-1 ring-border"
                            />
                          ))}
                          <span className="ml-1 text-xs text-muted">
                            {product.images.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => openDelete(product)}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                            aria-label={`Supprimer ${product.name}`}
                          >
                            <Trash2 size={14} strokeWidth={1.75} />
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-muted">
              Affichage{" "}
              <span className="font-medium text-foreground">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              sur{" "}
              <span className="font-medium text-foreground">
                {products.length}
              </span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} strokeWidth={2} />
                Précédent
              </button>
              <span className="min-w-24 text-center text-sm tabular-nums text-muted">
                Page {safePage} sur {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suivant
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        </>
      )}

      <ProductDetailPanel
        product={selected}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
        suppressEscape={formOpen}
      />

      <ProductFormDialog
        open={formOpen}
        product={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <DeleteProductDialog
        product={deleting}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
