"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Row = { key: number; name: string; price: string; category: string };

let seq = 0;
const row = (r?: Partial<Row>): Row => ({ key: ++seq, name: "", price: "", category: "", ...r });

export function MenuEditor({
  name,
  initial,
}: {
  name: string;
  initial: { name: string; price: number; category: string | null }[];
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((m) => row({ name: m.name, price: String(m.price), category: m.category ?? "" })),
  );
  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (i: number, by: number) =>
    setRows((rs) => {
      const next = [...rs];
      const [it] = next.splice(i, 1);
      next.splice(i + by, 0, it);
      return next;
    });

  const payload = rows
    .filter((r) => r.name.trim() || r.price.trim())
    .map((r) => ({
      name: r.name,
      price: r.price,
      category: r.category || null,
    }));

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={JSON.stringify(payload)} />
      {rows.length > 0 && (
        <div className="hidden grid-cols-[1fr_100px_140px_auto] gap-2 px-1 text-[12px] font-semibold tracking-wide text-muted-foreground uppercase sm:grid">
          <span>Item</span>
          <span>Price ₱</span>
          <span>Category</span>
          <span className="w-[120px]" />
        </div>
      )}
      {rows.map((r, i) => (
        <div
          key={r.key}
          className="grid grid-cols-[1fr_90px] gap-2 rounded-xl border bg-background/50 p-2 sm:grid-cols-[1fr_100px_140px_auto] sm:border-0 sm:bg-transparent sm:p-0"
        >
          <input
            aria-label="Item name"
            value={r.name}
            onChange={(e) => update(r.key, { name: e.target.value })}
            placeholder="Hot latte 12 oz"
            maxLength={80}
            className="h-11 min-w-0 rounded-lg border bg-surface px-3 text-sm"
          />
          <input
            aria-label="Price in pesos"
            value={r.price}
            onChange={(e) => update(r.key, { price: e.target.value.replace(/[^\d.]/g, "") })}
            inputMode="decimal"
            placeholder="150"
            className="h-11 min-w-0 rounded-lg border bg-surface px-3 text-sm tabular"
          />
          <input
            aria-label="Category"
            value={r.category}
            onChange={(e) => update(r.key, { category: e.target.value })}
            placeholder="Espresso"
            maxLength={40}
            className="h-11 min-w-0 rounded-lg border bg-surface px-3 text-sm"
          />
          <div className="flex items-center justify-end gap-0.5">
            <button
              type="button"
              disabled={i === 0}
              onClick={() => move(i, -1)}
              aria-label={`Move ${r.name || "item"} up`}
              className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-accent disabled:opacity-30"
            >
              <ArrowUp className="size-4" />
            </button>
            <button
              type="button"
              disabled={i === rows.length - 1}
              onClick={() => move(i, 1)}
              aria-label={`Move ${r.name || "item"} down`}
              className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-accent disabled:opacity-30"
            >
              <ArrowDown className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              aria-label={`Remove ${r.name || "item"}`}
              className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-foreground"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setRows((rs) => [...rs, row({ category: rs.at(-1)?.category ?? "" })])}
      >
        <Plus /> Add item
      </Button>
    </div>
  );
}
