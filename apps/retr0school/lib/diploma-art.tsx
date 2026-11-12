import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { Verification } from "@/lib/near";

export const DIPLOMA_ART_SIZE = { width: 1200, height: 630 };

const BG = "#0b0716";
const MAGENTA = "#ff3fa4";
const CYAN = "#22e6ff";
const INK = "#f4ecff";
const MUTED = "#a9a4d6";
const GREEN = "#00ec97";

let fontPromise: Promise<Buffer> | null = null;
function pixelFont() {
  fontPromise ??= fs.readFile(path.join(process.cwd(), "assets/fonts/PressStart2P-Regular.ttf"));
  return fontPromise;
}

function fitSize(text: string, max: number, min: number, width: number) {
  // Press Start 2P is monospaced: each glyph is about 1 em wide.
  return Math.max(min, Math.min(max, Math.floor(width / Math.max(1, text.length))));
}

/** Neon retro diploma: rose-magenta + cyan neon frame, scanlines, pixel type. */
export async function diplomaArt(diploma: Verification | null, accountId: string) {
  const font = await pixelFont();
  const name = diploma?.owner_id ?? accountId;
  const nameSize = fitSize(name, 54, 22, 980);
  const glow = (c: string) => `0 0 6px ${c}, 0 0 18px ${c}, 0 0 36px ${c}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: BG,
          backgroundImage: `radial-gradient(circle at 50% 0%, #2a0f3d 0%, ${BG} 60%)`,
          fontFamily: "Pixel",
          color: INK,
        }}
      >
        {/* neon frames */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            right: 28,
            bottom: 28,
            border: `4px solid ${MAGENTA}`,
            boxShadow: glow(MAGENTA),
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 48,
            right: 48,
            bottom: 48,
            border: `2px solid ${CYAN}`,
            boxShadow: glow(CYAN),
            display: "flex",
          }}
        />
        {/* content */}
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 90,
            right: 90,
            bottom: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 18, color: CYAN, letterSpacing: 4, textShadow: glow(CYAN) }}>
            RETR0SCHOOL · NEAR TESTNET
          </div>
          <div style={{ display: "flex", fontSize: 64, color: MAGENTA, textShadow: glow(MAGENTA) }}>DIPLOMA</div>
          <div style={{ display: "flex", fontSize: 16, color: MUTED }}>{diploma ? "THIS CERTIFIES THAT" : "NO DIPLOMA FOUND FOR"}</div>
          <div style={{ display: "flex", fontSize: nameSize, color: INK, textShadow: glow("#b98cff") }}>{name}</div>
          <div style={{ display: "flex", fontSize: 16, color: MUTED }}>{diploma ? "PASSED THE TRACK" : "EARN ONE AT RETR0SCHOOL"}</div>
          <div style={{ display: "flex", fontSize: 30, color: CYAN, textShadow: glow(CYAN) }}>
            {diploma ? (diploma.track_title || diploma.track).toUpperCase() : "NEAR FUNDAMENTALS"}
          </div>
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between", fontSize: 18 }}>
            <div style={{ display: "flex", color: MAGENTA }}>{diploma ? `SCORE ${diploma.score}/${diploma.max_score}` : "SCORE -"}</div>
            <div style={{ display: "flex", color: GREEN }}>{diploma ? "SOULBOUND · NEP-171" : ""}</div>
            <div style={{ display: "flex", color: CYAN }}>{diploma ? diploma.date : ""}</div>
          </div>
        </div>
        {/* scanlines */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 5px)",
          }}
        />
      </div>
    ),
    {
      ...DIPLOMA_ART_SIZE,
      fonts: [{ name: "Pixel", data: font, weight: 400, style: "normal" }],
      headers: { "cache-control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400" },
    },
  );
}
