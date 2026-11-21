"use client";

import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export function SearchBar({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex h-12 items-center gap-2.5 rounded-full px-4 focus-within:ring-2 focus-within:ring-ring/60",
        className,
      )}
    >
      <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Search coffee shops</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search shops or towns"
        className="h-full w-full min-w-0 bg-transparent text-[15px] placeholder:text-muted-foreground focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        autoComplete="off"
        enterKeyHint="search"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="-mr-2 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}
    </label>
  );
}
