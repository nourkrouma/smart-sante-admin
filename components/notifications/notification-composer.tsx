"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { Bell } from "lucide-react";
import { sendPushNotification } from "@/lib/send-push-notification";
import {
  ALL_USERS_TOPIC,
  type NotificationAudience,
} from "@/lib/notifications";
import { getUsers, userDisplayName } from "@/lib/users";
import type { AppUser } from "@/types/user";

export function NotificationComposer() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audience, setAudience] = useState<NotificationAudience>("all");
  const [userId, setUserId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    getUsers()
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setUsersError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les utilisateurs",
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const needle = userQuery.trim().toLowerCase();
    if (!needle) return users.slice(0, 20);

    return users
      .filter((user) => {
        const haystack = [user.id, user.fullName, user.email, user.phone]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
      .slice(0, 20);
  }, [users, userQuery]);

  const selectedUser = users.find((user) => user.id === userId) ?? null;
  const userOptions = useMemo(() => {
    if (!selectedUser) return filteredUsers;
    if (filteredUsers.some((user) => user.id === selectedUser.id)) {
      return filteredUsers;
    }
    return [selectedUser, ...filteredUsers];
  }, [filteredUsers, selectedUser]);

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
          audience,
          userId,
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
          Envoi via Firebase Cloud Messaging. L’application mobile doit
          s’abonner au sujet{" "}
          <code className="font-medium">{ALL_USERS_TOPIC}</code> et à{" "}
          <code className="font-medium">{`user_{uid}`}</code>.
        </p>
      </header>

      {usersError ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {usersError}
        </p>
      ) : null}

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
              disabled={isPending}
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
              disabled={isPending}
              rows={5}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              placeholder="Texte de la notification"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Image (optionnel)
            </span>
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              placeholder="https://…"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-muted">
              Audience
            </legend>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="audience"
                checked={audience === "all"}
                onChange={() => setAudience("all")}
                disabled={isPending}
                className="accent-brand"
              />
              Tous les utilisateurs
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="audience"
                checked={audience === "user"}
                onChange={() => setAudience("user")}
                disabled={isPending}
                className="accent-brand"
              />
              Un utilisateur
            </label>
          </fieldset>

          {audience === "user" ? (
            <div className="space-y-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted">
                  Rechercher un utilisateur
                </span>
                <input
                  type="search"
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
                  placeholder="Nom, e-mail, téléphone…"
                />
              </label>
              <select
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                required={audience === "user"}
                disabled={isPending}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
              >
                <option value="">Sélectionner…</option>
                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {userDisplayName(user)}
                    {user.email ? ` · ${user.email}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

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
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Bell size={16} strokeWidth={2} />
              {isPending ? "Envoi…" : "Envoyer"}
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
          </div>
          <p className="mt-3 text-xs text-muted">
            {audience === "all"
              ? `Destinataires : tous les utilisateurs (sujet ${ALL_USERS_TOPIC})`
              : selectedUser
                ? `Destinataire : ${userDisplayName(selectedUser)} (sujet user_${selectedUser.id})`
                : "Destinataire : un utilisateur à sélectionner"}
          </p>
        </aside>
      </div>
    </div>
  );
}
