"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ClipboardList,
  ListChecks,
  LogOut,
  Package,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

const nav = [
  { href: "/products", label: "Produits", icon: Package },
  { href: "/commandes", label: "Commandes", icon: ClipboardList },
  { href: "/formulaires", label: "Formulaires", icon: ListChecks },
  { href: "/users", label: "Utilisateurs", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

function navClassName(active: boolean, compact = false) {
  const padding = compact ? "px-3 py-2" : "px-3 py-2.5";
  return `flex shrink-0 items-center gap-2 rounded-md ${padding} text-sm font-medium whitespace-nowrap transition-colors ${
    active
      ? "bg-brand text-white"
      : "text-white/70 hover:bg-white/10 hover:text-white"
  }`;
}

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
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          aria-label="Déconnexion"
        >
          <LogOut size={18} strokeWidth={1.75} />
        </button>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-2 md:hidden">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={navClassName(active, true)}
            >
              <Icon size={18} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      <nav className="hidden flex-1 flex-col gap-1 p-3 md:flex">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className={navClassName(active)}>
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
