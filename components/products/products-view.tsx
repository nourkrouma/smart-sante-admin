"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProductList } from "@/components/products/product-list";
import {
  filterProducts,
  getAllProducts,
  getProductsCount,
  getProductsPage,
} from "@/lib/products";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-query";
import type { Product } from "@/types/product";

export function ProductsView() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [hasMore, setHasMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [draftQuery, setDraftQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [catalog, setCatalog] = useState<Product[] | null>(null);
  const [searchPageIndex, setSearchPageIndex] = useState(0);
  const catalogRequestId = useRef(0);

  const searching = activeQuery.trim().length > 0;

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

    void loadPage(null, 0);

    return () => {
      cancelled = true;
    };
  }, [loadPage, reloadKey]);

  useEffect(() => {
    setSearchPageIndex(0);
  }, [activeQuery]);

  useEffect(() => {
    if (!searching) {
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
  }, [searching, catalog, reloadKey]);

  const searchMatches = useMemo(() => {
    if (!searching || !catalog) return [];
    return filterProducts(catalog, activeQuery);
  }, [searching, catalog, activeQuery]);

  const searchTotalPages = Math.max(
    1,
    Math.ceil(searchMatches.length / DEFAULT_PAGE_SIZE),
  );
  const safeSearchPage = Math.min(searchPageIndex, searchTotalPages - 1);
  const searchPageProducts = searching
    ? searchMatches.slice(
        safeSearchPage * DEFAULT_PAGE_SIZE,
        safeSearchPage * DEFAULT_PAGE_SIZE + DEFAULT_PAGE_SIZE,
      )
    : [];

  const displayedProducts = searching ? searchPageProducts : products;

  function commitSearch(value: string) {
    const next = value.trim();
    setDraftQuery(value);
    setActiveQuery(next);
  }

  function handlePrev() {
    if (loading) return;
    if (searching) {
      setSearchPageIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (pageIndex <= 0) return;
    void loadPage(cursorStack[pageIndex - 1] ?? null, pageIndex - 1);
  }

  function handleNext() {
    if (loading) return;
    if (searching) {
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

  const headerCount = searching
    ? `${searchMatches.length} résultat${searchMatches.length === 1 ? "" : "s"}`
    : totalCount != null
      ? `${totalCount} produit${totalCount === 1 ? "" : "s"}`
      : products
        ? "Produits"
        : "Chargement des produits…";

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

      {displayedProducts ? (
        <ProductList
          products={displayedProducts}
          pageIndex={searching ? safeSearchPage : pageIndex}
          hasMore={
            searching ? safeSearchPage < searchTotalPages - 1 : hasMore
          }
          loading={loading || (searching && catalog === null)}
          emptyMessage={
            searching
              ? "Aucun produit ne correspond à votre recherche."
              : undefined
          }
          resultCount={searching ? searchMatches.length : undefined}
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
