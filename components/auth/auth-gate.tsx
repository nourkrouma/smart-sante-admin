"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span
          className="size-4 animate-spin rounded-full border-2 border-border border-t-brand"
          aria-hidden
        />
        Vérification de la session…
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready || user) return;
    const next = pathname && pathname.startsWith("/") ? pathname : "/products";
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [ready, user, pathname, router]);

  if (!ready) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <AuthLoadingScreen />;
  }

  return children;
}
