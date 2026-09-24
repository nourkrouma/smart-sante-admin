"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ListSearch } from "@/components/list-search";
import { UserDetailPanel } from "@/components/users/user-detail-panel";
import { EditPointsDialog } from "@/components/users/edit-points-dialog";
import { formatOptionalText } from "@/lib/orders";
import { formatPoints, userDisplayName } from "@/lib/users";
import type { AppUser } from "@/types/user";

type UserListProps = {
  users: AppUser[];
  pageIndex: number;
  hasMore: boolean;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPointsUpdated: (userId: string, points: number) => void;
};

export function UserList({
  users,
  pageIndex,
  hasMore,
  loading = false,
  onPrev,
  onNext,
  onPointsUpdated,
}: UserListProps) {
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;

    return users.filter((user) => {
      const haystack = [user.id, user.fullName, user.email, user.phone]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [users, query]);

  useEffect(() => {
    if (!selected) return;
    const fresh = users.find((user) => user.id === selected.id);
    setSelected(fresh ?? null);
  }, [users, selected?.id]);

  useEffect(() => {
    setQuery("");
  }, [pageIndex]);

  return (
    <>
      <div className="mb-4">
        <ListSearch
          label="Filtrer les utilisateurs de la page"
          value={query}
          onChange={setQuery}
          placeholder="Filtrer la page (nom, e-mail, téléphone)…"
          disabled={loading}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          {users.length === 0
            ? "Aucun utilisateur pour le moment."
            : "Aucun utilisateur ne correspond au filtre sur cette page."}
        </p>
      ) : (
        <div
          className={`overflow-x-auto rounded-lg border border-border bg-surface ${
            loading ? "opacity-60" : ""
          }`}
        >
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-5 py-3.5 font-medium">Nom</th>
                <th className="px-5 py-3.5 font-medium">E-mail</th>
                <th className="px-5 py-3.5 font-medium">Téléphone</th>
                <th className="px-5 py-3.5 font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isSelected = selected?.id === user.id;
                return (
                  <tr
                    key={user.id}
                    tabIndex={0}
                    onClick={() => setSelected(user)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(user);
                      }
                    }}
                    className={`cursor-pointer border-b border-border last:border-0 transition-colors ${
                      isSelected ? "bg-brand/5" : "hover:bg-background/80"
                    }`}
                  >
                    <td className="px-5 py-4 font-medium text-foreground">
                      {userDisplayName(user)}
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {formatOptionalText(user.email)}
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {formatOptionalText(user.phone)}
                    </td>
                    <td className="px-5 py-4 font-medium tabular-nums text-foreground">
                      {formatPoints(user.points)}
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
          <span className="font-medium text-foreground">{users.length}</span>{" "}
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

      <UserDetailPanel
        user={selected}
        onClose={() => setSelected(null)}
        onEditPoints={setEditing}
        suppressEscape={editing !== null}
      />

      <EditPointsDialog
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={(points) => {
          if (!editing) return;
          onPointsUpdated(editing.id, points);
        }}
      />
    </>
  );
}
