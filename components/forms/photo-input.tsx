"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

import { cn } from "@/lib/utils";

const MAX_EDGE = 1600;

/** Downscale to MAX_EDGE px JPEG in the browser (saves mobile data; keeps uploads small). */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_000_000 && file.type !== "image/heic") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // the server validates type and size anyway
  }
}

/**
 * Photo picker that resizes the image before the form posts it. Works with plain
 * <form action>: the resized file replaces the input's FileList.
 */
export function PhotoInput({
  id,
  name,
  required,
  invalid,
  describedBy,
  label = "Add photo",
}: {
  id: string;
  name: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  // React resets the form after an action runs; the file input empties, so drop the preview too.
  useEffect(() => {
    const form = input.current?.form;
    const onReset = () => setPreview(null);
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, []);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return setPreview(null);
    setBusy(true);
    const small = await shrink(file);
    if (small !== file && typeof DataTransfer !== "undefined") {
      const dt = new DataTransfer();
      dt.items.add(small);
      e.target.files = dt.files;
    }
    setPreview(URL.createObjectURL(small));
    setBusy(false);
  }

  function clear() {
    if (input.current) input.current.value = "";
    setPreview(null);
  }

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor={id}
        className={cn(
          "relative grid size-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed bg-surface text-muted-foreground transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-crema hover:text-foreground",
          invalid && "border-destructive",
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected photo preview" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-[12px] font-medium">
            <Camera className="size-5" aria-hidden="true" />
            {busy ? "Preparing…" : label}
          </span>
        )}
        <input
          ref={input}
          id={id}
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={onChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      {preview && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" /> Remove
        </button>
      )}
    </div>
  );
}
