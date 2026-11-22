import type { Metadata } from "next";
import Link from "next/link";

import { getPublicLists } from "./data";
import { ListCard } from "@/components/lists/list-card";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Coffee lists",
  description:
    "Hand-picked coffee shop lists for Bacolod, Dumaguete and the rest of Negros Island.",
  alternates: { canonical: "/lists" },
};

export default async function ListsPage() {
  const lists = await getPublicLists();
  return (
    <PageShell backHref="/" wide>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-semibold sm:text-5xl">Coffee lists</h1>
          <p className="max-w-prose text-lg text-muted-foreground">
            Hand-picked shops for every mood and budget, from neighborhood kapihan to specialty
            roasters.
          </p>
        </header>
        {lists.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-[20px] border border-dashed p-8">
            <p className="text-muted-foreground">The first lists are still brewing.</p>
            <Button asChild size="sm">
              <Link href="/">Explore the map</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((l) => (
              <li key={l.id}>
                <ListCard list={l} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
