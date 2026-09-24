"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ListSearch } from "@/components/list-search";
import type { Order, OrderStatus } from "@/types/order";
import { orderStatusLabel } from "@/types/order";
import { formatPrice } from "@/lib/products";
import {
  formatDateTime,
  formatOptionalText,
  itemCount,
} from "@/lib/orders";
import { OrderDetailPanel } from "@/components/orders/order-detail-panel";
import { OrderStatusSelect } from "@/components/orders/order-status-select";

type OrderListProps = {
  orders: Order[];
  pageIndex: number;
  hasMore: boolean;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOrderUpdated?: (orderId: string, status: OrderStatus) => void;
};

export function OrderList({
  orders,
  pageIndex,
  hasMore,
  loading = false,
  onPrev,
  onNext,
  onOrderUpdated,
}: OrderListProps) {
  const [selected, setSelected] = useState<Order | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return orders;

    return orders.filter((order) => {
      const haystack = [
        order.id,
        order.fullName,
        order.phone,
        order.address,
        order.status,
        orderStatusLabel(order.status),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [orders, query]);

  useEffect(() => {
    if (!selected) return;
    const fresh = orders.find(
      (order) => order.id === selected.id || order.docId === selected.docId,
    );
    setSelected(fresh ?? null);
  }, [orders, selected?.id, selected?.docId]);

  useEffect(() => {
    setQuery("");
  }, [pageIndex]);

  return (
    <>
      <div className="mb-4">
        <ListSearch
          label="Filtrer les commandes de la page"
          value={query}
          onChange={setQuery}
          placeholder="Filtrer la page (n°, nom, téléphone)…"
          disabled={loading}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          {orders.length === 0
            ? "Aucune commande pour le moment."
            : "Aucune commande ne correspond au filtre sur cette page."}
        </p>
      ) : (
        <div
          className={`overflow-x-auto rounded-lg border border-border bg-surface ${
            loading ? "opacity-60" : ""
          }`}
        >
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-5 py-3.5 font-medium">Commande</th>
                <th className="px-5 py-3.5 font-medium">Client</th>
                <th className="px-5 py-3.5 font-medium">Date</th>
                <th className="px-5 py-3.5 font-medium">Articles</th>
                <th className="px-5 py-3.5 font-medium">Total</th>
                <th className="px-5 py-3.5 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const isSelected =
                  selected?.id === order.id || selected?.docId === order.docId;
                return (
                  <tr
                    key={order.docId}
                    tabIndex={0}
                    onClick={() => setSelected(order)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(order);
                      }
                    }}
                    className={`cursor-pointer border-b border-border last:border-0 transition-colors ${
                      isSelected ? "bg-brand/5" : "hover:bg-background/80"
                    }`}
                  >
                    <td className="px-5 py-4">
                      <p className="font-mono text-sm font-medium text-foreground">
                        {order.id}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatOptionalText(order.phone)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">
                        {formatOptionalText(order.fullName)}
                      </p>
                      <p className="mt-0.5 max-w-48 truncate text-xs text-muted">
                        {formatOptionalText(order.address)}
                      </p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-muted">
                      {formatDateTime(order.date ?? order.createdAt)}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-muted">
                      {itemCount(order)}
                    </td>
                    <td className="px-5 py-4 font-medium tabular-nums text-foreground">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-5 py-4">
                      <OrderStatusSelect
                        order={order}
                        onUpdated={(status) =>
                          onOrderUpdated?.(order.docId, status)
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-muted">
          Page{" "}
          <span className="font-medium text-foreground">{pageIndex + 1}</span>
          {" · "}
          <span className="font-medium text-foreground">{orders.length}</span>{" "}
          sur cette page
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={pageIndex <= 0 || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={16} strokeWidth={2} />
            Précédent
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasMore || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            Suivant
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <OrderDetailPanel
        order={selected}
        onClose={() => setSelected(null)}
        onStatusUpdated={(status) => {
          if (!selected) return;
          setSelected({ ...selected, status });
          onOrderUpdated?.(selected.docId, status);
        }}
      />
    </>
  );
}
