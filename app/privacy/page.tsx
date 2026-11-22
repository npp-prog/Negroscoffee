import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { CONTACT_EMAIL } from "@/lib/env";

export const metadata: Metadata = {
  title: "Privacy & community rules",
  description:
    "What Kape Negros collects, why, and how to remove it. Plus the rules for reviews and photos.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "22 November 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="flex max-w-prose flex-col gap-3 text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  const contact = CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : null;
  return (
    <PageShell>
      <article className="flex flex-col gap-10">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium text-crema">Last updated {UPDATED}</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Privacy &amp; community rules</h1>
          <p className="max-w-prose text-lg text-muted-foreground">
            Kape Negros is a free map of coffee shops on Negros Island. You can browse without an
            account. We collect as little as we can and never sell your data.
          </p>
        </header>

        <Section title="What we collect">
          <ul className="flex flex-col gap-2">
            <li>
              <strong>Your account:</strong> your email address (and your name from Google if you
              sign in with Google), plus the display name you choose.
            </li>
            <li>
              <strong>What you add:</strong> reviews and ratings, photos, shop suggestions, edit
              suggestions and ownership claims, including any contact details and proof photos you
              include.
            </li>
            <li>
              <strong>Your lists:</strong> favorites and &ldquo;been here&rdquo; marks. Only you can
              see them.
            </li>
            <li>
              <strong>Your location:</strong> only when you tap &ldquo;Near me&rdquo;. It stays in
              your browser to sort shops by distance; we don&apos;t store it.
            </li>
            <li>
              <strong>Technical logs:</strong> our hosting providers keep short-lived server logs
              (such as IP address and browser type) for security and troubleshooting.
            </li>
          </ul>
          <p>
            We don&apos;t use advertising or tracking cookies. Sign-in uses a cookie to keep you
            signed in.
          </p>
        </Section>

        <Section title="What others can see">
          <p>
            Reviews, approved photos and owner replies are public and show your display name. Your
            email address, favorites, claims, suggestions and proof photos are private and seen only
            by Kape Negros admins where needed to review them.
          </p>
        </Section>

        <Section title="Who helps us run the site">
          <p>
            Data is stored with <strong>Supabase</strong> (database, sign-in and photos) and the
            site is hosted on <strong>Vercel</strong>. Maps come from <strong>MapTiler</strong> and{" "}
            <strong>OpenStreetMap</strong>; directions open in Google Maps. If email notifications
            are on, emails are sent through <strong>Resend</strong>. These providers process data
            only to provide their service to us.
          </p>
        </Section>

        <Section title="Your choices and rights">
          <p>
            Under the Philippine Data Privacy Act of 2012 you can ask to see, correct or delete your
            personal data.
          </p>
          <ul className="flex flex-col gap-2">
            <li>
              Edit or delete your reviews on the shop page, and withdraw photos still waiting for
              review on your <Link href="/saved">Saved page</Link>.
            </li>
            <li>Change your display name or turn off emails on your Saved page.</li>
            <li>
              <strong>Delete your account</strong> at the bottom of your Saved page. This removes
              your account, reviews, lists and pending photos. Approved photos stay on the shop page
              without your name.
            </li>
            {contact ? (
              <li>For anything else, email {contact}.</li>
            ) : (
              <li>
                For anything else, send a message through{" "}
                <Link href="/suggest">Suggest a shop</Link> with your email address and we&apos;ll
                get back to you.
              </li>
            )}
          </ul>
        </Section>

        <Section title="Community rules for reviews and photos">
          <ul className="flex flex-col gap-2">
            <li>Write about your own visit. Be honest and kind; no insults, hate or threats.</li>
            <li>No ads, spam, or reviews of a shop you own or work for.</li>
            <li>
              Only upload photos you took. Don&apos;t include close-ups of people who didn&apos;t
              agree to be photographed.
            </li>
            <li>
              We may hide reviews or decline photos that break these rules. By posting, you let Kape
              Negros show your review or photo on the site.
            </li>
          </ul>
        </Section>

        <Section title="Shop information">
          <p>
            Shop details come from OpenStreetMap contributors (© OpenStreetMap, ODbL), shop owners
            and visitors, and are checked by hand. Prices and hours change; please confirm with the
            shop before you go.
          </p>
        </Section>
      </article>
    </PageShell>
  );
}
