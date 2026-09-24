import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import {
  DEFAULT_PAGE_SIZE,
  pageFetchLimit,
  type CursorPage,
} from "@/lib/page-query";
import type { Product, ProductCategory, ProductColor } from "@/types/product";
import {
  DEFAULT_PRODUCT_CATEGORY,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
} from "@/types/product";
import { normalizeProductColors, parseProductColors } from "@/lib/colors";

const PRODUCTS_COLLECTION = "products";

export type ProductInput = {
  name: string;
  price: number;
  images: string[];
  sizes: string[];
  colors: ProductColor[];
  tags: string[];
  category: ProductCategory;
};

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeStringArray(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

function normalizeUniqueStringArray(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function isProductCategory(value: string): value is ProductCategory {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

function parseCategory(value: unknown): ProductCategory {
  if (typeof value === "string" && isProductCategory(value)) {
    return value;
  }
  return DEFAULT_PRODUCT_CATEGORY;
}

function mapFirestoreProduct(
  id: string,
  data: Record<string, unknown>,
): Product {
  return {
    id: typeof data.id === "string" && data.id.length > 0 ? data.id : id,
    name: typeof data.name === "string" ? data.name : "",
    price: typeof data.price === "number" ? data.price : Number(data.price) || 0,
    images: parseStringArray(data.images),
    sizes: parseStringArray(data.sizes),
    colors: parseProductColors(data.colors),
    tags: parseStringArray(data.tags),
    category: parseCategory(data.category),
  };
}

function normalizeProductInput(input: ProductInput): ProductInput {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Le nom du produit est requis");
  }

  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error("Le prix doit être un nombre positif ou nul");
  }

  if (!isProductCategory(input.category)) {
    throw new Error("Catégorie de produit invalide");
  }

  return {
    name,
    price: input.price,
    images: normalizeStringArray(input.images),
    sizes: normalizeStringArray(input.sizes),
    colors: normalizeProductColors(input.colors),
    tags: normalizeUniqueStringArray(input.tags),
    category: input.category,
  };
}

export async function getProductsCount(
  db: Firestore = getFirebaseDb(),
): Promise<number> {
  const snapshot = await getCountFromServer(
    collection(db, PRODUCTS_COLLECTION),
  );
  return snapshot.data().count;
}

export async function getProductsPage(
  options: {
    cursorId?: string | null;
    pageSize?: number;
  } = {},
  db: Firestore = getFirebaseDb(),
): Promise<CursorPage<Product>> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const constraints = [
    orderBy(documentId()),
    limit(pageFetchLimit(pageSize)),
  ];

  if (options.cursorId) {
    constraints.splice(1, 0, startAfter(options.cursorId));
  }

  const snapshot = await getDocs(
    query(collection(db, PRODUCTS_COLLECTION), ...constraints),
  );
  const hasMore = snapshot.docs.length > pageSize;
  const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
  const items = pageDocs.map((docSnap) =>
    mapFirestoreProduct(docSnap.id, docSnap.data() as Record<string, unknown>),
  );
  const last = pageDocs[pageDocs.length - 1];

  return {
    items,
    nextCursorId: hasMore && last ? last.id : null,
    hasMore,
  };
}

/** Full catalog load — only for committed search, not browse pagination. */
export async function getAllProducts(
  db: Firestore = getFirebaseDb(),
): Promise<Product[]> {
  const snapshot = await getDocs(
    query(collection(db, PRODUCTS_COLLECTION), orderBy(documentId())),
  );
  return snapshot.docs.map((docSnap) =>
    mapFirestoreProduct(docSnap.id, docSnap.data() as Record<string, unknown>),
  );
}

export function productMatchesQuery(product: Product, rawQuery: string): boolean {
  const needle = rawQuery.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    product.id,
    product.name,
    product.category,
    PRODUCT_CATEGORY_LABELS[product.category],
    ...product.tags,
    ...product.sizes,
    ...product.colors.map((color) => color.value),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

export function filterProducts(products: Product[], rawQuery: string): Product[] {
  const needle = rawQuery.trim();
  if (!needle) return products;
  return products.filter((product) => productMatchesQuery(product, needle));
}

export async function createProduct(
  input: ProductInput,
  db: Firestore = getFirebaseDb(),
): Promise<Product> {
  const normalized = normalizeProductInput(input);
  const id = `${Date.now()}`;
  const product: Product = { id, ...normalized };

  await setDoc(doc(db, PRODUCTS_COLLECTION, id), product);
  return product;
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  db: Firestore = getFirebaseDb(),
): Promise<Product> {
  if (!id.trim()) {
    throw new Error("L’identifiant du produit est requis");
  }

  const normalized = normalizeProductInput(input);
  const product: Product = { id, ...normalized };

  await setDoc(doc(db, PRODUCTS_COLLECTION, id), product, { merge: true });
  return product;
}

export async function deleteProduct(
  id: string,
  db: Firestore = getFirebaseDb(),
): Promise<void> {
  if (!id.trim()) {
    throw new Error("L’identifiant du produit est requis");
  }

  await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatOptionalList(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "—";
}
