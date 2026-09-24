import {
  collection,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import {
  DEFAULT_PAGE_SIZE,
  pageFetchLimit,
  type CursorPage,
} from "@/lib/page-query";
import {
  isOrderStatus,
  type Order,
  type OrderCollection,
  type OrderItem,
  type OrderStatus,
} from "@/types/order";

const ORDERS_COLLECTION = "orders";
const COMMANDES_COLLECTION = "commandes";
const DELIVERED_POINTS = 10;

let resolvedCollection: OrderCollection | null = null;

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
    deliveryService: parseString(data.deliveryService),
    fullName: parseString(data.fullName),
    items: parseOrderItems(data.items),
    notes: parseString(data.notes),
    phone: parseString(data.phone),
    shippingFee: parseNumber(data.shippingFee),
    status: parseString(data.status),
    subtotal: parseNumber(data.subtotal),
    total: parseNumber(data.total),
    updatedAt: parseTimestamp(data.updatedAt),
    userId: parseString(data.userId),
  };
}

function orderTime(order: Order): number {
  const iso = order.date ?? order.createdAt;
  if (!iso) return 0;
  return new Date(iso).getTime();
}

async function resolveOrdersCollection(
  db: Firestore,
): Promise<OrderCollection> {
  if (resolvedCollection) return resolvedCollection;

  const ordersProbe = await getDocs(
    query(collection(db, ORDERS_COLLECTION), limit(1)),
  );
  if (!ordersProbe.empty) {
    resolvedCollection = "orders";
    return "orders";
  }

  const commandesProbe = await getDocs(
    query(collection(db, COMMANDES_COLLECTION), limit(1)),
  );
  if (!commandesProbe.empty) {
    resolvedCollection = "commandes";
    return "commandes";
  }

  resolvedCollection = "orders";
  return "orders";
}

export async function getOrdersCount(
  db: Firestore = getFirebaseDb(),
): Promise<number> {
  const collectionName = await resolveOrdersCollection(db);
  const snapshot = await getCountFromServer(collection(db, collectionName));
  return snapshot.data().count;
}

export async function getOrdersPage(
  options: {
    cursorId?: string | null;
    pageSize?: number;
  } = {},
  db: Firestore = getFirebaseDb(),
): Promise<CursorPage<Order>> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const collectionName = await resolveOrdersCollection(db);
  const constraints = [
    orderBy(documentId()),
    limit(pageFetchLimit(pageSize)),
  ];

  if (options.cursorId) {
    constraints.splice(1, 0, startAfter(options.cursorId));
  }

  const snapshot = await getDocs(
    query(collection(db, collectionName), ...constraints),
  );
  const hasMore = snapshot.docs.length > pageSize;
  const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
  const items = pageDocs
    .map((docSnap) =>
      mapFirestoreOrder(
        docSnap.id,
        docSnap.data() as Record<string, unknown>,
        collectionName,
      ),
    )
    .sort((a, b) => orderTime(b) - orderTime(a));

  const last = pageDocs[pageDocs.length - 1];
  return {
    items,
    nextCursorId: hasMore && last ? last.id : null,
    hasMore,
  };
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

  const orderRef = doc(db, collectionName, docId);
  const snapshot = await getDoc(orderRef);
  const previousStatus =
    typeof snapshot.data()?.status === "string" ? snapshot.data()?.status : "";
  const userId =
    typeof snapshot.data()?.userId === "string" ? snapshot.data()?.userId : "";

  await updateDoc(orderRef, {
    status,
    updatedAt: serverTimestamp(),
  });

  if (status === "delivered" && previousStatus !== "delivered" && userId) {
    try {
      await awardDeliveryPoints(db, docId, userId);
    } catch {
      // Status is already saved; points can be retried by setting delivered again.
    }
  }
}

async function awardDeliveryPoints(
  db: Firestore,
  orderId: string,
  userId: string,
): Promise<void> {
  const eventRef = doc(db, "pointEvents", `order_delivered_${orderId}`);
  const existing = await getDoc(eventRef);
  if (existing.exists()) return;

  await setDoc(eventRef, {
    uid: userId,
    type: "order_delivered",
    sourceId: orderId,
    amount: DELIVERED_POINTS,
    createdAt: serverTimestamp(),
  });

  const patch = {
    points: increment(DELIVERED_POINTS),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, "users", userId), patch);
  await setDoc(doc(db, "publicProfiles", userId), patch, { merge: true });
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
