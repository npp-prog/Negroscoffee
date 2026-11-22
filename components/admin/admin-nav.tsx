"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/review", label: "Review" },
  { href: "/admin/shops", label: "Shops" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/lists", label: "Lists" },
];

export function AdminNav(props: { static?: boolean }) {
  return props.static ? <NavLinks path={null} /> : <LiveNav />;
}

function LiveNav() {
  return <NavLinks path={usePathname()} />;
}

function NavLinks({ path }: { path: string | null }) {
  return (
    <nav
      aria-label="Admin"
      className="no-scrollbar -mx-1 flex min-w-0 [scrollbar-width:none] gap-1 overflow-x-auto"
    >
      {LINKS.map((l) => {
        const active =
          !!path && (l.href === "/admin" ? path === "/admin" : path.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-11 shrink-0 items-center rounded-full px-3.5 text-sm font-medium",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
