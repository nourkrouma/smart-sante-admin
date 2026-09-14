"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Pipette, Plus, X } from "lucide-react";
import type { ProductColor } from "@/types/product";
import { createProductColor, normalizeHexColor } from "@/lib/colors";

type ColorInputProps = {
  label: string;
  values: ProductColor[];
  onChange: (values: ProductColor[]) => void;
  disabled?: boolean;
};

const DEFAULT_HEX = "#000000";

export function ColorInput({
  label,
  values,
  onChange,
  disabled = false,
}: ColorInputProps) {
  const [draft, setDraft] = useState("");
  const [pendingHex, setPendingHex] = useState<string | null>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  function addColorValue(color: ProductColor) {
    const exists = valuesRef.current.some(
      (item) =>
        item.type === color.type &&
        item.value.toLowerCase() === color.value.toLowerCase(),
    );

    if (!exists) {
      onChange([...valuesRef.current, color]);
    }
  }

  function addDraftColor(typeHint?: ProductColor["type"]) {
    const color = createProductColor(draft, typeHint);
    if (!color) return;
    addColorValue(color);
    setDraft("");
    setPendingHex(null);
  }

  function confirmPendingHex() {
    if (!pendingHex) return;
    const color = createProductColor(pendingHex, "hex");
    if (!color) return;
    addColorValue(color);
    setDraft("");
    setPendingHex(null);
  }

  function cancelPendingHex() {
    setPendingHex(null);
  }

  function removeColor(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addDraftColor();
    }
  }

  function openPicker() {
    colorPickerRef.current?.click();
  }

  useEffect(() => {
    const input = colorPickerRef.current;
    if (!input) return;

    function previewHex(event: Event) {
      const target = event.currentTarget;
      if (!(target instanceof HTMLInputElement)) return;
      const hex = normalizeHexColor(target.value);
      if (hex) setPendingHex(hex);
    }

    input.addEventListener("input", previewHex);
    input.addEventListener("change", previewHex);

    return () => {
      input.removeEventListener("input", previewHex);
      input.removeEventListener("change", previewHex);
    };
  }, []);

  const pickerValue = pendingHex ?? normalizeHexColor(draft) ?? DEFAULT_HEX;

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((color, index) => (
            <span
              key={`${color.type}-${color.value}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-1 text-xs font-medium text-foreground ring-1 ring-border"
            >
              {color.type === "hex" ? (
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: color.value }}
                />
              ) : null}
              {color.value}
              <button
                type="button"
                onClick={() => removeColor(index)}
                disabled={disabled}
                className="rounded p-0.5 text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
                aria-label={`Retirer ${color.value}`}
              >
                <X size={12} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setPendingHex(null);
            }}
            onKeyDown={onKeyDown}
            disabled={disabled}
            className="w-full rounded-lg border border-border bg-background py-2 pl-3 pr-10 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
            placeholder="Nom ou #hex"
          />
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled}
            className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted transition-colors hover:text-foreground disabled:opacity-50"
            aria-label="Choisir une couleur"
          >
            <span
              aria-hidden
              className="mr-1 size-3 rounded-full ring-1 ring-border"
              style={{ backgroundColor: pickerValue }}
            />
            <Pipette size={16} strokeWidth={1.75} />
          </button>
          <input
            ref={colorPickerRef}
            type="color"
            value={pickerValue}
            disabled={disabled}
            className="pointer-events-none absolute size-0 opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        </div>
        <button
          type="button"
          onClick={() => addDraftColor()}
          disabled={disabled || !draft.trim()}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} strokeWidth={2} />
          Ajouter
        </button>
      </div>

      {pendingHex ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <span
            aria-hidden
            className="size-6 shrink-0 rounded-md ring-1 ring-border"
            style={{ backgroundColor: pendingHex }}
          />
          <p className="min-w-0 flex-1 text-sm text-foreground">
            <span className="font-mono font-medium">{pendingHex}</span>
            <span className="ml-2 text-xs text-muted">
              Confirmez pour ajouter cette couleur
            </span>
          </p>
          <button
            type="button"
            onClick={cancelPendingHex}
            disabled={disabled}
            className="rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={confirmPendingHex}
            disabled={disabled}
            className="rounded-lg bg-brand px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-black disabled:opacity-50"
          >
            Confirmer
          </button>
        </div>
      ) : null}
    </div>
  );
}
