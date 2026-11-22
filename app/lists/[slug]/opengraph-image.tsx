import { ImageResponse } from "next/og";

import { getListPrerenderSlugs, getPublicList } from "../data";

export const alt = "Coffee list on Kape Negros";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  return getListPrerenderSlugs();
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = await getPublicList(slug);
  const title = list?.title ?? "Coffee lists";
  const names = list?.items.slice(0, 4).map((i) => i.shop.name) ?? [];
  const count = list?.items.length ?? 0;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#F6F1EA",
        color: "#2B1D14",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>
        <span>Kape</span>
        <span style={{ color: "#C8893B", marginLeft: 8 }}>Negros</span>
        <span style={{ color: "#7A6758", marginLeft: 16, fontWeight: 400 }}>· Coffee list</span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: title.length > 34 ? 68 : 84,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -2,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {names.map((n, i) => (
          <div key={n} style={{ display: "flex", fontSize: 30, gap: 16 }}>
            <span style={{ color: "#C8893B", fontWeight: 800, width: 32 }}>{i + 1}</span>
            <span>{n}</span>
          </div>
        ))}
        {count > names.length && (
          <div style={{ display: "flex", fontSize: 26, color: "#7A6758", marginLeft: 48 }}>
            {`+ ${count - names.length} more`}
          </div>
        )}
      </div>
    </div>,
    size,
  );
}
