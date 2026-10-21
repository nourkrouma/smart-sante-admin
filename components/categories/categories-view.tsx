"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { CategoryFormDialog } from "@/components/categories/category-form-dialog";
import { DeleteCategoryDialog } from "@/components/categories/delete-category-dialog";
import {
  createCategory,
  getCategories,
  moveCategory,
  sortCategories,
  updateCategory,
} from "@/lib/categories";
import { firestoreUserMessage } from "@/lib/firestore-errors";
import type { Category } from "@/types/category";

export function CategoriesView() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCategories()
      .then((loaded) => {
        if (!cancelled) setCategories(loaded);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          firestoreUserMessage(
            loadError,
            "Impossible de charger les catégories",
          ),
        );
        setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setFormOpen(true);
  }

  async function handleSubmit(input: { name: string; active: boolean }) {
    if (editing) {
      const saved = await updateCategory(editing.id, {
        name: input.name,
        active: input.active,
      });
      setCategories((current) =>
        current
          ? sortCategories(
              current.map((category) =>
                category.id === saved.id ? saved : category,
              ),
            )
          : current,
      );
      return;
    }

    const created = await createCategory(input);
    setCategories((current) =>
      current ? sortCategories([...current, created]) : [created],
    );
  }

  async function handleMove(category: Category, direction: "up" | "down") {
    setMovingId(category.id);
    setError(null);
    try {
      const next = await moveCategory(category.id, direction);
      setCategories(next);
    } catch (moveError) {
      setError(
        firestoreUserMessage(moveError, "Impossible de réordonner les catégories"),
      );
    } finally {
      setMovingId(null);
    }
  }

  const countLabel =
    categories === null
      ? "Chargement des catégories…"
      : `${categories.length} catégorie${categories.length === 1 ? "" : "s"}`;

  return (
    <div className="w-full px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Catégories
        </h1>
        <p className="mt-1 text-sm text-muted">{countLabel}</p>
      </header>

      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {categories === null ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-muted">
            <span
              className="size-4 animate-spin rounded-full border-2 border-border border-t-brand"
              aria-hidden
            />
            Chargement des catégories…
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
            >
              <Plus size={16} strokeWidth={2} />
              Ajouter une catégorie
            </button>
          </div>

          {categories.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              Aucune catégorie pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                    <th className="px-5 py-3.5 font-medium">Ordre</th>
                    <th className="px-5 py-3.5 font-medium">Catégorie</th>
                    <th className="px-5 py-3.5 font-medium">Visibilité</th>
                    <th className="px-5 py-3.5 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category, index) => {
                    const moving = movingId !== null;
                    return (
                      <tr
                        key={category.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMove(category, "up")}
                              disabled={moving || index === 0}
                              className="rounded-md p-1 text-muted transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`Monter ${category.name}`}
                            >
                              <ChevronUp size={16} strokeWidth={1.75} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMove(category, "down")}
                              disabled={moving || index === categories.length - 1}
                              className="rounded-md p-1 text-muted transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`Descendre ${category.name}`}
                            >
                              <ChevronDown size={16} strokeWidth={1.75} />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium text-foreground">
                          {category.name}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${
                              category.active
                                ? "bg-background text-foreground ring-border"
                                : "bg-background text-muted ring-border"
                            }`}
                          >
                            {category.active ? "Visible" : "Masquée"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(category)}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background"
                              aria-label={`Modifier ${category.name}`}
                            >
                              <Pencil size={14} strokeWidth={1.75} />
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(category)}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                              aria-label={`Supprimer ${category.name}`}
                            >
                              <Trash2 size={14} strokeWidth={1.75} />
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {formOpen ? (
        <CategoryFormDialog
          key={editing?.id ?? "new"}
          open
          category={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      {deleting ? (
        <DeleteCategoryDialog
          key={deleting.id}
          category={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(id) => {
            setCategories((current) =>
              current
                ? current.filter((category) => category.id !== id)
                : current,
            );
          }}
        />
      ) : null}
    </div>
  );
}
