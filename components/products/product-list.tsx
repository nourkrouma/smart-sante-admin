"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { ListSearch } from "@/components/list-search";
import { labelForCategory } from "@/lib/categories";
import { formatPrice } from "@/lib/products";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";
import { ProductDetailPanel } from "@/components/products/product-detail-panel";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { DeleteProductDialog } from "@/components/products/delete-product-dialog";

type ProductListProps = {
  products: Product[];
  categories: Category[];
  categoryFilter: string;
  onCategoryFilterChange: (categoryId: string) => void;
  pageIndex: number;
  hasMore: boolean;
  loading?: boolean;
  emptyMessage?: string;
  resultCount?: number;
  draftQuery: string;
  onDraftQueryChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onMutated?: () => void;
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

export function ProductList({
  products,
  categories,
  categoryFilter,
  onCategoryFilterChange,
  pageIndex,
  hasMore,
  loading = false,
  emptyMessage,
  resultCount,
  draftQuery,
  onDraftQueryChange,
  onSearchSubmit,
  onPrev,
  onNext,
  onMutated,
}: ProductListProps) {
  const [selected, setSelected] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  useEffect(() => {
    if (!selected) return;
    const fresh = products.find((product) => product.id === selected.id);
    setSelected(fresh ?? null);
  }, [products, selected?.id]);

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
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <ListSearch
          label="Rechercher des produits"
          value={draftQuery}
          onChange={onDraftQueryChange}
          onSubmit={onSearchSubmit}
          placeholder="Rechercher par nom, tags, catégorie…"
          disabled={loading && products.length === 0}
        />
        <label className="block shrink-0 lg:w-64">
          <span className="sr-only">Filtrer par catégorie</span>
          <select
            value={categoryFilter}
            onChange={(event) => onCategoryFilterChange(event.target.value)}
            disabled={loading && products.length === 0}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.active ? "" : " (masquée)"}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
        >
          <Plus size={16} strokeWidth={2} />
          Ajouter un produit
        </button>
      </div>

      {products.length === 0 ? (
        loading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 py-8 text-sm text-muted">
            <span
              className="size-4 animate-spin rounded-full border-2 border-border border-t-brand"
              aria-hidden
            />
            Chargement des produits…
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-muted">
            {emptyMessage ??
              (draftQuery.trim()
                ? "Aucun produit ne correspond à votre recherche."
                : "Aucun produit pour le moment.")}
          </p>
        )
      ) : (
        <div
          className={`overflow-x-auto rounded-lg border border-border bg-surface ${
            loading ? "opacity-60" : ""
          }`}
        >
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-5 py-3.5 font-medium">Image</th>
                <th className="px-5 py-3.5 font-medium">Nom</th>
                <th className="px-5 py-3.5 font-medium">Catégorie</th>
                <th className="px-5 py-3.5 font-medium">Prix</th>
                <th className="px-5 py-3.5 font-medium">Tags</th>
                <th className="px-5 py-3.5 font-medium">Galerie</th>
                <th className="px-5 py-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
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
                    <td className="px-5 py-4 text-muted">
                      {labelForCategory(categories, product.category)}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-muted">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-5 py-4">
                      {product.tags.length === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <div className="flex max-w-56 flex-wrap gap-1">
                          {product.tags.slice(0, 3).map((tag) => (
                            <span
                              key={`${product.id}-tag-${tag}`}
                              className="rounded-md bg-background px-1.5 py-0.5 text-xs text-foreground ring-1 ring-border"
                            >
                              {tag}
                            </span>
                          ))}
                          {product.tags.length > 3 ? (
                            <span className="text-xs text-muted">
                              +{product.tags.length - 3}
                            </span>
                          ) : null}
                        </div>
                      )}
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
      )}

      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-muted">
          Page{" "}
          <span className="font-medium text-foreground">{pageIndex + 1}</span>
          {" · "}
          <span className="font-medium text-foreground">{products.length}</span>{" "}
          sur cette page
          {resultCount != null ? (
            <>
              {" · "}
              <span className="font-medium text-foreground">{resultCount}</span>{" "}
              au total
            </>
          ) : null}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={pageIndex <= 0 || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={16} strokeWidth={2} />
            Précédent
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasMore || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            Suivant
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <ProductDetailPanel
        product={selected}
        categoryName={
          selected ? labelForCategory(categories, selected.category) : undefined
        }
        onClose={() => setSelected(null)}
        onEdit={openEdit}
        suppressEscape={formOpen}
      />

      <ProductFormDialog
        open={formOpen}
        product={editing}
        categories={categories}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={onMutated}
      />

      <DeleteProductDialog
        product={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={onMutated}
      />
    </>
  );
}
