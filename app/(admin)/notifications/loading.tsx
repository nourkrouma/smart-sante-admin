export default function NotificationsLoading() {
  return (
    <div className="w-full px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded-md bg-border/70" />
        <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded-md bg-border/50" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded bg-border/50" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-border/40" />
            </div>
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-lg border border-border bg-surface" />
      </div>
    </div>
  );
}
