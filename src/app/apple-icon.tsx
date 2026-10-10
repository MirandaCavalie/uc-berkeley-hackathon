import { ImageResponse } from "next/og";
import { BRAND, MARK_DOT, MARK_F } from "@/components/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.purple }}>
        <svg viewBox="0 0 32 32" width={120} height={120} style={{ marginTop: -4 }}>
          <path d={MARK_F} fill="white" />
          <circle cx={MARK_DOT.cx} cy={MARK_DOT.cy} r={MARK_DOT.r} fill={BRAND.amber} />
        </svg>
      </div>
    ),
    size,
  );
}
