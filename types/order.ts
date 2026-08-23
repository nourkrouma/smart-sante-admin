export type OrderItem = {
  imageUrl: string;
  name: string;
  price: number;
  productId: string;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
};

export const ORDER_STATUSES = [
  "ordered",
  "confirmed",
  "delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  ordered: "Commandée",
  confirmed: "Confirmée",
  delivery: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function orderStatusLabel(status: string): string {
  return isOrderStatus(status)
    ? ORDER_STATUS_LABELS[status]
    : status.trim() || "—";
}

export type OrderCollection = "orders" | "commandes";

export type Order = {
  id: string;
  docId: string;
  collection: OrderCollection;
  address: string;
  createdAt: string | null;
  date: string | null;
  deliveryService: string;
  fullName: string;
  items: OrderItem[];
  notes: string;
  phone: string;
  shippingFee: number;
  status: string;
  subtotal: number;
  total: number;
  updatedAt: string | null;
  userId: string;
};
