"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProductList } from "@/components/products/product-list";
import { categoryNameMap, getCategories } from "@/lib/categories";
import { firestoreUserMessage } from "@/lib/firestore-errors";
import {
  getAllProducts,
  getProductsCount,
  getProductsPage,
  productInCategory,
  productMatchesQuery,
} from "@/lib/products";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-query";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

export function ProductsView() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [hasMore, setHasMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [draftQuery, setDraftQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalog, setCatalog] = useState<Product[] | null>(null);
  const [searchPageIndex, setSearchPageIndex] = useState(0);
  const catalogRequestId = useRef(0);

  const searching = activeQuery.trim().length > 0;
  const catalogMode = searching || categoryFilter.length > 0;

  const loadPage = useCallback(
    async (cursorId: string | null, index: number) => {
      setLoading(true);
      setError(null);
      try {
        const page = await getProductsPage({
          cursorId,
          pageSize: DEFAULT_PAGE_SIZE,
        });
        setProducts(page.items);
        setHasMore(page.hasMore);
        setPageIndex(index);
        setCursorStack((current) => {
          const next = current.slice(0, index + 1);
          next[index] = cursorId;
          if (page.nextCursorId) {
            next[index + 1] = page.nextCursorId;
          }
          return next;
        });
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les produits",
        );
        setProducts([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    getProductsCount()
      .then((count) => {
        if (!cancelled) setTotalCount(count);
      })
      .catch(() => {
        if (!cancelled) setTotalCount(null);
      });

    getCategories()
      .then((loaded) => {
        if (cancelled) return;
        setCategoryError(null);
        setCategories(loaded);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setCategoryError(
          firestoreUserMessage(
            loadError,
            "Impossible de charger les catégories",
          ),
        );
      });

    void loadPage(null, 0);

    return () => {
      cancelled = true;
    };
  }, [loadPage, reloadKey]);

  useEffect(() => {
    setSearchPageIndex(0);
  }, [activeQuery, categoryFilter]);

  useEffect(() => {
    if (!catalogMode) {
      setCatalog(null);
      return;
    }

    if (catalog !== null) return;

    const requestId = ++catalogRequestId.current;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAllProducts()
      .then((all) => {
        if (cancelled || requestId !== catalogRequestId.current) return;
        setCatalog(all);
      })
      .catch((loadError) => {
        if (cancelled || requestId !== catalogRequestId.current) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de rechercher les produits",
        );
        setCatalog([]);
      })
      .finally(() => {
        if (!cancelled && requestId === catalogRequestId.current) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [catalogMode, catalog, reloadKey]);

  const namesByCategory = useMemo(
    () => categoryNameMap(categories),
    [categories],
  );

  const searchMatches = useMemo(() => {
    if (!catalogMode || !catalog) return [];
    return catalog.filter(
      (product) =>
        productInCategory(product, categoryFilter) &&
        productMatchesQuery(
          product,
          activeQuery,
          namesByCategory[product.category] ?? "",
        ),
    );
  }, [catalogMode, catalog, categoryFilter, activeQuery, namesByCategory]);

  const searchTotalPages = Math.max(
    1,
    Math.ceil(searchMatches.length / DEFAULT_PAGE_SIZE),
  );
  const safeSearchPage = Math.min(searchPageIndex, searchTotalPages - 1);
  const searchPageProducts = catalogMode
    ? searchMatches.slice(
        safeSearchPage * DEFAULT_PAGE_SIZE,
        safeSearchPage * DEFAULT_PAGE_SIZE + DEFAULT_PAGE_SIZE,
      )
    : [];

  const displayedProducts = catalogMode ? searchPageProducts : products;

  function commitSearch(value: string) {
    const next = value.trim();
    setDraftQuery(value);
    setActiveQuery(next);
  }

  function handlePrev() {
    if (loading) return;
    if (catalogMode) {
      setSearchPageIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (pageIndex <= 0) return;
    void loadPage(cursorStack[pageIndex - 1] ?? null, pageIndex - 1);
  }

  function handleNext() {
    if (loading) return;
    if (catalogMode) {
      setSearchPageIndex((current) =>
        Math.min(searchTotalPages - 1, current + 1),
      );
      return;
    }
    if (!hasMore) return;
    const nextCursor = cursorStack[pageIndex + 1];
    if (nextCursor == null) return;
    void loadPage(nextCursor, pageIndex + 1);
  }

  function handleMutated() {
    setCatalog(null);
    setCursorStack([null]);
    setReloadKey((value) => value + 1);
  }

  const headerCount = catalogMode
    ? `${searchMatches.length} résultat${searchMatches.length === 1 ? "" : "s"}`
    : totalCount != null
      ? `${totalCount} produit${totalCount === 1 ? "" : "s"}`
      : products
        ? "Produits"
        : "Chargement des produits…";

  const emptyMessage = searching
    ? "Aucun produit ne correspond à votre recherche."
    : categoryFilter
      ? "Aucun produit dans cette catégorie."
      : undefined;

  return (
    <div className="w-full px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Produits
        </h1>
        <p className="mt-1 text-sm text-muted">{headerCount}</p>
      </header>

      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {categoryError ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {categoryError}
        </p>
      ) : null}

      {displayedProducts ? (
        <ProductList
          products={displayedProducts}
          categories={categories}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          pageIndex={catalogMode ? safeSearchPage : pageIndex}
          hasMore={
            catalogMode ? safeSearchPage < searchTotalPages - 1 : hasMore
          }
          loading={loading || (catalogMode && catalog === null)}
          emptyMessage={emptyMessage}
          resultCount={catalogMode ? searchMatches.length : undefined}
          draftQuery={draftQuery}
          onDraftQueryChange={setDraftQuery}
          onSearchSubmit={commitSearch}
          onPrev={handlePrev}
          onNext={handleNext}
          onMutated={handleMutated}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-center gap-2 border-b border-border px-5 py-8 text-sm text-muted">
            <span
              className="size-4 animate-spin rounded-full border-2 border-border border-t-brand"
              aria-hidden
            />
            Chargement des produits…
          </div>
        </div>
      )}
    </div>
  );
}
