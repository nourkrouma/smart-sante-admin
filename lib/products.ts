import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Product, ProductCategory, ProductColor } from "@/types/product";
import {
  DEFAULT_PRODUCT_CATEGORY,
  PRODUCT_CATEGORIES,
} from "@/types/product";
import { normalizeProductColors, parseProductColors } from "@/lib/colors";

const PRODUCTS_COLLECTION = "products";

export type ProductInput = {
  name: string;
  price: number;
  images: string[];
  sizes: string[];
  colors: ProductColor[];
  category: ProductCategory;
};

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeStringArray(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
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
    category: input.category,
  };
}

export async function getProducts(
  db: Firestore = getFirebaseDb(),
): Promise<Product[]> {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));

  return snapshot.docs.map((docSnap) =>
    mapFirestoreProduct(docSnap.id, docSnap.data() as Record<string, unknown>),
  );
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
