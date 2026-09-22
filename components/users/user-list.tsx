"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ListSearch } from "@/components/list-search";
import { UserDetailPanel } from "@/components/users/user-detail-panel";
import { EditPointsDialog } from "@/components/users/edit-points-dialog";
import { formatOptionalText } from "@/lib/orders";
import { formatPoints, userDisplayName } from "@/lib/users";
import type { AppUser } from "@/types/user";

const PAGE_SIZE = 10;

type UserListProps = {
  users: AppUser[];
  onPointsUpdated: (userId: string, points: number) => void;
};

export function UserList({ users, onPointsUpdated }: UserListProps) {
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [page, setPage] = useState(1);
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageUsers = filtered.slice(startIndex, startIndex + PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + PAGE_SIZE, filtered.length);

  useEffect(() => {
    if (!selected) return;
    const fresh = users.find((user) => user.id === selected.id);
    setSelected(fresh ?? null);
  }, [users, selected?.id]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  return (
    <>
      <div className="mb-4">
        <ListSearch
          label="Rechercher des utilisateurs"
          value={query}
          onChange={setQuery}
          placeholder="Rechercher par nom, e-mail, téléphone…"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          {users.length === 0
            ? "Aucun utilisateur pour le moment."
            : "Aucun utilisateur ne correspond à votre recherche."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
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
                {pageUsers.map((user) => {
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

          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-muted">
              Affichage{" "}
              <span className="font-medium text-foreground">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              sur{" "}
              <span className="font-medium text-foreground">
                {filtered.length}
              </span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} strokeWidth={2} />
                Précédent
              </button>
              <span className="min-w-24 text-center text-sm tabular-nums text-muted">
                Page {safePage} sur {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suivant
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        </>
      )}

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
