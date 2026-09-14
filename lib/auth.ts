import {
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { ADMIN_EMAIL, userHasAdminClaim } from "@/lib/admin";

const NOT_ADMIN_MESSAGE =
  `Ce compte n’est pas administrateur. Connectez-vous avec ${ADMIN_EMAIL} une fois le droit admin attribué.`;

export async function signInAdmin(
  email: string,
  password: string,
): Promise<User> {
  const credential = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password,
  );
  const user = credential.user;

  if (!(await userHasAdminClaim(user, true))) {
    await signOut(getFirebaseAuth());
    throw new Error(NOT_ADMIN_MESSAGE);
  }

  return user;
}

export async function signOutAdmin(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function firebaseAuthMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message &&
    !error.message.startsWith("Firebase:")
  ) {
    if (error.message === NOT_ADMIN_MESSAGE) {
      return error.message;
    }
  }

  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "Saisissez une adresse e-mail valide.";
    case "auth/user-disabled":
      return "Ce compte a été désactivé.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "E-mail ou mot de passe incorrect.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Réessayez plus tard.";
    case "auth/network-request-failed":
      return "Erreur réseau. Vérifiez votre connexion.";
    default:
      return error instanceof Error
        ? error.message
        : "Échec de la connexion.";
  }
}
