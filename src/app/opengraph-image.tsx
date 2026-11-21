import { ImageResponse } from "next/og";

export const alt = "Nargis & Shaz — considered women's clothing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, #E7DCCB 0%, #C7B49D 55%, #9A8069 100%)", color: "#F5F0E8" }}>
        <div style={{ fontSize: 26, letterSpacing: 10, textTransform: "uppercase", opacity: 0.85 }}>Autumn · Winter 2026</div>
        <div style={{ fontSize: 110, letterSpacing: 18, marginTop: 24, fontFamily: "serif" }}>NARGIS & SHAZ</div>
        <div style={{ fontSize: 30, marginTop: 24, fontStyle: "italic", fontFamily: "serif" }}>Dressed for the life you lead</div>
      </div>
    ),
    size,
  );
}
