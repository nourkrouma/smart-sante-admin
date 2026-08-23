"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, LogOut, Package } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

const nav = [
  { href: "/products", label: "Produits", icon: Package },
  { href: "/commandes", label: "Commandes", icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOutUser } = useAuth();

  async function handleSignOut() {
    await signOutUser();
    router.replace("/login");
  }

  return (
    <aside className="flex w-full shrink-0 flex-col bg-black text-white md:w-56 md:self-stretch">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:block md:py-6">
        <div>
          <p className="text-lg font-semibold tracking-tight">Smart Santé</p>
          <p className="mt-0.5 text-xs text-white/55">Administration</p>
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <nav className="flex gap-1">
            {nav.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Déconnexion"
          >
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <nav className="hidden flex-1 flex-col gap-1 p-3 md:flex">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-white/10 p-3 md:block">
        {user?.email ? (
          <p className="truncate px-3 text-xs text-white/55" title={user.email}>
            {user.email}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} strokeWidth={1.75} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
