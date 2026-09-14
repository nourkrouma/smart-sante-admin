"use client";

import { useEffect, useState } from "react";
import { UserList } from "@/components/users/user-list";
import { getUsers } from "@/lib/users";
import type { AppUser } from "@/types/user";

export function UsersView() {
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getUsers()
      .then((loadedUsers) => {
        if (!cancelled) setUsers(loadedUsers);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les utilisateurs",
        );
        setUsers([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handlePointsUpdated(userId: string, points: number) {
    setUsers((current) =>
      current
        ? current.map((user) =>
            user.id === userId
              ? { ...user, points, updatedAt: new Date().toISOString() }
              : user,
          )
        : current,
    );
  }

  return (
    <div className="w-full px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Utilisateurs
        </h1>
        <p className="mt-1 text-sm text-muted">
          {users
            ? `${users.length} utilisateur${users.length === 1 ? "" : "s"}`
            : "Chargement des utilisateurs…"}
        </p>
      </header>

      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {users ? (
        <UserList users={users} onPointsUpdated={handlePointsUpdated} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-center gap-2 border-b border-border px-5 py-8 text-sm text-muted">
            <span
              className="size-4 animate-spin rounded-full border-2 border-border border-t-brand"
              aria-hidden
            />
            Chargement des utilisateurs…
          </div>
        </div>
      )}
    </div>
  );
}
