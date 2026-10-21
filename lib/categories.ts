import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Category, CategoryInput, CategoryUpdate } from "@/types/category";

const CATEGORIES_COLLECTION = "categories";
const PRODUCTS_COLLECTION = "products";

/**
 * Storefront keys already saved on products. Written once, only when
 * `categories` is still empty, so existing products keep their category.
 */
const DEFAULT_CATEGORIES: Array<Pick<Category, "id" | "name" | "order">> = [
  { id: "all", name: "Tous", order: 0 },
  {
    id: "homme chaussure orthopedique",
    name: "Homme chaussure orthopédique",
    order: 1,
  },
  {
    id: "femme chaussure orthopedique",
    name: "Femme chaussure orthopédique",
    order: 2,
  },
  { id: "paramedical produits", name: "Paramédical produits", order: 3 },
  { id: "طقم طبي و مازر", name: "طقم طبي و مازر", order: 4 },
  { id: "tenu de bloc et blouse", name: "Tenu de bloc et blouse", order: 5 },
];

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, "fr"),
  );
}

export function labelForCategory(
  categories: Category[],
  categoryId: string,
): string {
  if (!categoryId) return "—";
  return (
    categories.find((category) => category.id === categoryId)?.name ??
    categoryId
  );
}

export function categoryNameMap(
  categories: Category[],
): Record<string, string> {
  return Object.fromEntries(
    categories.map((category) => [category.id, category.name]),
  );
}

export function normalizeCategoryName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) {
    throw new Error("Le nom de la catégorie est requis");
  }
  if (name.length > 80) {
    throw new Error("Le nom ne doit pas dépasser 80 caractères");
  }
  return name;
}

function parseTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const seconds = (value as { seconds: unknown }).seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000).toISOString();
    }
  }
  return null;
}

function mapCategory(id: string, data: Record<string, unknown>): Category {
  const storedId =
    typeof data.id === "string" && data.id.trim().length > 0 ? data.id : id;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const order =
    typeof data.order === "number" && Number.isFinite(data.order)
      ? data.order
      : 0;

  return {
    id: storedId,
    name: name || storedId,
    order,
    active: data.active !== false,
    createdAt: parseTimestamp(data.createdAt),
    updatedAt: parseTimestamp(data.updatedAt),
  };
}

export async function listCategories(
  db: Firestore = getFirebaseDb(),
): Promise<Category[]> {
  const snapshot = await getDocs(collection(db, CATEGORIES_COLLECTION));
  return sortCategories(
    snapshot.docs.map((docSnap) =>
      mapCategory(docSnap.id, docSnap.data() as Record<string, unknown>),
    ),
  );
}

/** Migration: create the current catalog keys if no category exists yet. */
export async function ensureDefaultCategories(
  db: Firestore = getFirebaseDb(),
): Promise<void> {
  const existing = await getDocs(
    query(collection(db, CATEGORIES_COLLECTION), limit(1)),
  );
  if (!existing.empty) return;

  const batch = writeBatch(db);
  for (const category of DEFAULT_CATEGORIES) {
    batch.set(doc(db, CATEGORIES_COLLECTION, category.id), {
      id: category.id,
      name: category.name,
      order: category.order,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function getCategories(
  db: Firestore = getFirebaseDb(),
): Promise<Category[]> {
  await ensureDefaultCategories(db);
  return listCategories(db);
}

async function assertUniqueName(
  name: string,
  ignoreId: string | null,
  db: Firestore,
): Promise<void> {
  const categories = await listCategories(db);
  const key = name.toLocaleLowerCase("fr");
  const duplicate = categories.some(
    (category) =>
      category.id !== ignoreId &&
      category.name.toLocaleLowerCase("fr") === key,
  );
  if (duplicate) {
    throw new Error("Une catégorie porte déjà ce nom");
  }
}

export async function createCategory(
  input: CategoryInput,
  db: Firestore = getFirebaseDb(),
): Promise<Category> {
  const name = normalizeCategoryName(input.name);
  await assertUniqueName(name, null, db);

  const ref = doc(collection(db, CATEGORIES_COLLECTION));
  const categories = await listCategories(db);
  const order =
    categories.reduce((max, category) => Math.max(max, category.order), -1) +
    1;

  await setDoc(ref, {
    id: ref.id,
    name,
    order,
    active: input.active,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: ref.id,
    name,
    order,
    active: input.active,
    createdAt: null,
    updatedAt: null,
  };
}

export async function updateCategory(
  id: string,
  input: CategoryUpdate,
  db: Firestore = getFirebaseDb(),
): Promise<Category> {
  const categoryId = id.trim();
  if (!categoryId) {
    throw new Error("L’identifiant de la catégorie est requis");
  }

  const name = normalizeCategoryName(input.name);
  await assertUniqueName(name, categoryId, db);

  const ref = doc(db, CATEGORIES_COLLECTION, categoryId);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    throw new Error("Catégorie introuvable");
  }

  const current = mapCategory(
    existing.id,
    existing.data() as Record<string, unknown>,
  );

  await updateDoc(ref, {
    name,
    active: input.active,
    updatedAt: serverTimestamp(),
  });

  return {
    ...current,
    name,
    active: input.active,
  };
}

export async function countProductsInCategory(
  categoryId: string,
  db: Firestore = getFirebaseDb(),
): Promise<number> {
  const snapshot = await getCountFromServer(
    query(
      collection(db, PRODUCTS_COLLECTION),
      where("category", "==", categoryId),
    ),
  );
  return snapshot.data().count;
}

export async function deleteCategory(
  id: string,
  db: Firestore = getFirebaseDb(),
): Promise<void> {
  const categoryId = id.trim();
  if (!categoryId) {
    throw new Error("L’identifiant de la catégorie est requis");
  }

  const usage = await countProductsInCategory(categoryId, db);
  if (usage > 0) {
    throw new Error(
      usage === 1
        ? "Cette catégorie est utilisée par 1 produit. Réassignez-le avant de la supprimer."
        : `Cette catégorie est utilisée par ${usage} produits. Réassignez-les avant de la supprimer.`,
    );
  }

  await deleteDoc(doc(db, CATEGORIES_COLLECTION, categoryId));
}

export async function moveCategory(
  id: string,
  direction: "up" | "down",
  db: Firestore = getFirebaseDb(),
): Promise<Category[]> {
  const categories = await listCategories(db);
  const index = categories.findIndex((category) => category.id === id);
  if (index < 0) {
    throw new Error("Catégorie introuvable");
  }

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= categories.length) {
    return categories;
  }

  const next = [...categories];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);

  const batch = writeBatch(db);
  let writes = 0;
  next.forEach((category, order) => {
    if (category.order === order) return;
    writes += 1;
    batch.update(doc(db, CATEGORIES_COLLECTION, category.id), {
      order,
      updatedAt: serverTimestamp(),
    });
  });
  if (writes > 0) {
    await batch.commit();
  }

  return next.map((category, order) => ({ ...category, order }));
}

export async function assertCategoryExists(
  categoryId: string,
  db: Firestore = getFirebaseDb(),
): Promise<void> {
  const snapshot = await getDoc(doc(db, CATEGORIES_COLLECTION, categoryId));
  if (!snapshot.exists()) {
    throw new Error(
      "Cette catégorie n’existe pas. Créez-la avant de l’assigner à un produit.",
    );
  }
}
