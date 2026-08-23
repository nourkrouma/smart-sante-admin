"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import type { Order, OrderStatus } from "@/types/order";
import { formatPrice } from "@/lib/products";
import {
  formatDateTime,
  formatOptionalText,
  itemCount,
} from "@/lib/orders";
import { OrderThumb } from "@/components/orders/order-thumb";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderStatusPicker } from "@/components/orders/order-status-picker";

type OrderDetailPanelProps = {
  order: Order | null;
  onClose: () => void;
  onStatusUpdated?: (status: OrderStatus) => void;
};

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

export function OrderDetailPanel({
  order,
  onClose,
  onStatusUpdated,
}: OrderDetailPanelProps) {
  const open = order !== null;

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={order ? `Détails de ${order.id}` : "Détails de la commande"}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-surface shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Détails de la commande
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-background hover:text-foreground"
            aria-label="Fermer"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {order && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-lg font-semibold tracking-tight text-foreground">
                  {order.id}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {formatDateTime(order.date ?? order.createdAt)}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            <div className="mt-6 space-y-4">
              <DetailField label="Client">
                {formatOptionalText(order.fullName)}
              </DetailField>

              <DetailField label="Téléphone">
                {order.phone.trim() ? (
                  <a
                    href={`tel:${order.phone.trim()}`}
                    className="text-brand hover:underline"
                  >
                    {order.phone.trim()}
                  </a>
                ) : (
                  "—"
                )}
              </DetailField>

              <DetailField label="Adresse">
                {formatOptionalText(order.address)}
              </DetailField>

              <DetailField label="Service de livraison">
                {formatOptionalText(order.deliveryService)}
              </DetailField>

              <DetailField label="Notes">
                {formatOptionalText(order.notes)}
              </DetailField>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Articles ({itemCount(order)})
              </p>
              {order.items.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Aucun article</p>
              ) : (
                <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg ring-1 ring-border">
                  {order.items.map((item, index) => (
                    <li
                      key={`${order.id}-item-${item.productId || index}`}
                      className="flex gap-3 bg-surface p-3"
                    >
                      <div className="size-14 shrink-0 overflow-hidden rounded-md">
                        <OrderThumb
                          src={item.imageUrl}
                          alt={item.name || "Produit"}
                          className="size-14"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {formatOptionalText(item.name)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          Taille {formatOptionalText(item.selectedSize)}
                          {" · "}
                          Couleur {formatOptionalText(item.selectedColor)}
                        </p>
                        <p className="mt-1 text-xs tabular-nums text-muted">
                          {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <dl className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Sous-total</dt>
                <dd className="tabular-nums text-foreground">
                  {formatPrice(order.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Livraison</dt>
                <dd className="tabular-nums text-foreground">
                  {formatPrice(order.shippingFee)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 text-base font-semibold">
                <dt className="text-foreground">Total</dt>
                <dd className="tabular-nums text-brand">
                  {formatPrice(order.total)}
                </dd>
              </div>
            </dl>

            <div className="mt-6 space-y-3 border-t border-border pt-4">
              <DetailField label="Créée le">
                {formatDateTime(order.createdAt)}
              </DetailField>
              <DetailField label="Mise à jour">
                {formatDateTime(order.updatedAt)}
              </DetailField>
              <DetailField label="ID utilisateur">
                <span className="break-all font-mono text-xs">
                  {formatOptionalText(order.userId)}
                </span>
              </DetailField>
            </div>
          </div>

            <div className="border-t border-border px-5 py-4">
              <OrderStatusPicker order={order} onUpdated={onStatusUpdated} />
            </div>
          </>
        )}
      </aside>
    </>
  );
}
