"use client";

import { useEffect, type ReactNode } from "react";
import { Pencil, X } from "lucide-react";
import { formatDateTime } from "@/lib/orders";
import { formatPoints, userDisplayName } from "@/lib/users";
import type { AppUser } from "@/types/user";

type UserDetailPanelProps = {
  user: AppUser | null;
  onClose: () => void;
  onEditPoints: (user: AppUser) => void;
  suppressEscape?: boolean;
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

export function UserDetailPanel({
  user,
  onClose,
  onEditPoints,
  suppressEscape = false,
}: UserDetailPanelProps) {
  const open = user !== null;

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !suppressEscape) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, suppressEscape]);

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
        aria-label={
          user ? `Détails de ${userDisplayName(user)}` : "Détails de l’utilisateur"
        }
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Détails de l’utilisateur
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

        {user ? (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <p className="text-lg font-semibold tracking-tight text-foreground">
                {userDisplayName(user)}
              </p>
              <p className="mt-1 font-mono text-xs break-all text-muted">
                {user.id}
              </p>

              <div className="mt-6 space-y-4">
                <DetailField label="E-mail">
                  {user.email.trim() ? (
                    <a
                      href={`mailto:${user.email.trim()}`}
                      className="text-brand hover:underline"
                    >
                      {user.email.trim()}
                    </a>
                  ) : (
                    "—"
                  )}
                </DetailField>

                <DetailField label="Téléphone">
                  {user.phone.trim() ? (
                    <a
                      href={`tel:${user.phone.trim()}`}
                      className="text-brand hover:underline"
                    >
                      {user.phone.trim()}
                    </a>
                  ) : (
                    "—"
                  )}
                </DetailField>

                <DetailField label="Points">
                  <span className="text-base font-semibold tabular-nums text-brand">
                    {formatPoints(user.points)}
                  </span>
                </DetailField>
              </div>

              <div className="mt-6 space-y-3 border-t border-border pt-4">
                <DetailField label="Créé le">
                  {formatDateTime(user.createdAt)}
                </DetailField>
                <DetailField label="Mise à jour">
                  {formatDateTime(user.updatedAt)}
                </DetailField>
              </div>
            </div>

            <div className="border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => onEditPoints(user)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
              >
                <Pencil size={16} strokeWidth={2} />
                Modifier les points
              </button>
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}
