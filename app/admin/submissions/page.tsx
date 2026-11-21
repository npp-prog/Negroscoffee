import type { Metadata } from "next";
import Link from "next/link";

import { SubmissionCard } from "@/components/admin/submission-card";
import { listSubmissions, proofUrl, type SubmissionKind, type SubmissionStatus } from "@/lib/db";
import { getServerSupabase } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Submissions" };

const STATUSES: SubmissionStatus[] = ["pending", "approved", "rejected"];
const KINDS: { key: SubmissionKind | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new_shop", label: "New shops" },
  { key: "claim", label: "Claims" },
  { key: "correction", label: "Edits" },
];
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-10 items-center rounded-full px-3.5 text-sm font-medium",
        active
          ? "bg-primary text-primary-foreground"
          : "border bg-surface text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export default async function SubmissionsPage({ searchParams }: PageProps<"/admin/submissions">) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === one(sp.status)) ?? "pending";
  const kind = KINDS.find((k) => k.key === one(sp.kind) && k.key !== "all")?.key as
    SubmissionKind | undefined;
  const open = one(sp.open);

  const db = await getServerSupabase();
  const items = await listSubmissions(db, { status, kind, limit: 50 });
  const urls = await Promise.all(
    items.map((s) => (s.proofPath ? proofUrl(db, s.proofPath) : Promise.resolve(null))),
  );
  const href = (p: { status?: string; kind?: string }) => {
    const params = new URLSearchParams();
    const st = p.status ?? status;
    const k = p.kind ?? kind ?? "all";
    if (st !== "pending") params.set("status", st);
    if (k !== "all") params.set("kind", k);
    const s = params.toString();
    return `/admin/submissions${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-semibold">Submissions</h1>
      <div className="flex flex-col gap-2">
        <nav aria-label="Status" className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Tab key={s} href={href({ status: s })} active={status === s}>
              {s[0].toUpperCase() + s.slice(1)}
            </Tab>
          ))}
        </nav>
        <nav aria-label="Kind" className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <Tab key={k.key} href={href({ kind: k.key })} active={(kind ?? "all") === k.key}>
              {k.label}
            </Tab>
          ))}
        </nav>
      </div>
      {items.length === 0 ? (
        <p className="rounded-[20px] border border-dashed p-10 text-center text-muted-foreground">
          {status === "pending" ? "All caught up. Nothing to review." : "Nothing here yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((s, i) => (
            <SubmissionCard
              key={s.id}
              s={s}
              proofUrl={urls[i]}
              defaultOpen={open ? open === s.id : i === 0 && status === "pending"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
