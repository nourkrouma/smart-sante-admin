"use client";

import { useCallback, useEffect, useState } from "react";
import { UserList } from "@/components/users/user-list";
import {
  getUsersCount,
  getUsersPage,
} from "@/lib/users";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-query";
import type { AppUser } from "@/types/user";

export function UsersView() {
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([null]);
  const [hasMore, setHasMore] = useState(false);

  const loadPage = useCallback(async (cursorId: string | null, index: number) => {
    setLoading(true);
    setError(null);
    try {
      const page = await getUsersPage({
        cursorId,
        pageSize: DEFAULT_PAGE_SIZE,
      });
      setUsers(page.items);
      setHasMore(page.hasMore);
      setPageIndex(index);
      setCursorStack((current) => {
        const next = current.slice(0, index + 1);
        next[index] = cursorId;
        if (page.nextCursorId) {
          next[index + 1] = page.nextCursorId;
        }
        return next;
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les utilisateurs",
      );
      setUsers([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getUsersCount()
      .then((count) => {
        if (!cancelled) setTotalCount(count);
      })
      .catch(() => {
        if (!cancelled) setTotalCount(null);
      });

    loadPage(null, 0);

    return () => {
      cancelled = true;
    };
  }, [loadPage]);

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

  function handlePrev() {
    if (pageIndex <= 0 || loading) return;
    const prevCursor = cursorStack[pageIndex - 1] ?? null;
    void loadPage(prevCursor, pageIndex - 1);
  }

  function handleNext() {
    if (!hasMore || loading) return;
    const nextCursor = cursorStack[pageIndex + 1];
    if (nextCursor == null) return;
    void loadPage(nextCursor, pageIndex + 1);
  }

  return (
    <div className="w-full px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Utilisateurs
        </h1>
        <p className="mt-1 text-sm text-muted">
          {totalCount != null
            ? `${totalCount} utilisateur${totalCount === 1 ? "" : "s"}`
            : users
              ? "Utilisateurs"
              : "Chargement des utilisateurs…"}
        </p>
      </header>

      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {users ? (
        <UserList
          users={users}
          pageIndex={pageIndex}
          hasMore={hasMore}
          loading={loading}
          onPrev={handlePrev}
          onNext={handleNext}
          onPointsUpdated={handlePointsUpdated}
        />
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
