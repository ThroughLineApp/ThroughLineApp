// components/ZipBanner.jsx
// Persistent top banner shown to users who haven't set their ZIP.
// Dismissable (persists in localStorage). Opens ZipPrompt inline.

import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import ZipPrompt from "./ZipPrompt";

const C = {
  gold:    "#C9A84C",
  bg:      "#111318",
  text:    "#F0ECE4",
  text2:   "#9A9488",
  border:  "rgba(255,255,255,0.08)",
};

const STORAGE_KEY = "zipBannerDismissed";

export default function ZipBanner() {
  const { user, profile, needsZip, refreshProfile } = useAuth();
  const [dismissed, setDismissed] = useState(true); // start hidden, check localStorage
  const [showPrompt, setShowPrompt] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const wasDismissed = localStorage.getItem(STORAGE_KEY) === "1";
      setDismissed(wasDismissed);
    } catch {
      setDismissed(false);
    }
  }, []);

  // Hide if: not mounted, no user, no needsZip, or dismissed
  if (!mounted || !user || !needsZip || dismissed) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (_) {}
    setDismissed(true);
    setShowPrompt(false);
  };

  const handleComplete = () => {
    refreshProfile();
    handleDismiss();
  };

  return (
    <div style={{
      position:   "fixed",
      top:        0,
      left:       0,
      right:      0,
      zIndex:     300,
    }}>
      {/* Banner bar */}
      <div style={{
        background:   C.bg,
        borderBottom: `1px solid ${C.border}`,
        display:      "flex",
        alignItems:   "center",
        justifyContent: "space-between",
        padding:      "0 16px",
        height:       44,
        gap:          12,
      }}>
        <span style={{
          fontFamily: "Arial",
          fontSize:   13,
          color:      C.text2,
          flex:       1,
          overflow:   "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}>
          📍 Add your ZIP to find your representatives
        </span>

        <button
          onClick={() => setShowPrompt(p => !p)}
          style={{
            background:    C.gold,
            color:         "#0A0B0D",
            border:        "none",
            borderRadius:  8,
            padding:       "5px 14px",
            fontFamily:    "Arial Black",
            fontSize:      11,
            letterSpacing: "0.08em",
            cursor:        "pointer",
            flexShrink:    0,
          }}
        >
          {showPrompt ? "CLOSE" : "ENTER ZIP →"}
        </button>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            background:  "none",
            border:      "none",
            color:       C.text2,
            cursor:      "pointer",
            fontSize:    18,
            lineHeight:  1,
            padding:     "4px 0 4px 4px",
            flexShrink:  0,
          }}
        >
          ×
        </button>
      </div>

      {/* Dropdown prompt */}
      {showPrompt && (
        <div style={{
          padding:      "12px 16px",
          background:   C.bg,
          borderBottom: `1px solid ${C.border}`,
          boxShadow:    "0 4px 20px rgba(0,0,0,0.5)",
        }}>
          <ZipPrompt
            context="feed"
            onComplete={handleComplete}
            onDismiss={handleDismiss}
          />
        </div>
      )}
    </div>
  );
}
