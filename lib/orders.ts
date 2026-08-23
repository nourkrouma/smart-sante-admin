import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  Timestamp,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import {
  isOrderStatus,
  type Order,
  type OrderCollection,
  type OrderItem,
  type OrderStatus,
} from "@/types/order";

const ORDERS_COLLECTION = "orders";
const COMMANDES_COLLECTION = "commandes";

function parseString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseTimestamp(value: unknown): string | null {
  if (!value) return null;

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === "object" && "seconds" in value) {
    const seconds = (value as { seconds: unknown }).seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000).toISOString();
    }
  }

  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

function parseOrderItem(value: unknown): OrderItem {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    imageUrl: parseString(data.imageUrl),
    name: parseString(data.name),
    price: parseNumber(data.price),
    productId: parseString(data.productId),
    quantity: parseNumber(data.quantity) || 1,
    selectedColor: parseString(data.selectedColor),
    selectedSize: parseString(data.selectedSize),
  };
}

function parseOrderItems(value: unknown): OrderItem[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseOrderItem);
}

function mapFirestoreOrder(
  id: string,
  data: Record<string, unknown>,
  collectionName: OrderCollection,
): Order {
  return {
    id: parseString(data.id) || id,
    docId: id,
    collection: collectionName,
    address: parseString(data.address),
    createdAt: parseTimestamp(data.createdAt),
    date: parseTimestamp(data.date),
    deliveryService:
      parseString(data.deliveryService) || parseString(data.deliveryService),
    fullName: parseString(data.fullName),
    items: parseOrderItems(data.items),
    notes: parseString(data.notes),
    phone: parseString(data.phone),
    shippingFee: parseNumber(data.shippingFee),
    status: parseString(data.status),
    subtotal: parseNumber(data.subtotal),
    total: parseNumber(data.total),
    updatedAt: parseTimestamp(data.updatedAt),
    userId: parseString(data.userId) || parseString(data.userId),
  };
}

function orderTime(order: Order): number {
  const iso = order.date ?? order.createdAt;
  if (!iso) return 0;
  return new Date(iso).getTime();
}

function mapSnapshot(
  snapshot: Awaited<ReturnType<typeof getDocs>>,
  collectionName: OrderCollection,
): Order[] {
  return snapshot.docs
    .map((docSnap) =>
      mapFirestoreOrder(
        docSnap.id,
        docSnap.data() as Record<string, unknown>,
        collectionName,
      ),
    )
    .sort((a, b) => orderTime(b) - orderTime(a));
}

export async function getOrders(
  db: Firestore = getFirebaseDb(),
): Promise<Order[]> {
  const [ordersResult, commandesResult] = await Promise.allSettled([
    getDocs(collection(db, ORDERS_COLLECTION)),
    getDocs(collection(db, COMMANDES_COLLECTION)),
  ]);

  if (ordersResult.status === "fulfilled" && !ordersResult.value.empty) {
    return mapSnapshot(ordersResult.value, "orders");
  }

  if (commandesResult.status === "fulfilled" && !commandesResult.value.empty) {
    return mapSnapshot(commandesResult.value, "commandes");
  }

  if (
    ordersResult.status === "rejected" &&
    commandesResult.status === "rejected"
  ) {
    throw ordersResult.reason;
  }

  if (ordersResult.status === "fulfilled") {
    return mapSnapshot(ordersResult.value, "orders");
  }

  if (commandesResult.status === "fulfilled") {
    return mapSnapshot(commandesResult.value, "commandes");
  }

  return [];
}

export async function updateOrderStatus(
  docId: string,
  status: OrderStatus,
  collectionName: OrderCollection = "orders",
  db: Firestore = getFirebaseDb(),
): Promise<void> {
  if (!docId.trim()) {
    throw new Error("L’identifiant de la commande est requis");
  }

  if (!isOrderStatus(status)) {
    throw new Error("Statut de commande invalide");
  }

  await updateDoc(doc(db, collectionName, docId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatOptionalText(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "—";
}

export function itemCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}
