"use client";

import {
  useCallback,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Bell, ImagePlus, Images, Loader2, X } from "lucide-react";
import {
  notificationImageErrorMessage,
  uploadNotificationImage,
} from "@/lib/notification-images";
import {
  NotificationImagePicker,
  NotificationRemoteImage,
} from "@/components/notifications/notification-image-picker";
import { sendPushNotification } from "@/lib/send-push-notification";
import { ALL_USERS_TOPIC } from "@/lib/notifications";

function previewImageSrc(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function NotificationComposer() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const busy = isPending || uploading;
  const previewSrc = previewImageSrc(imageUrl);

  async function handleImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setNotice(null);
    setUploading(true);
    try {
      const url = await uploadNotificationImage(file);
      setImageUrl(url);
    } catch (uploadError) {
      setError(
        notificationImageErrorMessage(
          uploadError,
          "Impossible d’envoyer l’image",
        ),
      );
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    startTransition(async () => {
      try {
        const result = await sendPushNotification({
          title,
          body,
          imageUrl,
        });
        setNotice(result.message);
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Impossible d’envoyer la notification",
        );
      }
    });
  }

  return (
    <div className="w-full px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted">
          Envoi via Firebase Cloud Messaging à tous les utilisateurs (sujet{" "}
          <code className="font-medium">{ALL_USERS_TOPIC}</code>).
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-border bg-surface p-5"
        >
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Titre
            </span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={80}
              disabled={busy}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              placeholder="Titre de la notification"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Message
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              maxLength={500}
              disabled={busy}
              rows={5}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              placeholder="Texte de la notification"
            />
          </label>

          <div className="space-y-1.5">
            <span
              id="notification-image-label"
              className="text-xs font-medium uppercase tracking-wide text-muted"
            >
              Image (optionnel)
            </span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                disabled={busy}
                aria-labelledby="notification-image-label"
                className="min-w-0 w-full flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
                placeholder="https://…"
              />
              <div className="flex shrink-0 gap-2">
                <label
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background ${
                    busy ? "pointer-events-none cursor-not-allowed opacity-60" : ""
                  }`}
                >
                  {uploading ? (
                    <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                  ) : (
                    <ImagePlus size={16} strokeWidth={2} />
                  )}
                  {uploading ? "Envoi…" : "Parcourir"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={busy}
                    onChange={handleImageFile}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Images size={16} strokeWidth={2} />
                  Choisir
                </button>
              </div>
            </div>
            <span className="block text-xs text-muted">
              Un nouvel envoi est limité à 5 Mo. Choisir réutilise une image du
              stockage ou d’un produit, sans la copier.
            </span>
            {previewSrc ? (
              <div className="relative mt-2 h-28 w-full overflow-hidden rounded-lg">
                <NotificationRemoteImage
                  src={previewSrc}
                  sizes="(max-width: 1024px) 100vw, 640px"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  disabled={busy}
                  className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-black disabled:opacity-60"
                >
                  <X size={12} strokeWidth={2} />
                  Retirer
                </button>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {notice ? (
            <p
              className="rounded-lg bg-background px-3 py-2 text-sm text-muted"
              role="status"
            >
              {notice}
            </p>
          ) : null}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Bell size={16} strokeWidth={2} />
              {isPending ? "Envoi…" : uploading ? "Image…" : "Envoyer"}
            </button>
          </div>
        </form>

        <aside className="rounded-lg border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Aperçu
          </p>
          <div className="mt-3 rounded-xl bg-black p-4 text-white shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand">
                <Bell size={16} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-white/60">
                  Smart Santé
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold">
                  {title.trim() || "Titre de la notification"}
                </p>
                <p className="mt-1 line-clamp-3 text-xs text-white/75">
                  {body.trim() || "Le message apparaîtra ici."}
                </p>
              </div>
            </div>
            {previewSrc ? (
              <div className="relative mt-3 h-32 w-full overflow-hidden rounded-lg">
                <NotificationRemoteImage src={previewSrc} sizes="352px" />
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-muted">
            Destinataires : tous les utilisateurs (sujet {ALL_USERS_TOPIC})
          </p>
        </aside>
      </div>

      <NotificationImagePicker
        open={pickerOpen}
        selectedUrl={imageUrl.trim()}
        onClose={closePicker}
        onSelect={(url) => {
          setImageUrl(url);
          setError(null);
          closePicker();
        }}
      />
    </div>
  );
}
