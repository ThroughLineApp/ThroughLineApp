import { useState } from "react";
import Head from "next/head";
import Nav from "../components/Nav";

const C = {
  bg:            "#0a0b0d",
  surface:       "#111318",
  gold:          "#c9a84c",
  goldBorderDim: "rgba(201,168,76,0.12)",
  text:          "#f0ece4",
  text2:         "#9a9488",
};

const GLOBAL_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0b0d; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
`;

export default function CallPage() {
  const [zip, setZip] = useState("");

  return (
    <>
      <Head><title>Call Your Rep — Throughline</title></Head>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Arial" }}>
        <Nav />
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px", animation: "fadeIn 0.4s ease forwards" }}>

          <div style={{ display: "inline-block", fontFamily: "Arial Black", fontSize: 9, letterSpacing: "0.25em", color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 6, padding: "3px 10px", marginBottom: 24 }}>
            COMING SOON
          </div>

          <h1 style={{ fontFamily: "Arial Black", fontSize: "clamp(28px,6vw,40px)", color: C.gold, lineHeight: 1.1, marginBottom: 16, letterSpacing: "0.02em" }}>
            CALL YOUR REP
          </h1>

          <p style={{ fontFamily: "Arial", fontSize: 15, color: C.text2, lineHeight: 1.7, marginBottom: 40, maxWidth: 480 }}>
            We're building a tool that finds your representative and generates a personalized call script based on your beliefs and this vote.
          </p>

          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={zip}
              onChange={e => setZip(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter your ZIP code"
              style={{
                flex: 1, minWidth: 180,
                background: C.surface, color: C.text,
                border: `1.5px solid ${C.goldBorderDim}`,
                borderRadius: 8, padding: "12px 16px",
                fontFamily: "Arial", fontSize: 15, outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = C.gold}
              onBlur={e  => e.target.style.borderColor = C.goldBorderDim}
            />
            <button
              onClick={() => alert("Coming soon — check back when this feature launches!")}
              style={{ fontFamily: "Arial Black", fontSize: 12, letterSpacing: "0.06em", padding: "12px 24px", borderRadius: 8, background: C.gold, color: "#0a0b0d", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              FIND MY REP
            </button>
          </div>

          <p style={{ fontFamily: "Arial", fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
            Your ZIP code is used only to match you to your congressional district. We don't store it.
          </p>

        </div>
      </div>
    </>
  );
}
