"use client";

import { Search } from "lucide-react";
import type { FormEvent } from "react";

type ListSearchProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  /** When set, shows a submit button and calls this on Enter / button press. */
  onSubmit?: (value: string) => void;
  submitLabel?: string;
};

export function ListSearch({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  onSubmit,
  submitLabel = "Rechercher",
}: ListSearchProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit?.(value);
  }

  const field = (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <Search
        size={16}
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-border bg-surface py-2 pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
      />
    </label>
  );

  if (!onSubmit) {
    return field;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center"
    >
      {field}
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Search size={16} strokeWidth={2} />
        {submitLabel}
      </button>
    </form>
  );
}
