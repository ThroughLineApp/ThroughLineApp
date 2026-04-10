import { useState, useEffect } from "react";
import { useRouter } from "next/router";

const T = {
  surface: "#111318",
  surface2: "#181C22",
  gold: "#C9A84C",
  text: "#F0ECE4",
  text2: "#9A9488",
  purple: "#9B8FF5",
  border: "rgba(255,255,255,0.08)",
  goldBorder: "rgba(201,168,76,0.3)",
};

const DISMISS_KEY = "throughline_quiz_nudge_dismissed";
const DISMISS_DAYS = 7;

/**
 * QuizNudgeCard — injected at position 5 in the feed.
 * Dismissed state stored in localStorage for 7 days.
 *
 * Props:
 *   onDismiss — optional callback when user dismisses
 */
export default function QuizNudgeCard({ onDismiss }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    // Check dismiss state
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const { dismissedAt } = JSON.parse(raw);
        const daysSince = (Date.now() - dismissedAt) / 86400000;
        if (daysSince < DISMISS_DAYS) return; // still dismissed
      }
    } catch (_) {}
    setVisible(true);
    requestAnimationFrame(() => setAnimIn(true));
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ dismissedAt: Date.now() }));
    } catch (_) {}
    setAnimIn(false);
    setTimeout(() => {
      setVisible(false);
      if (onDismiss) onDismiss();
    }, 300);
  };

  const handleTake = () => {
    router.push("/quiz");
  };

  if (!visible) return null;

  return (
    <div style={{
      background: T.surface,
      border: `0.5px solid ${T.goldBorder}`,
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 16,
      opacity: animIn ? 1 : 0,
      transform: animIn ? "translateY(0)" : "translateY(8px)",
      transition: "opacity 0.3s ease, transform 0.3s ease",
    }}>
      {/* Gold top stripe */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${T.purple}, ${T.gold})`,
      }} />

      <div style={{ padding: "20px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{
            background: T.purple + "18",
            border: `0.5px solid ${T.purple}44`,
            borderRadius: 20,
            padding: "3px 10px",
            fontFamily: "Arial",
            fontSize: 11,
            color: T.purple,
            fontWeight: 600,
          }}>YOUR POLITICAL IDENTITY</div>
          <button
            onClick={handleDismiss}
            style={{
              background: "none",
              border: "none",
              color: T.text2,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: "0 4px",
            }}
          >×</button>
        </div>

        {/* Thumbprint preview + headline */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <ThumbprintPreview />
          <div>
            <div style={{
              fontFamily: "Arial Black, Arial",
              fontWeight: 900,
              fontSize: 18,
              color: T.text,
              lineHeight: 1.2,
              marginBottom: 6,
            }}>How well does your rep actually represent you?</div>
            <div style={{
              fontFamily: "Arial",
              fontSize: 13,
              color: T.text2,
              lineHeight: 1.5,
            }}>12 questions. 12 dimensions. Your political shape compared to every senator and rep in our database.</div>
          </div>
        </div>

        {/* Badge row */}
        <div style={{
          display: "flex",
          gap: 6,
          marginBottom: 16,
          flexWrap: "wrap",
        }}>
          {["Progressive Hawk", "Pragmatic Centrist", "Classic Libertarian", "Green Democrat"].map(badge => (
            <div key={badge} style={{
              background: T.surface2,
              border: `0.5px solid ${T.border}`,
              borderRadius: 20,
              padding: "3px 10px",
              fontFamily: "Arial",
              fontSize: 11,
              color: T.text2,
            }}>{badge}</div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={handleTake}
            style={{
              flex: 1,
              background: T.gold,
              border: "none",
              borderRadius: 8,
              padding: "12px 0",
              fontFamily: "Arial Black, Arial",
              fontWeight: 900,
              fontSize: 14,
              color: "#0A0B0D",
              cursor: "pointer",
              letterSpacing: "0.03em",
            }}
          >FIND YOUR SHAPE →</button>
          <button
            onClick={handleDismiss}
            style={{
              background: "transparent",
              border: `0.5px solid ${T.border}`,
              borderRadius: 8,
              padding: "12px 16px",
              fontFamily: "Arial",
              fontSize: 13,
              color: T.text2,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >Keep browsing</button>
        </div>
      </div>
    </div>
  );
}

// ── Mini thumbprint preview ───────────────────────────────────────────────────
function ThumbprintPreview() {
  const size = 72;
  const cx = size / 2, cy = size / 2;
  const maxR = size / 2 - 8;
  const n = 12;
  // Example shape — varied to look interesting
  const vals = [0.8, 0.3, 0.9, 0.5, 0.6, 0.2, 0.7, 0.9, 0.4, 0.6, 0.8, 0.3];

  const getPoint = (i, r) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const rings = [0.33, 0.66, 1.0].map(f =>
    Array.from({ length: n }, (_, i) => getPoint(i, maxR * f))
      .map((p, j) => (j === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
      .join(" ") + "Z"
  );

  const userPoints = vals.map((v, i) => getPoint(i, maxR * Math.max(0.1, v)));
  const userPath = userPoints.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") + "Z";

  return (
    <svg width={size} height={size} style={{ flexShrink: 0, filter: `drop-shadow(0 0 8px ${"#C9A84C"}44)` }}>
      {rings.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
      ))}
      <path d={userPath} fill="#C9A84C18" stroke="#C9A84C" strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={cx} cy={cy} r={2} fill="#C9A84C" />
    </svg>
  );
}
