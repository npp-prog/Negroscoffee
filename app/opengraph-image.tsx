import { ImageResponse } from "next/og";

export const alt = "Kape Negros: coffee shops on Negros Island";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Literal light-theme colors (CSS variables don't exist inside ImageResponse).
const PINS = [
  { x: 760, y: 170, c: "#5A3A22" },
  { x: 880, y: 250, c: "#C2613F" },
  { x: 820, y: 360, c: "#6E8B6A" },
  { x: 960, y: 420, c: "#5A3A22" },
  { x: 1040, y: 300, c: "#C8893B" },
  { x: 700, y: 470, c: "#C2613F" },
];

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#F6F1EA",
        color: "#2B1D14",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {PINS.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: 64,
            height: 64,
            borderRadius: "32px 32px 32px 4px",
            transform: "rotate(-45deg)",
            background: p.c,
            border: "6px solid #FFFFFF",
            boxShadow: "0 10px 24px rgba(43,29,20,0.18)",
            display: "flex",
          }}
        />
      ))}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          padding: "0 72px",
          width: 680,
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>
          <span>Kape</span>
          <span style={{ color: "#C8893B", marginLeft: 10 }}>Negros</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          Every cup on Negros, on one map.
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#7A6758" }}>
          Bacolod, Dumaguete and beyond, by price and style.
        </div>
      </div>
    </div>,
    size,
  );
}
