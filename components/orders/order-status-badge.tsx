"use client";

import { orderStatusLabel } from "@/types/order";

type OrderStatusBadgeProps = {
  status: string;
};

function statusClass(status: string): string {
  const key = status.trim().toLowerCase();

  switch (key) {
    case "delivered":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "cancelled":
    case "canceled":
      return "bg-red-50 text-red-800 ring-red-200";
    case "delivery":
      return "bg-violet-50 text-violet-800 ring-violet-200";
    case "confirmed":
      return "bg-blue-50 text-blue-800 ring-blue-200";
    case "ordered":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    default:
      return key
        ? "bg-background text-foreground ring-border"
        : "bg-background text-muted ring-border";
  }
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass(status)}`}
    >
      {orderStatusLabel(status)}
    </span>
  );
}
