"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  productImageErrorMessage,
  startProductImageUpload,
} from "@/lib/product-images";

type ProductImageFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

type UploadStatus = {
  name: string;
  percent: number;
  index: number;
  total: number;
};

function imageLines(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function appendUrl(value: string, url: string): string {
  const lines = imageLines(value);
  if (lines.includes(url)) return lines.join("\n");
  return [...lines, url].join("\n");
}

function removeUrl(value: string, url: string): string {
  let removed = false;
  return imageLines(value)
    .filter((line) => {
      if (!removed && line === url) {
        removed = true;
        return false;
      }
      return true;
    })
    .join("\n");
}

export function ProductImageField({
  value,
  onChange,
  disabled = false,
  onBusyChange,
}: ProductImageFieldProps) {
  const [status, setStatus] = useState<UploadStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const valueRef = useRef(value);
  const cancelRef = useRef<(() => void) | null>(null);
  const stopRef = useRef(false);
  const onBusyChangeRef = useRef(onBusyChange);

  useEffect(() => {
    valueRef.current = value;
    onBusyChangeRef.current = onBusyChange;
  });

  function setUploadStatus(next: UploadStatus | null) {
    setStatus(next);
    onBusyChangeRef.current?.(next !== null);
  }

  useEffect(() => {
    return () => {
      stopRef.current = true;
      cancelRef.current?.();
      onBusyChangeRef.current?.(false);
    };
  }, []);

  function cancelUpload() {
    stopRef.current = true;
    cancelRef.current?.();
    cancelRef.current = null;
    setUploadStatus(null);
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0 || status !== null) return;

    setError(null);
    stopRef.current = false;

    for (let index = 0; index < files.length; index += 1) {
      if (stopRef.current) return;
      const file = files[index];
      setUploadStatus({
        name: file.name,
        percent: 0,
        index: index + 1,
        total: files.length,
      });

      try {
        const upload = startProductImageUpload(file, (percent) => {
          if (stopRef.current) return;
          setUploadStatus({
            name: file.name,
            percent,
            index: index + 1,
            total: files.length,
          });
        });
        cancelRef.current = upload.cancel;
        const url = await upload.done;
        cancelRef.current = null;
        if (stopRef.current) return;
        onChange(appendUrl(valueRef.current, url));
      } catch (uploadError) {
        cancelRef.current = null;
        if (stopRef.current) return;
        const code =
          uploadError &&
          typeof uploadError === "object" &&
          "code" in uploadError
            ? String((uploadError as { code: unknown }).code)
            : "";
        if (code.includes("storage/canceled")) return;
        setError(
          productImageErrorMessage(
            uploadError,
            "Impossible d’envoyer l’image",
          ),
        );
        break;
      }
    }

    if (!stopRef.current) setUploadStatus(null);
  }

  const images = imageLines(value);
  const uploading = status !== null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span
          id="product-images-label"
          className="text-xs font-medium uppercase tracking-wide text-muted"
        >
          Images
        </span>
        <label
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background ${
            disabled || uploading
              ? "pointer-events-none cursor-not-allowed opacity-60"
              : ""
          }`}
        >
          {uploading ? (
            <Loader2 size={14} strokeWidth={2} className="animate-spin" />
          ) : (
            <ImagePlus size={14} strokeWidth={2} />
          )}
          Importer
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(event) => {
              void handleFiles(event);
            }}
          />
        </label>
      </div>

      {images.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2">
          {images.map((src, index) => (
            <li key={`${src}-${index}`} className="relative">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-background ring-1 ring-border">
                {isHttpUrl(src) ? (
                  <ImagePreview src={src} />
                ) : (
                  <span className="flex size-full items-center justify-center px-1 text-center text-[10px] text-muted">
                    Lien invalide
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onChange(removeUrl(value, src))}
                disabled={disabled}
                className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black disabled:opacity-50"
                aria-label={`Retirer l’image ${index + 1}`}
              >
                <X size={12} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
          Aucune image. Importez un fichier ou collez un lien.
        </p>
      )}

      {status ? (
        <div className="space-y-1.5 rounded-lg bg-background px-3 py-2">
          <div className="flex items-center justify-between gap-3 text-xs text-foreground">
            <span className="min-w-0 truncate">
              {status.total > 1
                ? `Image ${status.index} sur ${status.total} · ${status.name}`
                : status.name}
            </span>
            <span className="shrink-0 font-medium tabular-nums">
              {status.percent} %
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={status.percent}
            aria-label={`Envoi de ${status.name}`}
            className="h-1.5 overflow-hidden rounded-full bg-border"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-150"
              style={{ width: `${status.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Envoi en cours. Le lien sera collé dans le champ dès qu’il est prêt.
            </p>
            <button
              type="button"
              onClick={cancelUpload}
              className="shrink-0 text-xs font-medium text-foreground underline-offset-2 hover:underline"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={3}
        spellCheck={false}
        autoCapitalize="off"
        aria-labelledby="product-images-label"
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
        placeholder={"https://…\nUn lien par ligne"}
      />
      <p className="text-xs text-muted">
        Importez une image (JPEG, PNG, WebP ou GIF, moins de 5 Mo) ou collez un
        lien. L’envoi la place dans Firebase Storage, puis ajoute le lien ici.
      </p>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ImagePreview({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="flex size-full items-center justify-center px-1 text-center text-[10px] text-muted">
        Aperçu indisponible
      </span>
    );
  }

  return (
    // Product URLs are not limited to the next/image host allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      decoding="async"
      className="size-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
