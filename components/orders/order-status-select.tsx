"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { updateOrderStatus } from "@/lib/orders";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  isOrderStatus,
  orderStatusLabel,
  type Order,
  type OrderStatus,
} from "@/types/order";

type OrderStatusSelectProps = {
  order: Order;
  onUpdated?: (status: OrderStatus) => void;
};

function selectClass(status: string): string {
  const key = status.trim().toLowerCase();
  const palette =
    key === "delivered"
      ? "bg-emerald-50 text-emerald-800"
      : key === "cancelled" || key === "canceled"
        ? "bg-red-50 text-red-800"
        : key === "delivery"
          ? "bg-violet-50 text-violet-800"
          : key === "confirmed"
            ? "bg-blue-50 text-blue-800"
            : key === "ordered"
              ? "bg-amber-50 text-amber-800"
              : "bg-background text-foreground";

  return `max-w-40 cursor-pointer rounded-full border-0 py-1 pr-7 pl-2.5 text-xs font-medium outline-none ring-1 ring-inset focus:ring-2 focus:ring-brand disabled:cursor-wait disabled:opacity-60 ${
    key === "delivered"
      ? "ring-emerald-200"
      : key === "cancelled" || key === "canceled"
        ? "ring-red-200"
        : key === "delivery"
          ? "ring-violet-200"
          : key === "confirmed"
            ? "ring-blue-200"
            : key === "ordered"
              ? "ring-amber-200"
              : "ring-border"
  } ${palette}`;
}

export function OrderStatusSelect({
  order,
  onUpdated,
}: OrderStatusSelectProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const knownStatus = isOrderStatus(order.status);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    event.stopPropagation();
    const next = event.target.value;
    if (!isOrderStatus(next) || next === order.status || isPending) return;
    setError(null);

    startTransition(async () => {
      try {
        await updateOrderStatus(order.docId, next, order.collection);
        onUpdated?.(next);
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
    <div
      className="min-w-0"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <select
        aria-label={`Statut de ${order.id}`}
        value={knownStatus ? order.status : ""}
        disabled={isPending}
        onChange={handleChange}
        className={selectClass(order.status)}
      >
        {knownStatus ? null : (
          <option value="" disabled>
            {orderStatusLabel(order.status)}
          </option>
        )}
        {ORDER_STATUSES.map((status) => (
          <option key={status} value={status}>
            {ORDER_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 max-w-40 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
