"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { Check, Loader2, Search, X } from "lucide-react";
import { firestoreUserMessage } from "@/lib/firestore-errors";
import {
  loadNotificationLibrary,
  notificationImageErrorMessage,
  notificationPreviewSrc,
  peekNotificationLibrary,
  type StoredImageList,
} from "@/lib/notification-images";
import {
  getAllProducts,
  getProductsPage,
  productMatchesQuery,
} from "@/lib/products";
import type { Product } from "@/types/product";

const PRODUCT_PAGE_SIZE = 12;
const SEARCH_VISIBLE_STEP = 24;

type PickerTab = "library" | "products";

type ProductImageChoice = {
  url: string;
  label: string;
};

type BrowseCache = {
  products: Product[];
  nextCursorId: string | null;
  hasMore: boolean;
};

let browseGeneration = 0;
let browseCache: BrowseCache | null = null;
let browseInflight: Promise<BrowseCache> | null = null;
let catalogPromise: Promise<Product[]> | null = null;

function clearProductImageCaches(): void {
  browseGeneration += 1;
  browseCache = null;
  browseInflight = null;
  catalogPromise = null;
}

function readProductBrowse(): Promise<BrowseCache> {
  if (browseCache) return Promise.resolve(browseCache);
  const generation = browseGeneration;
  if (!browseInflight) {
    browseInflight = getProductsPage({ pageSize: PRODUCT_PAGE_SIZE })
      .then((page) => {
        const next: BrowseCache = {
          products: page.items,
          nextCursorId: page.nextCursorId,
          hasMore: page.hasMore,
        };
        if (generation === browseGeneration) browseCache = next;
        return next;
      })
      .finally(() => {
        if (generation === browseGeneration) browseInflight = null;
      });
  }
  return browseInflight;
}

async function readMoreProducts(): Promise<BrowseCache> {
  const current = browseCache ?? (await readProductBrowse());
  if (!current.hasMore || !current.nextCursorId) return current;

  const generation = browseGeneration;
  const page = await getProductsPage({
    cursorId: current.nextCursorId,
    pageSize: PRODUCT_PAGE_SIZE,
  });
  const next: BrowseCache = {
    products: [...current.products, ...page.items],
    nextCursorId: page.nextCursorId,
    hasMore: page.hasMore,
  };
  if (generation === browseGeneration) browseCache = next;
  return next;
}

function readProductCatalog(): Promise<Product[]> {
  if (!catalogPromise) {
    catalogPromise = getAllProducts().catch((error: unknown) => {
      catalogPromise = null;
      throw error;
    });
  }
  return catalogPromise;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function choicesFromProducts(products: Product[]): ProductImageChoice[] {
  const seen = new Set<string>();
  const choices: ProductImageChoice[] = [];

  for (const product of products) {
    for (const image of product.images) {
      const url = image.trim();
      if (!url || seen.has(url) || !isHttpUrl(url)) continue;
      seen.add(url);
      choices.push({
        url,
        label: product.name.trim() || product.id,
      });
    }
  }

  return choices;
}

export function NotificationRemoteImage({
  src,
  alt = "",
  sizes,
}: {
  src: string;
  alt?: string;
  sizes: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background px-2 text-center text-[11px] text-muted">
        Aperçu indisponible
      </div>
    );
  }

  const previewSrc = notificationPreviewSrc(src);
  if (previewSrc) {
    return (
      <Image
        src={previewSrc}
        alt={alt}
        fill
        unoptimized
        sizes={sizes}
        className="object-cover"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    // Browser loads the file from its current host. The image optimizer would fetch it again through this app.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
      onError={() => setFailedSrc(src)}
    />
  );
}

type NotificationImagePickerProps = {
  open: boolean;
  selectedUrl: string;
  onClose: () => void;
  onSelect: (url: string) => void;
};

export function NotificationImagePicker({
  open,
  selectedUrl,
  onClose,
  onSelect,
}: NotificationImagePickerProps) {
  const [tab, setTab] = useState<PickerTab>("library");
  const [library, setLibrary] = useState<StoredImageList | null>(() =>
    peekNotificationLibrary(),
  );
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>(
    () => browseCache?.products ?? [],
  );
  const [productHasMore, setProductHasMore] = useState(
    () => browseCache?.hasMore ?? false,
  );
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [draftQuery, setDraftQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [visibleCount, setVisibleCount] = useState(SEARCH_VISIBLE_STEP);
  const [productsReady, setProductsReady] = useState(() => browseCache !== null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const runSearch = useCallback(async (query: string) => {
    const needle = query.trim();
    setActiveQuery(needle);
    setVisibleCount(SEARCH_VISIBLE_STEP);
    if (!needle) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    setProductError(null);
    try {
      const catalog = await readProductCatalog();
      setSearchResults(
        catalog.filter((product) => productMatchesQuery(product, needle)),
      );
    } catch (error) {
      setProductError(
        firestoreUserMessage(error, "Impossible de rechercher les produits"),
      );
    } finally {
      setSearching(false);
    }
  }, []);

  const loadLibrary = useCallback(async (refresh: boolean) => {
    setLibraryLoading(true);
    setLibraryError(null);
    try {
      const page = await loadNotificationLibrary(
        refresh ? { refresh: true } : undefined,
      );
      setLibrary(page);
    } catch (error) {
      setLibraryError(
        notificationImageErrorMessage(
          error,
          "Impossible de lister les images du stockage",
        ),
      );
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  const loadProducts = useCallback(
    async (refresh: boolean) => {
      setProductLoading(true);
      setProductError(null);
      try {
        if (refresh) {
          clearProductImageCaches();
          setSearchResults(null);
        }
        const page = await readProductBrowse();
        setProducts(page.products);
        setProductHasMore(page.hasMore);
        setProductsReady(true);
        if (refresh && activeQuery.trim()) {
          await runSearch(activeQuery);
        }
      } catch (error) {
        setProductsReady(true);
        setProductError(
          firestoreUserMessage(error, "Impossible de charger les produits"),
        );
      } finally {
        setProductLoading(false);
      }
    },
    [activeQuery, runSearch],
  );

  useEffect(() => {
    if (!open) return;

    if (tab === "library") {
      if (peekNotificationLibrary()) return;
      void loadNotificationLibrary()
        .then((page) => {
          setLibrary(page);
          setLibraryError(null);
        })
        .catch((error: unknown) => {
          setLibraryError(
            notificationImageErrorMessage(
              error,
              "Impossible de lister les images du stockage",
            ),
          );
        });
      return;
    }

    if (browseCache) return;
    void readProductBrowse()
      .then((page) => {
        setProducts(page.products);
        setProductHasMore(page.hasMore);
        setProductsReady(true);
        setProductError(null);
      })
      .catch((error: unknown) => {
        setProductsReady(true);
        setProductError(
          firestoreUserMessage(error, "Impossible de charger les produits"),
        );
      });
  }, [open, tab]);

  async function loadMoreLibrary() {
    setLibraryLoading(true);
    setLibraryError(null);
    try {
      const page = await loadNotificationLibrary({ more: true });
      setLibrary(page);
    } catch (error) {
      setLibraryError(
        notificationImageErrorMessage(
          error,
          "Impossible de lister les images du stockage",
        ),
      );
    } finally {
      setLibraryLoading(false);
    }
  }

  async function loadMoreProducts() {
    setProductLoading(true);
    setProductError(null);
    try {
      const page = await readMoreProducts();
      setProducts(page.products);
      setProductHasMore(page.hasMore);
    } catch (error) {
      setProductError(
        firestoreUserMessage(error, "Impossible de charger les produits"),
      );
    } finally {
      setProductLoading(false);
    }
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    void runSearch(draftQuery);
  }

  if (!open) return null;

  const libraryItems = library?.items ?? [];
  const searchingNow = activeQuery.trim().length > 0;
  const sourceProducts = searchingNow ? (searchResults ?? []) : products;
  const productChoices = choicesFromProducts(sourceProducts);
  const visibleProductChoices = searchingNow
    ? productChoices.slice(0, visibleCount)
    : productChoices;
  const productBusy = productLoading || searching;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-image-picker-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2
              id="notification-image-picker-title"
              className="text-base font-semibold text-foreground"
            >
              Choisir une image
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Le lien existant est réutilisé. Aucune copie n’est envoyée.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground"
            aria-label="Fermer"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <div
            role="tablist"
            aria-label="Source de l’image"
            className="flex gap-1 rounded-lg bg-background p-1"
          >
            <TabButton
              selected={tab === "library"}
              onClick={() => setTab("library")}
            >
              Stockage
            </TabButton>
            <TabButton
              selected={tab === "products"}
              onClick={() => setTab("products")}
            >
              Produits
            </TabButton>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === "library" ? (
            <div role="tabpanel" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  Images déjà dans le dossier notifications.
                </p>
                <button
                  type="button"
                  onClick={() => void loadLibrary(true)}
                  disabled={libraryLoading || (library === null && !libraryError)}
                  className="shrink-0 text-xs font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-60"
                >
                  Actualiser
                </button>
              </div>

              {libraryError ? (
                <p className="text-sm text-red-700" role="alert">
                  {libraryError}
                </p>
              ) : null}

              {library === null && !libraryError ? (
                <LoadingBlock label="Chargement des images" />
              ) : libraryItems.length === 0 ? (
                libraryError ? null : (
                  <p className="rounded-lg bg-background px-3 py-6 text-center text-sm text-muted">
                    Aucune image dans le stockage. Envoyez-en une avec Parcourir.
                  </p>
                )
              ) : (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {libraryItems.map((item, index) => (
                    <li key={item.url}>
                      <ImageChoice
                        src={item.url}
                        label={`Image ${index + 1}`}
                        selected={selectedUrl === item.url}
                        onSelect={() => onSelect(item.url)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {library?.hasMore ? (
                <LoadMoreButton
                  loading={libraryLoading}
                  onClick={() => void loadMoreLibrary()}
                />
              ) : null}
            </div>
          ) : (
            <div role="tabpanel" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  Images déjà associées aux produits.
                </p>
                <button
                  type="button"
                  onClick={() => void loadProducts(true)}
                  disabled={
                    productBusy || (!productsReady && !productError)
                  }
                  className="shrink-0 text-xs font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-60"
                >
                  Actualiser
                </button>
              </div>

              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="search"
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  placeholder="Nom, tag, identifiant"
                  aria-label="Rechercher un produit"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
                >
                  {searching ? (
                    <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                  ) : (
                    <Search size={16} strokeWidth={2} />
                  )}
                  Rechercher
                </button>
              </form>

              {productError ? (
                <p className="text-sm text-red-700" role="alert">
                  {productError}
                </p>
              ) : null}

              {!productsReady &&
              visibleProductChoices.length === 0 &&
              !productError ? (
                <LoadingBlock label="Chargement des produits" />
              ) : productBusy && visibleProductChoices.length === 0 ? (
                <LoadingBlock
                  label={searching ? "Recherche" : "Chargement des produits"}
                />
              ) : visibleProductChoices.length === 0 ? (
                productError ? null : (
                  <p className="rounded-lg bg-background px-3 py-6 text-center text-sm text-muted">
                    {searchingNow
                      ? "Aucun produit avec image ne correspond."
                      : "Aucun produit avec image."}
                  </p>
                )
              ) : (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {visibleProductChoices.map((choice) => (
                    <li key={choice.url}>
                      <ImageChoice
                        src={choice.url}
                        label={choice.label}
                        caption={choice.label}
                        selected={selectedUrl === choice.url}
                        onSelect={() => onSelect(choice.url)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {searchingNow && visibleProductChoices.length < productChoices.length ? (
                <LoadMoreButton
                  loading={false}
                  label="Afficher plus"
                  onClick={() =>
                    setVisibleCount((count) => count + SEARCH_VISIBLE_STEP)
                  }
                />
              ) : null}

              {!searchingNow && productHasMore ? (
                <LoadMoreButton
                  loading={productLoading}
                  onClick={() => void loadMoreProducts()}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        selected
          ? "bg-surface text-foreground shadow-sm"
          : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ImageChoice({
  src,
  label,
  caption,
  selected,
  onSelect,
}: {
  src: string;
  label: string;
  caption?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-pressed={selected}
      className={`w-full overflow-hidden rounded-lg border text-left transition-colors ${
        selected ? "border-brand ring-2 ring-brand" : "border-border hover:border-foreground/30"
      }`}
    >
      <span className="relative block aspect-square bg-background">
        <NotificationRemoteImage src={src} alt="" sizes="160px" />
        {selected ? (
          <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-white">
            <Check size={12} strokeWidth={2.5} />
          </span>
        ) : null}
      </span>
      {caption ? (
        <span className="block truncate px-1.5 py-1 text-[11px] text-muted">
          {caption}
        </span>
      ) : null}
    </button>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
      <Loader2 size={16} strokeWidth={2} className="animate-spin" />
      {label}
    </div>
  );
}

function LoadMoreButton({
  loading,
  onClick,
  label = "Charger plus",
}: {
  loading: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <div className="flex justify-center pt-1">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={14} strokeWidth={2} className="animate-spin" />
        ) : null}
        {label}
      </button>
    </div>
  );
}
