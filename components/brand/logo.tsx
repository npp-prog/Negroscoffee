import { cn } from "@/lib/utils";

/** Cup-and-pin mark + wordmark. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-7" />
      {!compact && (
        <span className="font-display text-[1.15rem] leading-none font-semibold tracking-tight">
          Kape <span className="text-crema">Negros</span>
        </span>
      )}
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path
        d="M16 2C9.9 2 5 6.8 5 12.8c0 7.6 9.3 16 10.2 16.8.5.4 1.1.4 1.6 0C17.7 28.8 27 20.4 27 12.8 27 6.8 22.1 2 16 2Z"
        fill="var(--accent-brand)"
      />
      <path
        d="M10.5 10.5h9.2v4.2a4.6 4.6 0 0 1-9.2 0v-4.2Zm9.2 1.2h1.1a2 2 0 0 1 0 4h-1.4"
        fill="none"
        stroke="var(--accent-brand-foreground)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
