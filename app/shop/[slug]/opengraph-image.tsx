import { ImageResponse } from "next/og";

import { getPrerenderSlugs, getPublicShop } from "./data";
import { PRICE_TIER_META, PROVINCE_LABEL, SHOP_TYPE_META, type ShopType } from "@/lib/categories";

export const alt = "Coffee shop on Kape Negros";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  return getPrerenderSlugs();
}

// Literal light-theme colors (CSS variables don't exist inside ImageResponse).
const TYPE_COLOR: Record<ShopType, string> = {
  specialty: "#5A3A22",
  chain: "#C2613F",
  kapihan: "#6E8B6A",
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getPublicShop(slug);

  const name = shop?.name ?? "Kape Negros";
  const color = shop ? TYPE_COLOR[shop.type] : "#C8893B";
  const place = shop
    ? [shop.cityName, shop.province ? PROVINCE_LABEL[shop.province] : null]
        .filter(Boolean)
        .join(", ")
    : "Coffee shops on Negros Island";

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
        position: "relative",
      }}
    >
      <div
        style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 18, background: color }}
      />
      <div
        style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 700 }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: "#C8893B",
            display: "flex",
          }}
        />
        <span>Kape</span>
        <span style={{ color: "#C8893B", marginLeft: -6 }}>Negros</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: name.length > 28 ? 72 : 92,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
            display: "flex",
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 34, color: "#7A6758", display: "flex" }}>{place}</div>
      </div>

      {shop ? (
        <div style={{ display: "flex", gap: 16, fontSize: 30, fontWeight: 600 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 24px",
              borderRadius: 999,
              background: "#FFFFFF",
              border: "2px solid #E7DED3",
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 9, background: color }} />
            {SHOP_TYPE_META[shop.type].label}
          </div>
          <div
            style={{
              display: "flex",
              padding: "12px 24px",
              borderRadius: 999,
              background: "#FFFFFF",
              border: "2px solid #E7DED3",
            }}
          >
            {`${PRICE_TIER_META[shop.priceTier].symbol}  ${PRICE_TIER_META[shop.priceTier].label}`}
          </div>
          {shop.lattePrice != null && (
            <div
              style={{
                display: "flex",
                padding: "12px 24px",
                borderRadius: 999,
                background: "#2B1D14",
                color: "#F6F1EA",
              }}
            >
              {`Latte ₱${Math.round(shop.lattePrice)}`}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex" }} />
      )}
    </div>,
    size,
  );
}
