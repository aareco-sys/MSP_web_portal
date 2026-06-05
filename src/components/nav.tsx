"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

export function Nav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const qs = params.toString();
  const t = useT();

  const LINKS = [
    { href: "/", label: t.nav.overview },
    { href: "/listas", label: t.nav.lists },
    { href: "/usuarios", label: t.nav.users },
    { href: "/mensual", label: t.nav.monthly },
  ];
  return (
    <nav className="flex gap-1">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={`${l.href}${qs ? `?${qs}` : ""}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-blue-600 text-white"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
