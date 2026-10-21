export default function CategoriesLoading() {
  return (
    <div className="w-full px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <div className="h-8 w-40 animate-pulse rounded-md bg-border/70" />
        <div className="mt-2 h-4 w-28 animate-pulse rounded-md bg-border/50" />
      </header>

      <div className="mb-4 flex justify-end">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-border/70" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-center gap-2 border-b border-border px-5 py-8 text-sm text-muted">
          <span
            className="size-4 animate-spin rounded-full border-2 border-border border-t-brand"
            aria-hidden
          />
          Chargement des catégories…
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-4">
              <div className="h-8 w-16 animate-pulse rounded-md bg-border/50" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/5 max-w-56 animate-pulse rounded bg-border/60" />
                <div className="h-3 w-1/4 max-w-40 animate-pulse rounded bg-border/40" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-md bg-border/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
