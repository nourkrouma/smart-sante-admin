"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";

type TagInputProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function TagInput({
  label,
  values,
  onChange,
  placeholder = "Ajouter une valeur",
  disabled = false,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const next = draft.trim();
    if (!next) return;

    const exists = values.some(
      (value) => value.toLowerCase() === next.toLowerCase(),
    );
    if (exists) {
      setDraft("");
      return;
    }

    onChange([...values, next]);
    setDraft("");
  }

  function removeTag(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value, index) => (
            <span
              key={`${value}-${index}`}
              className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs font-medium text-foreground ring-1 ring-border"
            >
              {value}
              <button
                type="button"
                onClick={() => removeTag(index)}
                disabled={disabled}
                className="rounded p-0.5 text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
                aria-label={`Retirer ${value}`}
              >
                <X size={12} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={addTag}
          disabled={disabled || !draft.trim()}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} strokeWidth={2} />
          Ajouter
        </button>
      </div>
    </div>
  );
}
