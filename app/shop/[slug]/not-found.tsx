import Link from "next/link";
import { Plus } from "lucide-react";

import { ResultsEmpty } from "@/components/explore/results-list";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export default function ShopNotFound() {
  return (
    <PageShell>
      <ResultsEmpty
        title="We couldn't find that shop"
        body="It may have moved, closed, or not be listed yet."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild size="sm">
              <Link href="/">Back to the map</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/suggest">
                <Plus /> Suggest a shop
              </Link>
            </Button>
          </div>
        }
      />
    </PageShell>
  );
}
