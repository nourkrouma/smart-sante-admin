export function firestoreUserMessage(
  error: unknown,
  fallback: string,
): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  if (
    code.includes("permission-denied") ||
    (error instanceof Error &&
      /missing or insufficient permissions/i.test(error.message))
  ) {
    return "Permissions insuffisantes. Vérifiez les règles Firestore et le rôle admin.";
  }

  return error instanceof Error ? error.message : fallback;
}
