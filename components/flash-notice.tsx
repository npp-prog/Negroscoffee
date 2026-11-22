"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const MESSAGES: Record<string, string> = {
  deleted: "Your account has been deleted. Thanks for visiting Kape Negros.",
};

/** Shows a one-time toast for ?deleted=1 style flags, then removes the flag from the URL. */
export function FlashNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    for (const key of Object.keys(MESSAGES)) {
      if (url.searchParams.get(key) === "1") {
        toast.success(MESSAGES[key]);
        url.searchParams.delete(key);
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      }
    }
  }, []);
  return null;
}
