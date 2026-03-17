import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:            "#0a0b0d",
  bgCard:        "#11131a",
  bgDeep:        "#0d0f14",
  gold:          "#c9a84c",
  goldBorder:    "rgba(201,168,76,0.35)",
  goldBorderDim: "rgba(201,168,76,0.12)",
  parchment:     "#e8dfc8",
  parchmentDim:  "#a89d88",
  green:         "#4ca87c",
  red:           "#c94c4c",
  blue:          "#4c78c9",
  purple:        "#8e4cc9",
  white:         "#ffffff",
};

const TABS = [
  { id: "receipt",   label: "The Receipt"    },
  { id: "throughline",label: "The Throughline"},
  { id: "compare",   label: "Compare Me"     },
  { id: "district",  label: "District"       },
  { id: "voting",    label: "Voting Record"  },
  { id: "network",   label: "Network"        },
  { id: "timeline",  label: "Timeline"       },
];

// ── Mock data (replaced by real FEC data in Phase 2F) ─────────────────────────
const MOCK_DONORS = [
  { pac: "PhRMA PAC",          industry: "Pharmaceutical", dimension: "healthcare", amount: 1200000, goal: "Block Medicare drug price negotiation",           date: "Mar 14, 2024", color: "#c94c78" },
  { pac: "American Petroleum Institute PAC", industry: "Oil & Gas", dimension: "climate", amount: 840000, goal: "Oppose clean energy mandates",              date: "Nov 2, 2023",  color: "#4ca87c" },
  { pac: "Wall Street PAC",    industry: "Finance",        dimension: "economic",  amount: 620000, goal: "Weaken Dodd-Frank consumer protections",            date: "Aug 8, 2023",  color: "#c9a84c" },
];

const MOCK_THROUGHLINES = [
  {
    pac: "PhRMA PAC", industry: "Pharmaceutical", mission: "The pharmaceutical industry's primary lobbying arm, representing over 30 major drug companies.",
    goal: "Block legislation allowing Medicare to negotiate drug prices directly with manufacturers.",
    totalDonated: "$1.2M", donationDate: "Mar 14, 2024", billName: "Medicare Drug Price Negotiation Act", billSection: "Section 1192",
    billId: "HR-5376", voteDate: "Jun 11, 2024", daysBetween: 89, howVoted: "NO",
    voteImpact: "Blocked Medicare from negotiating lower drug prices for 64 million seniors.",
    excerpt: "…the Secretary shall negotiate directly with manufacturers to establish maximum fair prices for selected drugs…",
    narrative: "Eighty-nine days after receiving $1.2 million from the pharmaceutical industry's top lobbying arm, Sen. McConnell cast the deciding vote against a bill that would have allowed Medicare to negotiate lower drug prices for seniors. The vote saved pharmaceutical companies an estimated $100 billion in revenue over the next decade.",
    corruptionPoints: 18, dimension: "healthcare", color: "#c94c78",
  },
  {
    pac: "American Petroleum Institute PAC", industry: "Oil & Gas", mission: "The oil and gas industry's largest trade association, representing ExxonMobil, Chevron, and BP.",
    goal: "Defeat clean energy mandates and protect fossil fuel subsidies.",
    totalDonated: "$840K", donationDate: "Nov 2, 2023", billName: "Clean Energy Transition Act", billSection: "Section 45Q",
    billId: "S-2332", voteDate: "Jan 29, 2024", daysBetween: 88, howVoted: "NO",
    voteImpact: "Eliminated $42 billion in clean energy tax credits and delayed offshore wind development.",
    excerpt: "…establishes a tax credit of $50 per metric ton of qualified carbon oxide captured and disposed of in secure geological storage…",
    narrative: "Less than three months after a $840,000 contribution from the oil and gas industry's largest trade group, the senator voted to strip clean energy tax credits that would have accelerated the US transition away from fossil fuels.",
    corruptionPoints: 15, dimension: "climate", color: "#4ca87c",
  },
];

const MOCK_VOTES = [
  { bill: "Medicare Drug Price Negotiation Act", date: "Jun 11, 2024", vote: "NO",  dimension: "healthcare", impact: "Blocked Medicare drug price negotiation for seniors."       },
  { bill: "Clean Energy Transition Act",         date: "Jan 29, 2024", vote: "NO",  dimension: "climate",    impact: "Eliminated $42B in clean energy tax credits."              },
  { bill: "Bipartisan Infrastructure Law",       date: "Aug 10, 2023", vote: "YES", dimension: "housing",    impact: "Authorized $1.2T for roads, bridges, and broadband."       },
  { bill: "SAFE Banking Act",                    date: "May 2, 2023",  vote: "NO",  dimension: "economic",   impact: "Blocked federal cannabis banking protections."             },
  { bill: "Electoral Count Reform Act",          date: "Dec 22, 2022", vote: "YES", dimension: "voting",     impact: "Clarified VP role in certifying election results."         },
  { bill: "Assault Weapons Ban",                 date: "Jul 29, 2022", vote: "NO",  dimension: "guns",       impact: "Failed to ban semi-automatic rifles and large magazines."  },
];

// ── Global styles ─────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800&family=Playfair+Display:ital,wght@1,400;1,700&family=Inter:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0b0d; }
  @keyframes tlTravel {
    0%   { left: 0; opacity: 1; }
    80%  { left: calc(100% - 10px); opacity: 1; }
    82%  { left: calc(100% - 10px); opacity: 0; }
    84%  { left: 0; opacity: 0; }
    100% { left: 0; opacity: 1; }
  }
  @keyframes dotPulse {
    0%   { transform: scale(1); opacity: 1; }
    50%  { transform: scale(1.6); opacity: 0.5; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

// ── DAS colour helper ─────────────────────────────────────────────────────────
function dasColor(score) {
  if (score === null || score === undefined) return C.parchmentDim;
  if (score <= 33) return C.green;
  if (score <= 66) return C.gold;
  return C.red;
}

function avgDonationColor(avg) {
  if (!avg) return C.parchmentDim;
  if (avg < 50)  return C.green;
  if (avg < 500) return C.gold;
  return C.red;
}

// ── Shared button style ───────────────────────────────────────────────────────
const btnWhite = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 800, fontSize: 13, letterSpacing: "0.1em",
  color: "#0a0b0d", backgroundColor: "#ffffff",
  border: "2px solid #ffffff", borderRadius: 2,
  padding: "7px 16px", cursor: "pointer",
  transition: "transform 0.1s, box-shadow 0.1s",
};
const btnGold = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 700, fontSize: 13, letterSpacing: "0.1em",
  color: "#0a0b0d", backgroundColor: C.gold,
  border: `2px solid ${C.gold}`, borderRadius: 2,
  padding: "7px 16px", cursor: "pointer",
  transition: "transform 0.1s, box-shadow 0.1s",
};
const btnFollowing = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 700, fontSize: 13, letterSpacing: "0.1em",
  color: C.green, backgroundColor: "rgba(76,168,124,0.1)",
  border: `2px solid ${C.green}`, borderRadius: 2,
  padding: "7px 16px", cursor: "default",
};

function sinkHover(e)   { e.currentTarget.style.transform = "scale(0.96)"; e.currentTarget.style.boxShadow = "inset 0 2px 5px rgba(0,0,0,0.25)"; }
function sinkLeave(e)   { e.currentTarget.style.transform = "scale(1)";    e.currentTarget.style.boxShadow = "none"; }

// ── Tab: The Receipt ──────────────────────────────────────────────────────────
function TabReceipt({ politician }) {
  const total = MOCK_DONORS.reduce((s, d) => s + d.amount, 0);
  return (
    <div style={{ padding: "0 0 40px" }}>
      <div style={{ marginBottom: 24 }}>
        {MOCK_DONORS.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: `1px solid ${C.goldBorderDim}`, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "#161922"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{ width: 4, alignSelf: "stretch", background: d.color, flexShrink: 0 }} />
            <div style={{ flex: 1, padding: "14px 14px 14px 12px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, color: C.parchment, marginBottom: 2 }}>{d.pac}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: d.color, marginBottom: 4 }}>{d.industry}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.5 }}>{d.goal}</div>
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.gold, flexShrink: 0 }}>
                  ${(d.amount / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 14px 14px 0", color: C.parchmentDim, fontSize: 14 }}>›</div>
          </div>
        ))}
      </div>

      {/* Receipt footer */}
      <div style={{ background: C.bgDeep, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: "16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>Top 3 Donor Total</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 28, color: C.gold }}>${(total / 1000000).toFixed(1)}M</div>
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 12, color: C.parchmentDim, lineHeight: 1.5 }}>
          This represents the top donor contributions tracked in our FEC data. Full donor breakdown available in journalist view.
        </div>
      </div>

      {/* Share strip */}
      <div style={{ display: "flex", gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.goldBorderDim}` }}>
        {[
          { icon: "🔗", label: "Copy link"    },
          { icon: "↑",  label: "Share"        },
          { icon: "↓",  label: "Save image"   },
          { icon: "📄", label: "Export PDF",  premium: true },
        ].map(a => (
          <button key={a.label}
            title={a.label}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", color: a.premium ? C.gold : C.parchmentDim, background: "transparent", border: `1px solid ${a.premium ? C.goldBorder : "rgba(255,255,255,0.1)"}`, borderRadius: 2, padding: "7px 12px", cursor: "pointer" }}
          >
            {a.icon} {a.label.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tab: The Throughline ──────────────────────────────────────────────────────
function TabThroughline() {
  const [activeIdx, setActiveIdx] = useState(0);
  const tl = MOCK_THROUGHLINES[activeIdx];

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Sub-tab bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${C.goldBorderDim}`, overflowX: "auto" }}>
        {MOCK_THROUGHLINES.map((t, i) => (
          <button key={i} onClick={() => setActiveIdx(i)}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", padding: "10px 18px", background: "transparent", border: "none", cursor: "pointer", borderBottom: i === activeIdx ? `2px solid ${C.gold}` : "2px solid transparent", color: i === activeIdx ? C.gold : C.parchmentDim, whiteSpace: "nowrap", transition: "color 0.2s" }}
          >
            {t.industry.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Donor card */}
      <div style={{ background: C.bgDeep, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.parchment }}>{tl.pac}</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", padding: "3px 8px", borderRadius: 2, background: tl.color + "22", color: tl.color, border: `1px solid ${tl.color}44` }}>{tl.industry}</div>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, color: C.gold, marginBottom: 8 }}>{tl.totalDonated} donated</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.6, marginBottom: 6 }}>{tl.mission}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchment, lineHeight: 1.6 }}><strong>What they wanted:</strong> {tl.goal}</div>
      </div>

      {/* Timeline animation */}
      <div style={{ background: C.bgDeep, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: "20px 16px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, position: "relative", marginBottom: 16 }}>
          {/* Left node */}
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.gold, margin: "0 auto 6px" }} />
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: "0.12em", color: C.parchmentDim, textTransform: "uppercase" }}>Donation</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: C.parchment }}>{tl.donationDate}</div>
          </div>

          {/* Line */}
          <div style={{ flex: 1, position: "relative", height: 2, background: "rgba(201,168,76,0.2)", margin: "0 12px" }}>
            <div style={{ position: "absolute", top: -4, width: 10, height: 10, borderRadius: "50%", background: C.gold, animation: "tlTravel 3s ease-in-out infinite" }} />
            <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 13, color: C.gold, whiteSpace: "nowrap" }}>
              {tl.daysBetween} DAYS LATER
            </div>
          </div>

          {/* Right node */}
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: tl.howVoted === "YES" ? C.green : C.red, margin: "0 auto 6px", animation: "dotPulse 1.5s ease-in-out 3.2s 3" }} />
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: "0.12em", color: C.parchmentDim, textTransform: "uppercase" }}>Vote cast</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: C.parchment }}>{tl.voteDate}</div>
          </div>
        </div>
      </div>

      {/* Bill card */}
      <div style={{ background: C.bgDeep, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: 16, marginBottom: 20 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17, color: C.parchment, marginBottom: 4 }}>{tl.billName}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, marginBottom: 12 }}>{tl.billSection} · {tl.billId} · {tl.voteDate}</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 28, color: tl.howVoted === "YES" ? C.green : C.red, marginBottom: 12 }}>
          VOTED {tl.howVoted}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchment, lineHeight: 1.6, marginBottom: 14 }}>{tl.voteImpact}</div>
        <div style={{ borderLeft: `3px solid ${C.gold}`, paddingLeft: 12, fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 12, color: C.parchmentDim, lineHeight: 1.6 }}>
          {tl.excerpt}
        </div>
      </div>

      {/* Narrative */}
      <div style={{ borderLeft: `3px solid ${C.gold}`, paddingLeft: 16, background: C.bgDeep, padding: "16px 16px 16px 16px", borderRadius: "0 2px 2px 0", marginBottom: 12 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 14, color: C.parchment, lineHeight: 1.75 }}>
          {tl.narrative}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: C.red, marginTop: 12, letterSpacing: "0.1em" }}>
          +{tl.corruptionPoints} POINTS TO DONOR ALIGNMENT SCORE
        </div>
      </div>
    </div>
  );
}

// ── Tab: Compare Me ───────────────────────────────────────────────────────────
function TabCompare() {
  const statedVsVoted = [
    { issue: "Drug pricing",   stated: "Supports price controls",          actual: "Voted against Medicare negotiation", match: false },
    { issue: "Infrastructure", stated: "Supports investment",              actual: "Voted YES on bipartisan bill",        match: true  },
    { issue: "Clean energy",   stated: "Supports energy independence",     actual: "Voted against clean energy credits",  match: false },
    { issue: "Banking reform", stated: "Supports strong financial rules",  actual: "Voted NO on consumer protections",    match: false },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Section 1 — no login required */}
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", color: C.parchmentDim, marginBottom: 12, textTransform: "uppercase" }}>Stated Position vs. Actual Votes</div>
      <div style={{ marginBottom: 32 }}>
        {statedVsVoted.map((row, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 0, borderBottom: `1px solid ${C.goldBorderDim}`, padding: "12px 0", alignItems: "start" }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: C.gold, marginBottom: 3 }}>{row.issue}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.5 }}>{row.stated}</div>
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchment, lineHeight: 1.5, paddingLeft: 16 }}>{row.actual}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", padding: "3px 10px", borderRadius: 2, background: row.match ? "rgba(76,168,124,0.12)" : "rgba(201,76,76,0.12)", color: row.match ? C.green : C.red, border: `1px solid ${row.match ? C.green : C.red}44`, whiteSpace: "nowrap" }}>
              {row.match ? "ALIGNED" : "MISMATCH"}
            </div>
          </div>
        ))}
      </div>

      {/* Section 2 — gated */}
      <div style={{ position: "relative", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ filter: "blur(4px)", pointerEvents: "none", padding: 20, background: C.bgDeep, border: `1px solid ${C.goldBorderDim}` }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 48, color: C.gold, textAlign: "center" }}>78%</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            {["Economic Policy", "Healthcare", "Climate & Energy"].map(d => (
              <div key={d} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, width: 120, flexShrink: 0 }}>{d}</div>
                <div style={{ flex: 1, height: 4, background: C.bgCard, borderRadius: 2 }}>
                  <div style={{ width: "60%", height: "100%", background: C.gold, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,11,13,0.7)" }}>
          <div style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 18, color: C.parchment, marginBottom: 8, lineHeight: 1.3 }}>How well does this politician<br />actually represent <em>you?</em></div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, marginBottom: 18 }}>Take the quiz to see your personal match score across all 12 dimensions.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button style={btnGold} onMouseEnter={sinkHover} onMouseLeave={sinkLeave}>TAKE THE QUIZ</button>
              <button style={{ ...btnWhite, fontSize: 12, padding: "7px 14px" }} onMouseEnter={sinkHover} onMouseLeave={sinkLeave}>SIGN IN</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Voting Record ────────────────────────────────────────────────────────
function TabVoting() {
  const [filter, setFilter] = useState(null);
  const DIMS = ["healthcare", "climate", "economic", "housing", "voting", "guns"];

  const filtered = filter ? MOCK_VOTES.filter(v => v.dimension === filter) : MOCK_VOTES;

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        <button onClick={() => setFilter(null)}
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", padding: "5px 12px", borderRadius: 2, border: `1px solid ${filter === null ? C.gold : C.goldBorderDim}`, background: filter === null ? "rgba(201,168,76,0.12)" : "transparent", color: filter === null ? C.gold : C.parchmentDim, cursor: "pointer" }}>
          ALL
        </button>
        {DIMS.map(d => (
          <button key={d} onClick={() => setFilter(d === filter ? null : d)}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", padding: "5px 12px", borderRadius: 2, border: `1px solid ${filter === d ? C.gold : C.goldBorderDim}`, background: filter === d ? "rgba(201,168,76,0.12)" : "transparent", color: filter === d ? C.gold : C.parchmentDim, cursor: "pointer", textTransform: "uppercase" }}>
            {d}
          </button>
        ))}
      </div>

      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, marginBottom: 16 }}>{filtered.length} votes tracked</div>

      {filtered.map((v, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: `1px solid ${C.goldBorderDim}` }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: v.vote === "YES" ? C.green : C.red, width: 50, flexShrink: 0 }}>{v.vote}</div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: C.parchment, marginBottom: 3 }}>{v.bill}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, marginBottom: 4 }}>{v.date}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.5 }}>{v.impact}</div>
          </div>
          <div style={{ marginLeft: "auto", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: "0.1em", padding: "3px 8px", borderRadius: 2, background: "rgba(201,168,76,0.08)", color: C.gold, border: `1px solid ${C.goldBorderDim}`, whiteSpace: "nowrap", flexShrink: 0, textTransform: "uppercase" }}>
            {v.dimension}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Placeholder tab ───────────────────────────────────────────────────────────
function TabPlaceholder({ label, description }) {
  return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: C.parchmentDim, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim, lineHeight: 1.6, maxWidth: 360, margin: "0 auto" }}>{description}</div>
    </div>
  );
}

// ── Sign-in modal ─────────────────────────────────────────────────────────────
function SignInModal({ name, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bgCard, border: `1px solid ${C.goldBorder}`, borderRadius: 2, padding: "32px 28px", maxWidth: 340, width: "90%", textAlign: "center" }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: "0.3em", color: C.gold, marginBottom: 10 }}>ONE QUICK STEP</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 21, color: C.parchment, lineHeight: 1.25, marginBottom: 8 }}>
          Follow <span style={{ color: C.gold }}>{name}</span>
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.6, marginBottom: 22 }}>
          Free account. We'll alert you whenever a new donation-to-vote connection is found.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          <button style={{ ...btnWhite, width: "100%", fontSize: 15, padding: 13 }} onMouseEnter={sinkHover} onMouseLeave={sinkLeave}>CREATE FREE ACCOUNT</button>
          <button style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: "0.12em", color: C.gold, background: "transparent", border: `2px solid rgba(201,168,76,0.4)`, borderRadius: 2, padding: 13, cursor: "pointer", width: "100%" }}>SIGN IN</button>
        </div>
        <button onClick={onClose} style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, background: "none", border: "none", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>maybe later</button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PoliticianPage({ politician }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("receipt");
  const [isFollowing, setIsFollowing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const heroRef = useRef(null);

  // Sticky header on scroll
  useEffect(() => {
    const onScroll = () => {
      if (heroRef.current) {
        setIsSticky(window.scrollY > heroRef.current.offsetHeight - 80);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (router.isFallback) {
    return <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.parchment, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18 }}>LOADING…</div>;
  }

  if (!politician) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <style>{GLOBAL_STYLES}</style>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 32, color: C.parchment }}>NOT FOUND</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim, textAlign: "center" }}>This politician isn't in our database yet.</div>
        <button onClick={() => router.push("/")} style={btnGold} onMouseEnter={sinkHover} onMouseLeave={sinkLeave}>← BACK TO SEARCH</button>
      </div>
    );
  }

  const { name, party, state, chamber, donor_alignment_score, bioguide_id, slug } = politician;

  const partyColor  = party === "D" ? C.blue : party === "R" ? C.red : C.purple;
  const partyLabel  = party === "D" ? "Democrat" : party === "R" ? "Republican" : "Independent";
  const initials    = name.split(" ").map(w => w[0]).slice(0, 2).join("");
  const photoUrl    = bioguide_id ? `https://bioguide.congress.gov/bioguide/photo/${bioguide_id[0]}/${bioguide_id}.jpg` : null;
  const das         = donor_alignment_score;

  const handleFollow = () => {
    if (isFollowing) return;
    setShowModal(true);
  };

  const confirmFollow = () => {
    setIsFollowing(true);
    setShowModal(false);
  };

  const followButton = isFollowing
    ? <button style={btnFollowing}>✓ FOLLOWING</button>
    : <button style={btnWhite} onMouseEnter={sinkHover} onMouseLeave={sinkLeave} onClick={handleFollow}>+ FOLLOW</button>;

  return (
    <>
      <Head>
        <title>{name} · Throughline</title>
        <meta name="description" content={`Track ${name}'s donor relationships and voting record. Donor Alignment Score: ${das ?? "pending"}.`} />
      </Head>
      <style>{GLOBAL_STYLES}</style>

      <div style={{ background: C.bg, color: C.parchment, fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>

        {/* ── STICKY HEADER ─────────────────────────────── */}
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
          background: C.bgCard, borderBottom: `1px solid ${C.goldBorderDim}`,
          transform: isSticky ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.25s ease",
          padding: "10px 20px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          {/* Avatar */}
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: partyColor + "33", color: partyColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 13, flexShrink: 0, overflow: "hidden" }}>
            {photoUrl ? <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} /> : initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.parchment, lineHeight: 1, marginBottom: 2 }}>{name}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim }}>{partyLabel} · {state} · {chamber}</div>
          </div>

          {das !== null && das !== undefined && (
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.parchmentDim }}>DAS</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: dasColor(das), lineHeight: 1 }}>{das}</div>
            </div>
          )}

          {followButton}
        </div>

        {/* ── HERO ──────────────────────────────────────── */}
        <div ref={heroRef} style={{ position: "relative", minHeight: 280, background: C.bgCard, overflow: "hidden" }}>
          {/* Background photo */}
          {photoUrl && (
            <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", opacity: 0.35 }} onError={e => e.target.style.display = "none"} />
            </div>
          )}

          {/* Top vignette */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, background: `linear-gradient(to bottom, ${C.bg}, transparent)` }} />

          {/* Bottom vignette */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, background: `linear-gradient(to top, ${C.bg}, transparent)` }} />

          {/* Nav bar inside hero */}
          <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
            <button onClick={() => router.push("/")} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: C.gold, background: "transparent", border: "none", cursor: "pointer" }}>
              ← THROUGHLINE
            </button>
          </div>

          {/* Nameplate */}
          <div style={{ position: "relative", zIndex: 2, padding: "40px 20px 32px" }}>
            {/* Avatar */}
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: partyColor + "33", color: partyColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, border: `2px solid ${partyColor}66`, marginBottom: 14, overflow: "hidden" }}>
              {photoUrl ? <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} onError={e => { e.target.style.display = "none"; }} /> : initials}
            </div>

            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 6vw, 44px)", color: C.parchment, lineHeight: 1.05, marginBottom: 8 }}>
              {name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", padding: "3px 10px", borderRadius: 2, background: partyColor + "22", color: partyColor, border: `1px solid ${partyColor}44` }}>
                {partyLabel.toUpperCase()}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim }}>{state} · {chamber}</div>
            </div>
          </div>
        </div>

        {/* ── FOLLOWER ROW ───────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${C.goldBorderDim}`, gap: 12 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim }}>
            3,847 followers · FEC data through Q4 2024
          </div>
          {followButton}
        </div>

        {/* ── STAT CARDS ─────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "16px 20px" }}>
          {/* Your Match */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: 12, textAlign: "center" }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.parchmentDim, marginBottom: 6 }}>Your Match</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 11, color: C.parchmentDim }}>🔒 TAKE QUIZ</div>
          </div>

          {/* Avg Donation */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: 12, textAlign: "center" }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.parchmentDim, marginBottom: 6 }}>Avg Gift</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: avgDonationColor(2400) }}>$2.4k</div>
          </div>

          {/* DAS */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: 12, textAlign: "center" }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.parchmentDim, marginBottom: 6 }}>
              Donor Alignment Score
            </div>
            {das !== null && das !== undefined
              ? <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: dasColor(das) }}>{das}</div>
              : <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: C.parchmentDim }}>— PENDING</div>
            }
          </div>
        </div>

        {/* ── TAB BAR ────────────────────────────────────── */}
        <div style={{ position: "sticky", top: isSticky ? 57 : 0, zIndex: 100, background: C.bg, borderBottom: `1px solid ${C.goldBorderDim}` }}>
          <div style={{ display: "flex", overflowX: "auto", padding: "0 20px", gap: 0, msOverflowStyle: "none", scrollbarWidth: "none" }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", borderBottom: activeTab === tab.id ? `2px solid ${C.gold}` : "2px solid transparent", color: activeTab === tab.id ? C.gold : C.parchmentDim, whiteSpace: "nowrap", transition: "color 0.2s" }}
              >
                {tab.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── TAB CONTENT ────────────────────────────────── */}
        <div style={{ padding: "24px 20px", maxWidth: 640, margin: "0 auto" }}>
          {activeTab === "receipt"    && <TabReceipt politician={politician} />}
          {activeTab === "throughline"&& <TabThroughline />}
          {activeTab === "compare"    && <TabCompare />}
          {activeTab === "voting"     && <TabVoting />}
          {activeTab === "district"   && <TabPlaceholder label="District" description="Constituent demographics and needs compared against voting record. Coming when Census data integration is live." />}
          {activeTab === "network"    && <TabPlaceholder label="Network" description="Politicians funded by the same PACs, and who votes in near-identical patterns. Coming in Phase 4." />}
          {activeTab === "timeline"   && <TabPlaceholder label="Timeline" description="Full career arc — donation events and corresponding votes plotted chronologically. Coming in Phase 4." />}
        </div>

        {/* Sign-in modal */}
        {showModal && <SignInModal name={name} onClose={() => setShowModal(false)} />}
      </div>
    </>
  );
}

// ── Data fetching ─────────────────────────────────────────────────────────────
export async function getServerSideProps({ params }) {
  const { slug } = params;

  const { data, error } = await supabase
    .from("politicians")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return { props: { politician: null } };
  }

  return { props: { politician: data } };
}
