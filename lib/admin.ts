import type { User } from "firebase/auth";

export const ADMIN_EMAIL = "admin@smartsante.com";

export async function userHasAdminClaim(
  user: User,
  forceRefresh = false,
): Promise<boolean> {
  const token = await user.getIdTokenResult(forceRefresh);
  return token.claims.admin === true;
}
