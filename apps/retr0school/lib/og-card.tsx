import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

// Raster snapshot of the dark Retr0school palette in styles/theme.css.
// next/og cannot read CSS variables, so these hex values mirror the dark set.
const canvas = "#0d0b1a";
const ink = "#e8e6ff";
const muted = "#a9a4d6";
const accent = "#ff3fa4";

export function ogCard(kicker: string, title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: canvas,
          color: ink,
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 42, fontWeight: 700 }}>
          Retr0school
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 99,
              background: accent,
              marginLeft: 14,
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: accent, fontSize: 24, letterSpacing: 3, textTransform: "uppercase" }}>{kicker}</div>
          <div style={{ fontSize: 76, fontWeight: 760, lineHeight: 1, letterSpacing: -2, marginTop: 16 }}>{title}</div>
          <div style={{ fontSize: 30, color: muted, marginTop: 22, maxWidth: 860 }}>{subtitle}</div>
        </div>
      </div>
    ),
    { ...ogSize },
  );
}
