import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND, MARK_DOT, MARK_FIELD } from "@/components/brand";

export const alt = `${BRAND.name}: ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const types = [
  { label: "Automation", color: "#4F64D8", bg: "#EAEDFF" },
  { label: "AI skill", color: "#B87535", bg: "#FFF0DF" },
  { label: "AI agent", color: "#7161E8", bg: "#EEEBFF" },
  { label: "Keep human", color: "#BD547B", bg: "#FBEAF1" },
];

const font = (file: string) => readFile(join(process.cwd(), "src/assets/fonts", file));
const [regular, semibold] = await Promise.all([font("Geist-Regular.ttf"), font("Geist-SemiBold.ttf")]);

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: BRAND.paper, fontFamily: "Geist" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg viewBox="0 0 32 32" width={64} height={64}>
            <path d={MARK_FIELD} fill="none" stroke={BRAND.purple} strokeLinecap="round" strokeWidth="3" />
            <circle cx={MARK_DOT.cx} cy={MARK_DOT.cy} r={MARK_DOT.r} fill={BRAND.amber} />
          </svg>
          <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: -1.8, color: BRAND.ink }}>{BRAND.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -3, lineHeight: 1.02, color: BRAND.ink }}>{BRAND.tagline}</div>
          <div style={{ fontSize: 30, color: "#45435B", maxWidth: 1040, lineHeight: 1.35 }}>
            Listen to the work. Keep the evidence. Choose what to build.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {types.map((t) => (
            <div key={t.label} style={{ display: "flex", padding: "8px 16px", borderRadius: 10, fontSize: 24, fontWeight: 600, color: t.color, background: t.bg }}>
              {t.label}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
