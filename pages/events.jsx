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

const PLACEHOLDER_EVENTS = [
  { title: "Town Hall: Healthcare Reform",  date: "May 3, 2026",  location: "Your local district office", dimension: "healthcare", color: "#c94c78" },
  { title: "Voter Registration Drive",       date: "May 10, 2026", location: "Community center near you",   dimension: "voting",     color: "#c94c9e" },
  { title: "Rally: Climate Action",          date: "May 17, 2026", location: "City hall plaza",             dimension: "climate",    color: "#4ca87c" },
];

const GLOBAL_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0b0d; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
`;

export default function EventsPage() {
  const [zip, setZip] = useState("");

  return (
    <>
      <Head><title>Local Events — Throughline</title></Head>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Arial" }}>
        <Nav />
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "48px 20px 60px", animation: "fadeIn 0.4s ease forwards" }}>

          <div style={{ display: "inline-block", fontFamily: "Arial Black", fontSize: 9, letterSpacing: "0.25em", color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 6, padding: "3px 10px", marginBottom: 24 }}>
            COMING SOON
          </div>

          <h1 style={{ fontFamily: "Arial Black", fontSize: "clamp(28px,6vw,40px)", color: C.gold, lineHeight: 1.1, marginBottom: 16, letterSpacing: "0.02em" }}>
            LOCAL EVENTS
          </h1>

          <p style={{ fontFamily: "Arial", fontSize: 15, color: C.text2, lineHeight: 1.7, marginBottom: 36, maxWidth: 480 }}>
            Find rallies, town halls, voter registration drives, and political events near you — filtered to issues that match your beliefs.
          </p>

          <div style={{ display: "flex", gap: 10, marginBottom: 40, flexWrap: "wrap" }}>
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
              onClick={() => alert("Coming soon — local events will appear here once the feature launches!")}
              style={{ fontFamily: "Arial Black", fontSize: 12, letterSpacing: "0.06em", padding: "12px 24px", borderRadius: 8, background: C.gold, color: "#0a0b0d", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              FIND EVENTS
            </button>
          </div>

          <div style={{ fontFamily: "Arial Black", fontSize: 11, letterSpacing: "0.2em", color: C.text2, marginBottom: 16 }}>
            UPCOMING EVENTS
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }}>
            {PLACEHOLDER_EVENTS.map((ev, i) => (
              <div key={i} style={{
                background: C.surface, borderRadius: 12,
                border: `1px solid ${ev.color}44`,
                padding: 20,
                animation: `fadeIn 0.4s ease ${i * 0.08}s both`,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <div style={{ fontFamily: "Arial Black", fontSize: 15, color: C.text, lineHeight: 1.2 }}>{ev.title}</div>
                  <div style={{ fontFamily: "Arial Black", fontSize: 9, letterSpacing: "0.1em", padding: "3px 8px", borderRadius: 4, background: ev.color + "22", color: ev.color, border: `1px solid ${ev.color}44`, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {ev.dimension.toUpperCase()}
                  </div>
                </div>
                <div style={{ fontFamily: "Arial", fontSize: 12, color: C.text2, marginBottom: 2 }}>{ev.date}</div>
                <div style={{ fontFamily: "Arial", fontSize: 12, color: C.text2, marginBottom: 16 }}>{ev.location}</div>
                <button
                  onClick={() => alert("Coming soon — RSVP functionality will be available when local events launch!")}
                  style={{ fontFamily: "Arial Black", fontSize: 11, letterSpacing: "0.06em", padding: "7px 16px", borderRadius: 6, background: "transparent", color: ev.color, border: `1.5px solid ${ev.color}66`, cursor: "pointer" }}
                >
                  RSVP →
                </button>
              </div>
            ))}
          </div>

          <div style={{ fontFamily: "Arial", fontSize: 13, color: C.text2, textAlign: "center", lineHeight: 1.7 }}>
            More events coming soon.<br />We're building integrations with Mobilize, Eventbrite, and local civic organizations.
          </div>

        </div>
      </div>
    </>
  );
}
