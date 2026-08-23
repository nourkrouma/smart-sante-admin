import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Connexion · Smart Santé Admin",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-muted">
            <span
              className="size-4 animate-spin rounded-full border-2 border-border border-t-brand"
              aria-hidden
            />
            Chargement…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
