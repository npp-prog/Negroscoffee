import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Content-page chrome: translucent sticky header, back to map, centered column. */
export function PageShell({
  children,
  backHref = "/",
  wide = false,
}: {
  children: React.ReactNode;
  /** Where "Map" goes back to, e.g. the map with this shop selected. */
  backHref?: string;
  wide?: boolean;
}) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-x-0 border-t-0 !border-b-border glass">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-2 px-4">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href={backHref}>
              <ArrowLeft /> Map
            </Link>
          </Button>
          <Link href="/" aria-label="Kape Negros home" className="rounded-lg">
            <Logo />
          </Link>
          <ThemeToggle variant="ghost" />
        </div>
      </header>
      <main className={cn("mx-auto px-4 py-8 sm:py-12", wide ? "max-w-5xl" : "max-w-3xl")}>
        {children}
      </main>
    </div>
  );
}
