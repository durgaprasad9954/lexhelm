import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "LexHelm — AI-Powered Legal Intelligence Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 40%, #1a0a2e 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(139, 92, 246, 0.15) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Purple glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Logo icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "96px",
            height: "96px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
            marginBottom: "32px",
            boxShadow: "0 8px 32px rgba(139, 92, 246, 0.4)",
          }}
        >
          {/* Scale icon SVG */}
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="M7 21h10" />
            <path d="M12 3v18" />
            <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            display: "flex",
            fontSize: "64px",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-2px",
            marginBottom: "16px",
          }}
        >
          LexHelm
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: "24px",
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.7)",
            marginBottom: "40px",
          }}
        >
          AI-Powered Legal Intelligence Platform
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "16px",
          }}
        >
          {["Legal Documents", "Case Law Search", "Contract Review", "AI Analysis"].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  display: "flex",
                  padding: "10px 24px",
                  borderRadius: "999px",
                  background: "rgba(139, 92, 246, 0.2)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  color: "rgba(255, 255, 255, 0.85)",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                {feature}
              </div>
            ),
          )}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            display: "flex",
            fontSize: "16px",
            color: "rgba(255, 255, 255, 0.4)",
            fontWeight: 500,
          }}
        >
          lexhelm.com
        </div>
      </div>
    ),
    { ...size },
  );
}
