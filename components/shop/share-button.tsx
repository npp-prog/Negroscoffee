"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Native share sheet on phones (Messenger, Viber, …); copies the link elsewhere. */
export function ShareButton({ path, title, text }: { path: string; title: string; text: string }) {
  async function share() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return; // user closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast(url, { description: "Copy this link to share" });
    }
  }
  return (
    <Button variant="outline" onClick={share}>
      <Share2 /> Share
    </Button>
  );
}
