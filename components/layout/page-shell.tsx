import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

/** Content-page chrome: translucent sticky header, back to map, centered column. */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-x-0 border-t-0 !border-b-border glass">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-2 px-4">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/">
              <ArrowLeft /> Map
            </Link>
          </Button>
          <Link href="/" aria-label="Kape Negros home" className="rounded-lg">
            <Logo />
          </Link>
          <ThemeToggle variant="ghost" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">{children}</main>
    </div>
  );
}
