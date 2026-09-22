export default function FormulairesLoading() {
  return (
    <div className="w-full px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-6">
        <div className="h-8 w-44 animate-pulse rounded-md bg-border/70" />
        <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded-md bg-border/50" />
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <div className="h-32 animate-pulse rounded-xl bg-border/40" />
        <div className="h-32 animate-pulse rounded-xl bg-border/30" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-muted">
          <span
            className="size-4 animate-spin rounded-full border-2 border-border border-t-brand"
            aria-hidden
          />
          Chargement des formulaires…
        </div>
      </div>
    </div>
  );
}
