"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/lib/orders";
import {
  ORDER_STATUS_LABELS,
  type Order,
  type OrderStatus,
} from "@/types/order";

type OrderStatusPickerProps = {
  order: Order;
  onUpdated?: (status: OrderStatus) => void;
};

const FLOW_STATUSES: OrderStatus[] = [
  "ordered",
  "confirmed",
  "delivery",
  "delivered",
];

function statusButtonClass(status: OrderStatus, current: boolean): string {
  const base =
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

  if (status === "cancelled") {
    return `${base} ${
      current
        ? "bg-red-700 text-white"
        : "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
    }`;
  }

  return `${base} ${
    current
      ? "bg-brand text-white"
      : "border border-border bg-surface text-foreground hover:bg-background"
  }`;
}

export function OrderStatusPicker({
  order,
  onUpdated,
}: OrderStatusPickerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setStatus(status: OrderStatus) {
    if (status === order.status || isPending) return;
    setError(null);

    startTransition(async () => {
      try {
        await updateOrderStatus(order.docId, status, order.collection);
        onUpdated?.(status);
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Impossible de mettre à jour le statut",
        );
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Modifier le statut
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FLOW_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatus(status)}
            disabled={isPending}
            aria-pressed={order.status === status}
            className={statusButtonClass(status, order.status === status)}
          >
            {ORDER_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setStatus("cancelled")}
        disabled={isPending}
        aria-pressed={order.status === "cancelled"}
        className={`w-full ${statusButtonClass("cancelled", order.status === "cancelled")}`}
      >
        {ORDER_STATUS_LABELS.cancelled}
      </button>
      {isPending ? (
        <p className="text-xs text-muted">Mise à jour du statut…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
