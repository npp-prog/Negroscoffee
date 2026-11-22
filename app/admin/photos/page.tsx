import type { Metadata } from "next";

import { PhotoQueue } from "@/components/admin/photo-queue";
import { listPendingPhotos } from "@/lib/db";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Visitor photos" };

export default async function AdminPhotosPage() {
  const db = await getServerSupabase();
  const photos = await listPendingPhotos(db, 48);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Visitor photos</h1>
        <p className="text-muted-foreground">
          Approve clear photos of the shop, its drinks or menu. Approved photos are added at the end
          of the shop&apos;s gallery with &ldquo;Photo by&rdquo; and the visitor&apos;s name;
          decline blurry, unrelated or inappropriate ones (the file is deleted).
        </p>
      </div>
      <PhotoQueue photos={photos} />
    </div>
  );
}
