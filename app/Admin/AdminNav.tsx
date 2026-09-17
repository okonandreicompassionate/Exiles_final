"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, PlusSquare, ListChecks, ShieldCheck, FileText, Store } from "lucide-react";
import { Logo } from "../components/Logo";

type Props = {
  role: "god" | "admin" | null;
  onLogout: () => void;
  email?: string;
};

const LINKS = [
  { href: "/Admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/Admin", label: "Add New", icon: PlusSquare },
  { href: "/Admin/edit", label: "Edit Products", icon: ListChecks },
  { href: "/Admin/admins", label: "Admins", icon: ShieldCheck, godOnly: true },
  { href: "/Admin/handoff", label: "Handoff", icon: FileText, godOnly: true },
];

/**
 * Same nav, same links, same order, on every /Admin* page — logged in as
 * admin or god. God-only entries (Admins, Handoff) are omitted for a plain
 * admin rather than shown-disabled, but everything else is identical
 * everywhere so navigating between admin pages never feels different.
 */
export function AdminNav({ role, onLogout, email }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 glass-nav">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo showText={false} markClassName="h-7" />
          <h1 className="font-bold tracking-[0.4em] text-sm uppercase hidden sm:block">Admin</h1>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto">
          {LINKS.filter((link) => !link.godOnly || role === "god").map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className={`flex items-center gap-1.5 text-xs tracking-widest uppercase transition-colors whitespace-nowrap flex-shrink-0 ${
                  active ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Icon size={13} />
                <span className="hidden md:inline">{link.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => router.push("/shop")}
            className="flex items-center gap-1.5 text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-900 transition-colors hidden sm:flex flex-shrink-0"
          >
            <Store size={13} />
            <span className="hidden md:inline">View Shop</span>
          </button>
          <button
            onClick={onLogout}
            className="text-zinc-500 hover:text-red-500 transition-colors flex-shrink-0"
            title={email}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </nav>
  );
}
