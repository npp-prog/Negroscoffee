"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  createListAction,
  deleteListAction,
  saveListAction,
  searchShopsForListAction,
} from "@/app/admin/lists/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { AdminListItem } from "@/lib/db";

export function NewListForm() {
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createListAction(title);
          if (res && !res.ok) toast.error(res.error);
        });
      }}
    >
      <label htmlFor="new-list-title" className="sr-only">
        New list title
      </label>
      <Input
        id="new-list-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Best kapihan in Bacolod"
        maxLength={100}
        className="h-12 flex-1"
      />
      <Button
        type="submit"
        variant="crema"
        className="h-12"
        disabled={pending || title.trim().length < 2}
      >
        <Plus /> New list
      </Button>
    </form>
  );
}

type EditorList = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: "draft" | "published";
  sortOrder: number;
  items: AdminListItem[];
};

type Found = { id: string; name: string; slug: string; town: string | null };

function ShopSearch({ exclude, onAdd }: { exclude: Set<string>; onAdd: (s: Found) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const seq = useRef(0);
  useEffect(() => {
    const term = q.trim();
    const n = ++seq.current;
    if (term.length < 2) return;
    const t = setTimeout(async () => {
      const found = await searchShopsForListAction(term);
      if (n === seq.current) setResults(found);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const shown = q.trim().length < 2 ? [] : results.filter((r) => !exclude.has(r.id));
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="list-shop-search" className="text-sm font-medium">
        Add a shop
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="list-shop-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search published shops by name"
          className="h-12 pl-9"
          autoComplete="off"
        />
      </div>
      {shown.length > 0 && (
        <ul
          className="flex flex-col divide-y rounded-2xl border bg-surface"
          aria-label="Search results"
        >
          {shown.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(r);
                  setQ("");
                  setResults([]);
                }}
                className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <Plus className="size-4 text-crema" aria-hidden="true" />
                <span className="font-medium">{r.name}</span>
                {r.town && <span className="text-muted-foreground">· {r.town}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && shown.length === 0 && (
        <p className="text-[13px] text-muted-foreground">No more published shops match.</p>
      )}
    </div>
  );
}

export function ListEditor({ list }: { list: EditorList }) {
  const [title, setTitle] = useState(list.title);
  const [slug, setSlug] = useState(list.slug);
  const [description, setDescription] = useState(list.description);
  const [status, setStatus] = useState(list.status);
  const [sortOrder, setSortOrder] = useState(list.sortOrder);
  const [items, setItems] = useState(list.items);
  const [savedSlug, setSavedSlug] = useState(list.status === "published" ? list.slug : null);
  const [pending, start] = useTransition();

  const move = (i: number, by: -1 | 1) =>
    setItems((xs) => {
      const j = i + by;
      if (j < 0 || j >= xs.length) return xs;
      const next = [...xs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function save() {
    start(async () => {
      const res = await saveListAction(list.id, {
        title,
        slug,
        description,
        status,
        sortOrder,
        items: items.map((i) => ({ shopId: i.shopId, note: i.note ?? "" })),
      });
      if (res.ok) {
        toast.success(res.message ?? "Saved");
        setSavedSlug(status === "published" ? slug.trim().toLowerCase() : null);
      } else toast.error(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">{title || "Untitled list"}</h1>
        {savedSlug && (
          <Link
            href={`/lists/${savedSlug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            View public page <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      <section className="grid gap-4 rounded-[20px] border bg-surface p-5 shadow-soft sm:grid-cols-2 sm:p-6">
        <Field id="list-title" label="Title" className="sm:col-span-2">
          {(p) => (
            <Input
              {...p}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="h-12"
            />
          )}
        </Field>
        <Field
          id="list-description"
          label="Intro"
          optional
          className="sm:col-span-2"
          hint="One or two sentences shown at the top of the list."
        >
          {(p) => (
            <Textarea
              {...p}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={600}
              rows={3}
            />
          )}
        </Field>
        <Field id="list-slug" label="Web address" hint={`kapenegros…/lists/${slug || "…"}`}>
          {(p) => (
            <Input
              {...p}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              maxLength={80}
              className="h-12"
            />
          )}
        </Field>
        <Field id="list-status" label="Status">
          {(p) => (
            <Select
              {...p}
              value={status}
              onChange={(e) => setStatus(e.target.value as EditorList["status"])}
              className="h-12"
            >
              <option value="draft">Draft (only admins see it)</option>
              <option value="published">Published</option>
            </Select>
          )}
        </Field>
        <Field id="list-order" label="Order on /lists" hint="Lower numbers come first.">
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="numeric"
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(Math.max(-999, Math.min(999, Number(e.target.value) || 0)))
              }
              className="h-12"
            />
          )}
        </Field>
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] border bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold">
          Shops <span className="text-muted-foreground tabular">({items.length})</span>
        </h2>
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No shops yet. Search below to add some.</p>
        )}
        <ol className="flex flex-col gap-3">
          {items.map((it, i) => (
            <li key={it.shopId} className="flex flex-col gap-2 rounded-2xl border p-3">
              <div className="flex items-center gap-2">
                <span className="w-6 text-center font-semibold text-crema tabular">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{it.name}</span>
                  <span className="text-[12px] text-muted-foreground">
                    {it.town ?? "No town"}
                    {it.status !== "published" && " · not published (hidden from the list)"}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${it.name} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${it.name} down`}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${it.name}`}
                  onClick={() => setItems((xs) => xs.filter((x) => x.shopId !== it.shopId))}
                >
                  <X />
                </Button>
              </div>
              <label htmlFor={`note-${it.shopId}`} className="sr-only">
                Note for {it.name}
              </label>
              <Input
                id={`note-${it.shopId}`}
                value={it.note ?? ""}
                onChange={(e) =>
                  setItems((xs) =>
                    xs.map((x) => (x.shopId === it.shopId ? { ...x, note: e.target.value } : x)),
                  )
                }
                maxLength={240}
                placeholder="Why it's on the list (optional), e.g. Try the tablea hot chocolate"
              />
            </li>
          ))}
        </ol>
        <ShopSearch
          exclude={new Set(items.map((i) => i.shopId))}
          onAdd={(s) =>
            setItems((xs) => [
              ...xs,
              {
                shopId: s.id,
                name: s.name,
                slug: s.slug,
                status: "published",
                town: s.town,
                note: null,
              },
            ])
          }
        />
      </section>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-surface/95 p-3 shadow-float backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          className="text-destructive"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
            start(async () => {
              const res = await deleteListAction(list.id);
              if (res && !res.ok) toast.error(res.error);
            });
          }}
        >
          <Trash2 /> Delete list
        </Button>
        <Button type="button" variant="crema" onClick={save} disabled={pending}>
          {pending ? "Saving…" : status === "published" ? "Save & publish" : "Save draft"}
        </Button>
      </div>
    </div>
  );
}
