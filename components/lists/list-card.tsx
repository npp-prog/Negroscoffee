import Link from "next/link";
import { Coffee } from "lucide-react";

import { shopPhotoUrl, type ShopListSummary } from "@/lib/db";
import { SUPABASE_URL } from "@/lib/env";

/** A coffee list teaser: cover photo, title, count and towns. */
export function ListCard({ list }: { list: ShopListSummary }) {
  return (
    <Link
      href={`/lists/${list.slug}`}
      className="group flex flex-col overflow-hidden rounded-[20px] border bg-surface shadow-soft transition-shadow hover:shadow-float"
    >
      {list.coverPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shopPhotoUrl(SUPABASE_URL, list.coverPath, { width: 640, height: 360 })}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full bg-muted object-cover"
        />
      ) : (
        <span
          className="grid aspect-[16/9] place-items-center bg-[color-mix(in_oklab,var(--accent-brand)_18%,var(--surface))] text-crema"
          aria-hidden="true"
        >
          <Coffee className="size-10" />
        </span>
      )}
      <span className="flex flex-col gap-1 p-4">
        <span className="font-display text-xl leading-tight font-semibold group-hover:underline">
          {list.title}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {list.count} {list.count === 1 ? "shop" : "shops"}
          {list.towns.length > 0 && ` · ${list.towns.join(", ")}`}
        </span>
        {list.description && (
          <span className="line-clamp-2 text-sm text-muted-foreground">{list.description}</span>
        )}
      </span>
    </Link>
  );
}
