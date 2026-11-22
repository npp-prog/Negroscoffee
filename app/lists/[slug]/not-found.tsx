import Link from "next/link";

import { ResultsEmpty } from "@/components/explore/results-list";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export default function ListNotFound() {
  return (
    <PageShell backHref="/lists">
      <ResultsEmpty
        title="This list isn't here"
        body="It may have been renamed or taken down."
        action={
          <Button asChild size="sm">
            <Link href="/lists">See all lists</Link>
          </Button>
        }
      />
    </PageShell>
  );
}
