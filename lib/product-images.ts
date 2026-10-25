import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { getFirebaseAuth, getFirebaseStorage } from "@/lib/firebase";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function productImageErrorMessage(
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
    return "Permissions insuffisantes pour envoyer l’image. Vérifiez les règles Storage et le rôle admin.";
  }

  if (code.includes("storage/canceled")) {
    return "Envoi annulé.";
  }

  return error instanceof Error && error.message ? error.message : fallback;
}

function imageExtension(file: File): string {
  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) {
    throw new Error("Choisissez une image JPEG, PNG, WebP ou GIF");
  }

  if (file.size <= 0 || file.size >= MAX_IMAGE_BYTES) {
    throw new Error("L’image doit faire moins de 5 Mo");
  }

  return extension;
}

export function startProductImageUpload(
  file: File,
  onProgress: (percent: number) => void,
): { done: Promise<string>; cancel: () => void } {
  const extension = imageExtension(file);
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Session expirée. Reconnectez-vous.");
  }

  const imageRef = ref(
    getFirebaseStorage(),
    `products/${crypto.randomUUID()}.${extension}`,
  );
  const task = uploadBytesResumable(imageRef, file, {
    contentType: file.type,
    cacheControl: "public, max-age=31536000",
  });

  const done = new Promise<string>((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const percent =
          snapshot.totalBytes > 0
            ? Math.min(
                100,
                Math.round(
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
                ),
              )
            : 0;
        onProgress(percent);
      },
      (error) => reject(error),
      () => {
        getDownloadURL(task.snapshot.ref).then(resolve, reject);
      },
    );
  });

  return {
    done,
    cancel: () => {
      try {
        task.cancel();
      } catch {
        // The task already finished.
      }
    },
  };
}
