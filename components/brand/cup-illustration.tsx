import { cn } from "@/lib/utils";

/** Friendly empty-state illustration: a steaming cup on a saucer. */
export function CupIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" className={cn("w-40", className)}>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M66 18c-6 7 6 11 0 19M80 12c-6 8 6 13 0 22M94 18c-6 7 6 11 0 19"
          stroke="var(--muted-foreground)"
          strokeWidth="3"
          opacity=".5"
        >
          <animate attributeName="opacity" values=".2;.6;.2" dur="3s" repeatCount="indefinite" />
        </path>
        <ellipse cx="80" cy="104" rx="56" ry="9" fill="var(--muted)" />
        <path
          d="M42 50h76v18c0 19-17 34-38 34S42 87 42 68V50Z"
          fill="var(--surface)"
          stroke="var(--foreground)"
          strokeWidth="3"
        />
        <path d="M118 58h6a12 12 0 0 1 0 24h-9" stroke="var(--foreground)" strokeWidth="3" />
        <ellipse
          cx="80"
          cy="50"
          rx="38"
          ry="7"
          fill="var(--accent-brand)"
          stroke="var(--foreground)"
          strokeWidth="3"
        />
        <path
          d="M66 74c3 3 7 3 10 0M84 74c3 3 7 3 10 0"
          stroke="var(--foreground)"
          strokeWidth="2.5"
        />
      </g>
    </svg>
  );
}
