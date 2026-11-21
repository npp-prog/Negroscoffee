import Link from "next/link";

import { ResultsEmpty } from "@/components/explore/results-list";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageShell>
      <ResultsEmpty
        title="This cup is empty"
        body="We couldn't find that page. It may still be brewing."
        action={
          <Button asChild size="sm">
            <Link href="/">Back to the map</Link>
          </Button>
        }
      />
    </PageShell>
  );
}
