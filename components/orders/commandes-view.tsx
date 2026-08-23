"use client";

import { useEffect, useState } from "react";
import { OrderList } from "@/components/orders/order-list";
import { getOrders } from "@/lib/orders";
import type { Order, OrderStatus } from "@/types/order";

export function CommandesView() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getOrders()
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les commandes",
        );
        setOrders([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleOrderUpdated(orderId: string, status: OrderStatus) {
    setOrders((current) =>
      current
        ? current.map((order) =>
            order.id === orderId ? { ...order, status } : order,
          )
        : current,
    );
  }

  return (
    <div className="w-full px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Commandes
        </h1>
        <p className="mt-1 text-sm text-muted">
          {orders
            ? `${orders.length} commande${orders.length === 1 ? "" : "s"}`
            : "Chargement des commandes…"}
        </p>
      </header>

      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {orders ? (
        <OrderList orders={orders} onOrderUpdated={handleOrderUpdated} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-center gap-2 border-b border-border px-5 py-8 text-sm text-muted">
            <span
              className="size-4 animate-spin rounded-full border-2 border-border border-t-brand"
              aria-hidden
            />
            Chargement des commandes…
          </div>
        </div>
      )}
    </div>
  );
}
