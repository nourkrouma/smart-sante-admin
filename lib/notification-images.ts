import { getDownloadURL, list, ref, uploadBytes } from "firebase/storage";
import { getFirebaseAuth, getFirebaseStorage } from "@/lib/firebase";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const LIBRARY_PAGE_SIZE = 24;
const NOTIFICATIONS_PREFIX = "notifications";

const PREVIEW_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "4oey1j8tyx.ufs.sh",
  "foorweb-backend.sfo3.digitaloceanspaces.com",
]);

export type StoredImage = {
  name: string;
  url: string;
};

export type StoredImageList = {
  items: StoredImage[];
  hasMore: boolean;
};

type LibraryState = {
  items: StoredImage[];
  nextPageToken: string | null;
};

let libraryGeneration = 0;
let libraryState: LibraryState | null = null;
let libraryInflight: Promise<StoredImageList> | null = null;
let libraryInflightKey = "";

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function notificationImageErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  if (
    code.includes("storage/unauthorized") ||
    code.includes("storage/unauthenticated") ||
    code.includes("permission-denied")
  ) {
    return "Permissions insuffisantes pour les images. Vérifiez les règles Storage et le rôle admin.";
  }

  return error instanceof Error ? error.message : fallback;
}

export async function uploadNotificationImage(file: File): Promise<string> {
  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) {
    throw new Error("Choisissez une image JPEG, PNG, WebP ou GIF");
  }

  if (file.size <= 0 || file.size >= MAX_IMAGE_BYTES) {
    throw new Error("L’image doit faire moins de 5 Mo");
  }

  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Session expirée. Reconnectez-vous.");
  }

  const imageRef = ref(
    getFirebaseStorage(),
    `notifications/${crypto.randomUUID()}.${extension}`,
  );

  await uploadBytes(imageRef, file, {
    contentType: file.type,
    cacheControl: "public, max-age=31536000",
  });

  invalidateNotificationLibrary();
  return getDownloadURL(imageRef);
}

function hasImageExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif")
  );
}

function toStoredImageList(state: LibraryState): StoredImageList {
  return {
    items: state.items,
    hasMore: state.nextPageToken !== null,
  };
}

export function invalidateNotificationLibrary(): void {
  libraryGeneration += 1;
  libraryState = null;
  libraryInflight = null;
  libraryInflightKey = "";
}

export function peekNotificationLibrary(): StoredImageList | null {
  return libraryState ? toStoredImageList(libraryState) : null;
}

/** Hosts allowed by next/image. Other https URLs still preview through a plain img. */
export function notificationPreviewSrc(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !PREVIEW_HOSTS.has(url.hostname)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchLibraryPage(pageToken: string | null): Promise<LibraryState> {
  const result = await list(ref(getFirebaseStorage(), NOTIFICATIONS_PREFIX), {
    maxResults: LIBRARY_PAGE_SIZE,
    ...(pageToken ? { pageToken } : {}),
  });

  const settled = await Promise.allSettled(
    result.items.map(async (item) => {
      if (!hasImageExtension(item.name)) return null;
      return { name: item.name, url: await getDownloadURL(item) };
    }),
  );

  const items: StoredImage[] = [];
  for (const entry of settled) {
    if (entry.status === "fulfilled" && entry.value) {
      items.push(entry.value);
    }
  }

  return {
    items,
    nextPageToken: result.nextPageToken ?? null,
  };
}

/**
 * Lists `notifications/` one page at a time and remembers the pages for this
 * browser session. Reopening the picker does not list the bucket again.
 * A failed refresh keeps the previous page.
 */
export async function loadNotificationLibrary(options?: {
  refresh?: boolean;
  more?: boolean;
}): Promise<StoredImageList> {
  const refresh = options?.refresh === true;
  const more = options?.more === true;

  if (!refresh && !more && libraryState) {
    return toStoredImageList(libraryState);
  }

  if (more && (!libraryState || !libraryState.nextPageToken)) {
    return libraryState
      ? toStoredImageList(libraryState)
      : { items: [], hasMore: false };
  }

  const pageToken = more ? libraryState?.nextPageToken ?? null : null;
  const key = `${libraryGeneration}:${refresh ? "refresh" : "page"}:${pageToken ?? ""}`;
  if (libraryInflight && libraryInflightKey === key) {
    return libraryInflight;
  }

  const generation = libraryGeneration;
  const previous = libraryState;
  libraryInflightKey = key;
  libraryInflight = (async () => {
    const page = await fetchLibraryPage(pageToken);
    if (generation !== libraryGeneration) {
      return libraryState
        ? toStoredImageList(libraryState)
        : { items: [], hasMore: false };
    }

    if (more && previous && pageToken) {
      const seen = new Set(previous.items.map((item) => item.url));
      libraryState = {
        items: [
          ...previous.items,
          ...page.items.filter((item) => !seen.has(item.url)),
        ],
        nextPageToken: page.nextPageToken,
      };
    } else {
      libraryState = page;
    }

    return toStoredImageList(libraryState);
  })().finally(() => {
    if (libraryInflightKey === key) {
      libraryInflight = null;
      libraryInflightKey = "";
    }
  });

  return libraryInflight;
}
