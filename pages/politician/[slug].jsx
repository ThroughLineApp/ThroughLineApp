import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import supabase from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import AuthModal from "../../components/AuthModal";

const C = {
  bg:            "#0a0b0d",
  bgCard:        "#11131a",
  bgDeep:        "#0d0f14",
  gold:          "#c9a84c",
  goldDim:       "#8a6e30",
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
  { id: "receipt",    label: "The Receipt"     },
  { id: "throughline",label: "The Throughline" },
  { id: "compare",    label: "Compare Me"      },
  { id: "district",   label: "District"        },
  { id: "voting",     label: "Voting Record"   },
  { id: "network",    label: "Network"         },
  { id: "timeline",   label: "Timeline"        },
];

const DIMENSION_COLORS = {
  economic:"#c9a84c", healthcare:"#c94c78", climate:"#4ca87c",
  criminal:"#c97c4c", immigration:"#4c78c9", foreign:"#8e4cc9",
  education:"#c98e4c", freedom:"#4cc9c9", guns:"#c94c4c",
  housing:"#78c94c", tech:"#4c8ec9", voting:"#c94c9e",
};

const DIMENSION_LABELS = {
  economic:"Economic Policy", healthcare:"Healthcare", climate:"Climate & Energy",
  criminal:"Criminal Justice", immigration:"Immigration", foreign:"Foreign Policy",
  education:"Education", freedom:"Personal Freedom", guns:"Gun Policy",
  housing:"Housing & Urban", tech:"Tech & Privacy", voting:"Electoral Rights",
};

const DIMS = Object.keys(DIMENSION_COLORS);

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800&family=Playfair+Display:ital,wght@1,400;1,700&family=Inter:wght@400;500&family=Figtree:wght@400;500;600;700&display=swap');
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
  @keyframes thumbDraw {
    from { stroke-dashoffset: 1400; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

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

function formatAmount(amt) {
  if (!amt) return "$0";
  if (amt >= 1000000) return `$${(amt / 1000000).toFixed(1)}M`;
  if (amt >= 1000)    return `$${(amt / 1000).toFixed(0)}K`;
  return `$${amt.toLocaleString()}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "Unknown date";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const btnWhite    = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.1em", color: "#0a0b0d", backgroundColor: "#ffffff", border: "2px solid #ffffff", borderRadius: 2, padding: "7px 16px", cursor: "pointer" };
const btnGold     = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: "#0a0b0d", backgroundColor: C.gold, border: `2px solid ${C.gold}`, borderRadius: 2, padding: "7px 16px", cursor: "pointer" };
const btnFollowing = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: C.green, backgroundColor: "rgba(76,168,124,0.1)", border: `2px solid ${C.green}`, borderRadius: 2, padding: "7px 16px", cursor: "pointer" };

function sinkHover(e)  { e.currentTarget.style.transform = "scale(0.96)"; e.currentTarget.style.boxShadow = "inset 0 2px 5px rgba(0,0,0,0.25)"; }
function sinkLeave(e)  { e.currentTarget.style.transform = "scale(1)";    e.currentTarget.style.boxShadow = "none"; }

function computeMatch(userScores, polScores) {
  const dims = DIMS;
  const validDims = dims.filter(d => userScores[d] != null && polScores[d] != null);
  if (!validDims.length) return null;
  const dist = Math.sqrt(validDims.reduce((sum, d) => sum + Math.pow(userScores[d] - polScores[d], 2), 0));
  const maxDist = Math.sqrt(validDims.length * 100 * 100);
  return Math.round(100 - (dist / maxDist) * 100);
}

function ThumbprintOverlay({ userScores, polScores, size = 220 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;

  const userPts = DIMS.map((dim, i) => {
    const angle = (Math.PI * 2 * i) / DIMS.length - Math.PI / 2;
    const rad = ((userScores[dim] ?? 50) / 100) * r;
    return [cx + rad * Math.cos(angle), cy + rad * Math.sin(angle)];
  });

  const polPts = DIMS.map((dim, i) => {
    const angle = (Math.PI * 2 * i) / DIMS.length - Math.PI / 2;
    const rad = ((polScores[dim] ?? 50) / 100) * r;
    return [cx + rad * Math.cos(angle), cy + rad * Math.sin(angle)];
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25,0.5,0.75,1.0].map(ring => {
        const rp = DIMS.map((_,i) => { const a=(Math.PI*2*i)/DIMS.length-Math.PI/2; return [cx+ring*r*Math.cos(a),cy+ring*r*Math.sin(a)]; });
        return <polygon key={ring} points={rp.map(p=>p.join(",")).join(" ")} fill="none" stroke="rgba(201,168,76,0.07)" strokeWidth="1"/>;
      })}
      {DIMS.map((_,i) => { const a=(Math.PI*2*i)/DIMS.length-Math.PI/2; return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="rgba(201,168,76,0.08)" strokeWidth="1"/>; })}
      <polygon points={polPts.map(p=>p.join(",")).join(" ")} fill="rgba(201,76,76,0.08)" stroke="rgba(201,76,76,0.5)" strokeWidth="1.5" strokeLinejoin="round"/>
      <polygon points={userPts.map(p=>p.join(",")).join(" ")} fill="rgba(76,168,124,0.1)" stroke="#4ca87c" strokeWidth="2" strokeLinejoin="round"
        style={{ strokeDasharray:1400, strokeDashoffset:1400, animation:"thumbDraw 1.8s ease forwards 0.3s" }}/>
      {DIMS.map((dim,i) => { const a=(Math.PI*2*i)/DIMS.length-Math.PI/2; const lr=r+20; return (
        <text key={dim} x={cx+lr*Math.cos(a)} y={cy+lr*Math.sin(a)} textAnchor="middle" dominantBaseline="middle"
          fontSize="7" fontFamily="'Barlow Condensed',sans-serif" fontWeight="700" fill={DIMENSION_COLORS[dim]} opacity={0.7}
        >{dim.slice(0,3).toUpperCase()}</text>
      );})}
    </svg>
  );
}

// ── Empty state shared component ─────────────────────────────────────────────
function EmptyState({ icon, title, body }) {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", animation: "fadeSlideIn 0.4s ease forwards" }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.parchmentDim, marginBottom: 10 }}>{title}</div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim, lineHeight: 1.7, maxWidth: 340, margin: "0 auto" }}>{body}</div>
    </div>
  );
}

// ── Tab: The Receipt ──────────────────────────────────────────────────────────
// Groups throughline_events by donor_pac_name, sums amounts, shows top donors
function TabReceipt({ politicianId }) {
  const [donors, setDonors]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!politicianId) return;
    setLoading(true);

    supabase
      .from("throughline_events")
      .select("donor_pac_name, donor_industry, donation_amount, dimension, donor_name")
      .eq("politician_id", politicianId)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setDonors([]);
          setLoading(false);
          return;
        }

        // Group by donor_pac_name, sum amounts
        const grouped = {};
        data.forEach(row => {
          const key = row.donor_pac_name || row.donor_name || "Unknown PAC";
          if (!grouped[key]) {
            grouped[key] = {
              pac:        key,
              industry:   row.donor_industry || "Unknown",
              dimension:  row.dimension || null,
              amount:     0,
              eventCount: 0,
            };
          }
          grouped[key].amount     += row.donation_amount || 0;
          grouped[key].eventCount += 1;
        });

        // Sort by amount desc, take top 10
        const sorted = Object.values(grouped)
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10);

        setDonors(sorted);
        setLoading(false);
      });
  }, [politicianId]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim }}>
        Loading donor data…
      </div>
    );
  }

  if (donors.length === 0) {
    return (
      <EmptyState
        icon="🧾"
        title="No Receipts Yet"
        body="We haven't matched donor contributions to votes for this politician yet. FEC data is being processed — check back soon."
      />
    );
  }

  const total = donors.reduce((s, d) => s + d.amount, 0);

  return (
    <div style={{ padding: "0 0 40px", animation: "fadeSlideIn 0.4s ease forwards" }}>
      <div style={{ marginBottom: 24 }}>
        {donors.map((d, i) => {
          const color = d.dimension ? DIMENSION_COLORS[d.dimension] : C.goldDim;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: `1px solid ${C.goldBorderDim}`, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#161922"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ width: 4, alignSelf: "stretch", background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: "14px 14px 14px 12px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, color: C.parchment, marginBottom: 2 }}>{d.pac}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color, marginBottom: 4 }}>{d.industry}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.5 }}>
                      {d.eventCount} donation-vote {d.eventCount === 1 ? "match" : "matches"} tracked
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.gold, flexShrink: 0 }}>{formatAmount(d.amount)}</div>
                </div>
              </div>
              <div style={{ padding: "14px 14px 14px 0", color: C.parchmentDim, fontSize: 14 }}>›</div>
            </div>
          );
        })}
      </div>

      <div style={{ background: C.bgDeep, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, letterSpacing: "0.1em", textTransform: "uppercase" }}>Top {donors.length} Donor Total</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 28, color: C.gold }}>{formatAmount(total)}</div>
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 12, color: C.parchmentDim, lineHeight: 1.5 }}>
          PAC contributions matched to roll-call votes from FEC bulk data. Full breakdown available in journalist view.
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.goldBorderDim}` }}>
        {[{ icon: "🔗", label: "Copy link" }, { icon: "↑", label: "Share" }, { icon: "↓", label: "Save image" }, { icon: "📄", label: "Export PDF", premium: true }].map(a => (
          <button key={a.label} title={a.label}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", color: a.premium ? C.gold : C.parchmentDim, background: "transparent", border: `1px solid ${a.premium ? C.goldBorder : "rgba(255,255,255,0.1)"}`, borderRadius: 2, padding: "7px 12px", cursor: "pointer" }}
          >{a.icon} {a.label.toUpperCase()}</button>
        ))}
      </div>
    </div>
  );
}

// ── Tab: The Throughline ──────────────────────────────────────────────────────
// Shows full event detail: PAC → donation date → vote date → how voted → impact
function TabThroughline({ politicianId }) {
  const [events, setEvents]   = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState(null);

  useEffect(() => {
    if (!politicianId) return;
    setLoading(true);

    supabase
      .from("throughline_events")
      .select(`
        donor_pac_name,
        donor_name,
        donor_industry,
        donor_mission,
        donor_goal,
        donation_amount,
        donation_date,
        bill_name,
        bill_section,
        bill_id,
        bill_link,
        vote_date,
        days_between,
        how_voted,
        vote_impact,
        relevant_excerpt,
        throughline_summary,
        dimension,
        corruption_contribution
      `)
      .eq("politician_id", politicianId)
      .order("corruption_contribution", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) { setEvents([]); setLoading(false); return; }
        setEvents(data);
        setLoading(false);
        setActiveIdx(0);
      });
  }, [politicianId]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim }}>
        Loading throughlines…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon="📍"
        title="No Throughlines Drawn Yet"
        body="We draw a throughline when we can match a PAC donation to a specific vote. Data for this politician is still being processed."
      />
    );
  }

  // Unique dimensions present in the events
  const presentDims = [...new Set(events.map(e => e.dimension).filter(Boolean))];
  const filtered = filter ? events.filter(e => e.dimension === filter) : events;

  // Clamp activeIdx if filter changed
  const safeIdx = Math.min(activeIdx, filtered.length - 1);
  const tl = filtered[safeIdx] || filtered[0];
  if (!tl) return null;

  const rawPac = tl.donor_pac_name || tl.donor_name || "";
  const pacName = (rawPac && !rawPac.match(/^C\d{8}$/i))
    ? rawPac
    : (tl.donor_industry ? tl.donor_industry + " PAC" : "Unknown PAC");
  const industry   = tl.donor_industry || "Unknown";
  const color      = tl.dimension ? DIMENSION_COLORS[tl.dimension] : C.gold;
  const howVoted   = tl.how_voted || "—";
  const voteColor  = ["yea","yes"].includes((howVoted).toLowerCase()) ? C.green : C.red;
  const days       = tl.days_between != null ? Math.abs(tl.days_between) : null;

  return (
    <div style={{ paddingBottom: 40, animation: "fadeSlideIn 0.4s ease forwards" }}>

      {/* Dimension filter tabs */}
      {presentDims.length > 1 && (
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${C.goldBorderDim}`, overflowX: "auto" }}>
          <button onClick={() => { setFilter(null); setActiveIdx(0); }}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", borderBottom: !filter ? `2px solid ${C.gold}` : "2px solid transparent", color: !filter ? C.gold : C.parchmentDim, whiteSpace: "nowrap" }}>
            ALL
          </button>
          {presentDims.map(dim => (
            <button key={dim} onClick={() => { setFilter(dim === filter ? null : dim); setActiveIdx(0); }}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", borderBottom: filter === dim ? `2px solid ${DIMENSION_COLORS[dim]}` : "2px solid transparent", color: filter === dim ? DIMENSION_COLORS[dim] : C.parchmentDim, whiteSpace: "nowrap" }}>
              {(DIMENSION_LABELS[dim] || dim).toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Event selector — horizontal scroll list */}
      {filtered.length > 1 && (
        <div style={{ display: "flex", gap: 0, marginBottom: 20, overflowX: "auto" }}>
          {filtered.slice(0, 20).map((e, i) => {
            const c = e.dimension ? DIMENSION_COLORS[e.dimension] : C.gold;
            return (
              <button key={i} onClick={() => setActiveIdx(i)}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", padding: "8px 14px", background: "transparent", border: "none", borderBottom: safeIdx === i ? `2px solid ${c}` : `2px solid ${C.goldBorderDim}`, cursor: "pointer", color: safeIdx === i ? c : C.parchmentDim, whiteSpace: "nowrap", flexShrink: 0 }}>
                {(e.donor_industry || "Unknown").toUpperCase().slice(0, 12)}
              </button>
            );
          })}
        </div>
      )}

      {/* PAC info card */}
      <div style={{ background: C.bgDeep, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: C.parchment }}>{pacName}</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", padding: "3px 8px", borderRadius: 2, background: color + "22", color, border: `1px solid ${color}44` }}>{industry}</div>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: C.gold, marginBottom: 8 }}>
          {formatAmount(tl.donation_amount)} donated
        </div>
        {tl.donor_mission && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.6, marginBottom: 6 }}>{tl.donor_mission}</div>
        )}
        {tl.donor_goal && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchment, lineHeight: 1.6 }}><strong>What they wanted:</strong> {tl.donor_goal}</div>
        )}
      </div>

      {/* Timeline animation */}
      <div style={{ background: C.bgDeep, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: "20px 16px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, position: "relative", marginBottom: 8 }}>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.gold, margin: "0 auto 6px" }} />
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: "0.12em", color: C.parchmentDim, textTransform: "uppercase" }}>Donation</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: C.parchment }}>{formatDate(tl.donation_date)}</div>
          </div>
          <div style={{ flex: 1, position: "relative", height: 2, background: "rgba(201,168,76,0.2)", margin: "0 12px" }}>
            <div style={{ position: "absolute", top: -4, width: 10, height: 10, borderRadius: "50%", background: C.gold, animation: "tlTravel 3s ease-in-out infinite" }} />
            {days !== null && (
              <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 13, color: C.gold, whiteSpace: "nowrap" }}>
                {days} DAYS LATER
              </div>
            )}
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: voteColor, margin: "0 auto 6px", animation: "dotPulse 1.5s ease-in-out 3.2s 3" }} />
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: "0.12em", color: C.parchmentDim, textTransform: "uppercase" }}>Vote cast</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: C.parchment }}>{formatDate(tl.vote_date)}</div>
          </div>
        </div>
      </div>

      {/* Bill + vote card */}
      <div style={{ background: C.bgDeep, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: 16, marginBottom: 20 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17, color: C.parchment, marginBottom: 4 }}>
          {tl.bill_name || "Unknown Bill"}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, marginBottom: 12 }}>
          {[tl.bill_section, tl.bill_id, formatDate(tl.vote_date)].filter(Boolean).join(" · ")}
          {tl.bill_link && (
            <> · <a href={tl.bill_link} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: "none" }}>View bill ↗</a></>
          )}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 28, color: voteColor, marginBottom: 12 }}>
          VOTED {howVoted.toUpperCase()}
        </div>
        {tl.vote_impact && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchment, lineHeight: 1.6, marginBottom: 14 }}>{tl.vote_impact}</div>
        )}
        {tl.relevant_excerpt && (
          <div style={{ borderLeft: `3px solid ${C.gold}`, paddingLeft: 12, fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 12, color: C.parchmentDim, lineHeight: 1.6 }}>{tl.relevant_excerpt}</div>
        )}
      </div>

      {/* Narrative + DAS contribution */}
      {(tl.throughline_summary || tl.corruption_contribution) && (
        <div style={{ borderLeft: `3px solid ${C.gold}`, background: C.bgDeep, padding: 16, borderRadius: "0 2px 2px 0", marginBottom: 12 }}>
          {tl.throughline_summary && (
            <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 14, color: C.parchment, lineHeight: 1.75, marginBottom: tl.corruption_contribution ? 12 : 0 }}>
              {tl.throughline_summary}
            </div>
          )}
          {tl.corruption_contribution != null && (
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: C.red, letterSpacing: "0.1em" }}>
              +{Math.round(Number(tl.corruption_contribution))} POINTS TO DONOR ALIGNMENT SCORE
            </div>
          )}
        </div>
      )}

      {/* No narrative yet — show a note */}
      {!tl.throughline_summary && !tl.vote_impact && (
        <div style={{ padding: "12px 16px", background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.6 }}>
            Narrative analysis for this donation-vote match is being generated. Raw FEC data is verified.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Compare Me ───────────────────────────────────────────────────────────
function TabCompare({ onRequireAuth, politician }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [quizResult, setQuizResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !profile?.quiz_result_id) return;
    setLoading(true);
    supabase.from("quiz_results").select("*").eq("id", profile.quiz_result_id).single()
      .then(({ data }) => { setQuizResult(data || null); setLoading(false); });
  }, [user, profile?.quiz_result_id]);

  const statedVsActual = [
    { issue: "Drug pricing",   stated: "Supports price controls",         actual: "Voted against Medicare negotiation", match: false },
    { issue: "Infrastructure", stated: "Supports investment",             actual: "Voted YES on bipartisan bill",        match: true  },
    { issue: "Clean energy",   stated: "Supports energy independence",    actual: "Voted against clean energy credits",  match: false },
    { issue: "Banking reform", stated: "Supports strong financial rules", actual: "Voted NO on consumer protections",    match: false },
  ];

  const userScores = quizResult ? {
    economic: quizResult.score_economic, healthcare: quizResult.score_healthcare,
    climate: quizResult.score_climate, criminal: quizResult.score_criminal,
    immigration: quizResult.score_immigration, foreign: quizResult.score_foreign,
    education: quizResult.score_education, freedom: quizResult.score_freedom,
    guns: quizResult.score_guns, housing: quizResult.score_housing,
    tech: quizResult.score_tech, voting: quizResult.score_voting,
  } : null;

  const polScores = politician ? {
    economic: politician.score_economic, healthcare: politician.score_healthcare,
    climate: politician.score_climate, criminal: politician.score_criminal,
    immigration: politician.score_immigration, foreign: politician.score_foreign,
    education: politician.score_education, freedom: politician.score_freedom,
    guns: politician.score_guns, housing: politician.score_housing,
    tech: politician.score_tech, voting: politician.score_voting,
  } : null;

  const hasPolScores = polScores && Object.values(polScores).some(v => v != null);
  const matchPct = userScores && polScores && hasPolScores ? computeMatch(userScores, polScores) : null;

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", color: C.parchmentDim, marginBottom: 12, textTransform: "uppercase" }}>Stated Position vs. Actual Votes</div>
      <div style={{ marginBottom: 32 }}>
        {statedVsActual.map((row, i) => (
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

      {!user ? (
        <div style={{ position: "relative", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ filter: "blur(4px)", pointerEvents: "none", padding: 20, background: C.bgDeep, border: `1px solid ${C.goldBorderDim}` }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 48, color: C.gold, textAlign: "center" }}>78%</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              {["Economic Policy", "Healthcare", "Climate & Energy"].map(d => (
                <div key={d} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, width: 120, flexShrink: 0 }}>{d}</div>
                  <div style={{ flex: 1, height: 4, background: C.bgCard, borderRadius: 2 }}><div style={{ width: "60%", height: "100%", background: C.gold, borderRadius: 2 }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,11,13,0.75)" }}>
            <div style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 18, color: C.parchment, marginBottom: 8, lineHeight: 1.3 }}>How well does this politician<br />actually represent <em>you?</em></div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, marginBottom: 18 }}>Sign in and take the quiz to see your personal match score.</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button style={btnGold} onMouseEnter={sinkHover} onMouseLeave={sinkLeave} onClick={() => router.push("/quiz")}>TAKE THE QUIZ</button>
                <button style={{ ...btnWhite, fontSize: 12, padding: "7px 14px" }} onMouseEnter={sinkHover} onMouseLeave={sinkLeave} onClick={onRequireAuth}>SIGN IN</button>
              </div>
            </div>
          </div>
        </div>
      ) : !profile?.quiz_result_id ? (
        <div style={{ padding: 24, background: C.bgDeep, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, textAlign: "center" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 18, color: C.parchment, marginBottom: 8, lineHeight: 1.3 }}>How well does this politician represent <em>you?</em></div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, marginBottom: 18, lineHeight: 1.6 }}>Take the quiz to see your personal match score across all 12 policy dimensions.</div>
          <button style={btnGold} onMouseEnter={sinkHover} onMouseLeave={sinkLeave} onClick={() => router.push("/quiz")}>TAKE THE QUIZ</button>
        </div>
      ) : loading ? (
        <div style={{ padding: 24, background: C.bgDeep, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim }}>Loading your match…</div>
      ) : userScores && !hasPolScores ? (
        <div style={{ padding: 24, background: C.bgDeep, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, animation: "fadeSlideIn 0.4s ease forwards" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: "0.25em", color: C.gold, marginBottom: 12 }}>YOUR THUMBPRINT VS. THIS POLITICIAN</div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <ThumbprintOverlay userScores={userScores} polScores={Object.fromEntries(DIMS.map(d => [d, 50]))} size={200} />
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim }}><div style={{ width: 12, height: 2, background: C.green }} /> Your values</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim }}><div style={{ width: 12, height: 2, background: C.red, opacity: 0.6 }} /> Their votes</div>
          </div>
          <div style={{ textAlign: "center", padding: "12px 16px", background: C.bgCard, borderRadius: 2, border: `1px solid ${C.goldBorderDim}` }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color: C.gold, marginBottom: 4 }}>MATCH SCORE PENDING</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.6 }}>Your thumbprint is ready. We're still processing voting record data for this politician — your match % will appear once FEC data is loaded.</div>
          </div>
          <div style={{ marginTop: 20 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: "0.2em", color: C.parchmentDim, marginBottom: 12 }}>YOUR SCORES ACROSS 12 DIMENSIONS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
              {DIMS.map(dim => {
                const score = userScores[dim] ?? 50;
                const color = DIMENSION_COLORS[dim];
                return (
                  <div key={dim} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(201,168,76,0.05)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.parchmentDim }}>{DIMENSION_LABELS[dim]}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, color, marginLeft: 4 }}>{Math.round(score)}</span>
                      </div>
                      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : userScores && hasPolScores ? (
        <div style={{ padding: 24, background: C.bgDeep, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, animation: "fadeSlideIn 0.4s ease forwards" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: "0.25em", color: C.gold, marginBottom: 16 }}>YOUR THUMBPRINT VS. THIS POLITICIAN</div>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 56, color: matchPct >= 60 ? C.green : matchPct >= 40 ? C.gold : C.red, lineHeight: 1 }}>{matchPct}%</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, marginTop: 4 }}>
              {matchPct >= 70 ? "Strong alignment — they vote like you think." : matchPct >= 50 ? "Moderate alignment — some overlap, some divergence." : "Low alignment — their votes don't reflect your values."}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <ThumbprintOverlay userScores={userScores} polScores={polScores} size={220} />
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim }}><div style={{ width: 12, height: 2, background: C.green }} /> Your values</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim }}><div style={{ width: 12, height: 2, background: C.red, opacity: 0.6 }} /> Their votes</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
            {DIMS.map(dim => {
              const uScore = userScores[dim] ?? 50;
              const pScore = polScores[dim] ?? 50;
              const diff = Math.abs(uScore - pScore);
              const color = DIMENSION_COLORS[dim];
              const aligned = diff < 20;
              return (
                <div key={dim} style={{ padding: "8px 10px", background: C.bgCard, borderRadius: 2, border: `1px solid ${aligned ? "rgba(76,168,124,0.15)" : "rgba(201,76,76,0.1)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.parchmentDim }}>{DIMENSION_LABELS[dim]}</span>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 10, color: aligned ? C.green : C.red }}>{aligned ? "ALIGNED" : "GAP"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <div style={{ flex: 1, height: 3, background: "rgba(76,168,124,0.2)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${uScore}%`, background: C.green, borderRadius: 2 }} />
                    </div>
                    <div style={{ flex: 1, height: 3, background: "rgba(201,76,76,0.2)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pScore}%`, background: C.red, borderRadius: 2 }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Tab: Voting Record ────────────────────────────────────────────────────────
// Deduplicates votes by bill_id + how_voted from real throughline_events
function TabVoting({ politicianId }) {
  const [votes, setVotes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState(null);

  useEffect(() => {
    if (!politicianId) return;
    setLoading(true);

    supabase
      .from("throughline_events")
      .select("bill_name, bill_id, bill_link, vote_date, how_voted, dimension, vote_impact")
      .eq("politician_id", politicianId)
      .not("bill_name", "is", null)
      .not("how_voted", "is", null)
      .order("vote_date", { ascending: false })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) { setVotes([]); setLoading(false); return; }

        // Deduplicate: one row per unique bill + vote combo
        const seen = new Set();
        const deduped = [];
        data.forEach(row => {
          const key = `${row.bill_id || row.bill_name}::${row.how_voted}`;
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(row);
          }
        });

        setVotes(deduped);
        setLoading(false);
      });
  }, [politicianId]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim }}>
        Loading voting record…
      </div>
    );
  }

  if (votes.length === 0) {
    return (
      <EmptyState
        icon="🗳️"
        title="No Votes on Record Yet"
        body="Voting data for this politician hasn't been matched to donor contributions yet. We're working through the FEC data — check back soon."
      />
    );
  }

  const presentDims = [...new Set(votes.map(v => v.dimension).filter(Boolean))];
  const filtered = filter ? votes.filter(v => v.dimension === filter) : votes;

  return (
    <div style={{ paddingBottom: 40, animation: "fadeSlideIn 0.4s ease forwards" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        <button onClick={() => setFilter(null)}
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", padding: "5px 12px", borderRadius: 2, border: `1px solid ${filter === null ? C.gold : C.goldBorderDim}`, background: filter === null ? "rgba(201,168,76,0.12)" : "transparent", color: filter === null ? C.gold : C.parchmentDim, cursor: "pointer" }}>
          ALL
        </button>
        {presentDims.map(d => (
          <button key={d} onClick={() => setFilter(d === filter ? null : d)}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", padding: "5px 12px", borderRadius: 2, border: `1px solid ${filter === d ? DIMENSION_COLORS[d] : C.goldBorderDim}`, background: filter === d ? DIMENSION_COLORS[d] + "22" : "transparent", color: filter === d ? DIMENSION_COLORS[d] : C.parchmentDim, cursor: "pointer", textTransform: "uppercase" }}>
            {d}
          </button>
        ))}
      </div>

      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, marginBottom: 16 }}>
        {filtered.length} {filtered.length === 1 ? "vote" : "votes"} tracked
      </div>

      {filtered.map((v, i) => {
        const isYea = ["yea", "yes"].includes((v.how_voted || "").toLowerCase());
        const voteColor = isYea ? C.green : C.red;
        const dimColor = v.dimension ? DIMENSION_COLORS[v.dimension] : C.goldDim;

        return (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: `1px solid ${C.goldBorderDim}` }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: voteColor, width: 50, flexShrink: 0 }}>
              {isYea ? "YES" : "NO"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: C.parchment, marginBottom: 3 }}>
                {v.bill_link
                  ? <a href={v.bill_link} target="_blank" rel="noopener noreferrer" style={{ color: C.parchment, textDecoration: "none" }}>{v.bill_name}</a>
                  : v.bill_name
                }
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, marginBottom: v.vote_impact ? 4 : 0 }}>
                {v.bill_id && <span>{v.bill_id} · </span>}{formatDate(v.vote_date)}
              </div>
              {v.vote_impact && (
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.5 }}>{v.vote_impact}</div>
              )}
            </div>
            {v.dimension && (
              <div style={{ marginLeft: "auto", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: "0.1em", padding: "3px 8px", borderRadius: 2, background: dimColor + "18", color: dimColor, border: `1px solid ${dimColor}44`, whiteSpace: "nowrap", flexShrink: 0, textTransform: "uppercase" }}>
                {v.dimension}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TabPlaceholder({ label, description }) {
  return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: C.parchmentDim, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim, lineHeight: 1.6, maxWidth: 360, margin: "0 auto" }}>{description}</div>
    </div>
  );
}

export default function PoliticianPage({ politician }) {
  const router = useRouter();
  const { user, profile, showAuthModal, setShowAuthModal, authMessage, followPolitician, unfollowPolitician, isFollowingPolitician, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("receipt");
  const [isSticky, setIsSticky]   = useState(false);
  const heroRef = useRef(null);

  // Real avg donation from throughline_events
  const [avgDonation, setAvgDonation] = useState(null);
  useEffect(() => {
    if (!politician?.id) return;
    supabase
      .from("throughline_events")
      .select("donation_amount")
      .eq("politician_id", politician.id)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const avg = data.reduce((s, r) => s + (r.donation_amount || 0), 0) / data.length;
        setAvgDonation(Math.round(avg));
      });
  }, [politician?.id]);

  const [quizResult, setQuizResult] = useState(null);
  useEffect(() => {
    if (!user || !profile?.quiz_result_id) return;
    supabase.from("quiz_results").select("*").eq("id", profile.quiz_result_id).single()
      .then(({ data }) => setQuizResult(data || null));
  }, [user, profile?.quiz_result_id]);

  const userScores = quizResult ? {
    economic: quizResult.score_economic, healthcare: quizResult.score_healthcare,
    climate: quizResult.score_climate, criminal: quizResult.score_criminal,
    immigration: quizResult.score_immigration, foreign: quizResult.score_foreign,
    education: quizResult.score_education, freedom: quizResult.score_freedom,
    guns: quizResult.score_guns, housing: quizResult.score_housing,
    tech: quizResult.score_tech, voting: quizResult.score_voting,
  } : null;

  const polScores = politician ? {
    economic: politician.score_economic, healthcare: politician.score_healthcare,
    climate: politician.score_climate, criminal: politician.score_criminal,
    immigration: politician.score_immigration, foreign: politician.score_foreign,
    education: politician.score_education, freedom: politician.score_freedom,
    guns: politician.score_guns, housing: politician.score_housing,
    tech: politician.score_tech, voting: politician.score_voting,
  } : null;

  const hasPolScores = polScores && Object.values(polScores).some(v => v != null);
  const matchPct = userScores && hasPolScores ? computeMatch(userScores, polScores) : null;

  useEffect(() => {
    const onScroll = () => { if (heroRef.current) setIsSticky(window.scrollY > heroRef.current.offsetHeight - 80); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (router.isFallback) return <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.parchment, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18 }}>LOADING…</div>;

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
  const partyColor = party === "D" ? C.blue : party === "R" ? C.red : C.purple;
  const partyLabel = party === "D" ? "Democrat" : party === "R" ? "Republican" : "Independent";
  const initials   = name.split(" ").map(w => w[0]).slice(0, 2).join("");
  const photoUrl   = bioguide_id ? `https://bioguide.congress.gov/bioguide/photo/${bioguide_id[0]}/${bioguide_id}.jpg` : null;
  const das        = donor_alignment_score;
  const following  = isFollowingPolitician(slug);

  const handleFollow = async () => { if (following) await unfollowPolitician(slug); else await followPolitician(slug); };

  const followButton = following
    ? <button style={btnFollowing} onClick={handleFollow}>✓ FOLLOWING</button>
    : <button style={btnWhite} onMouseEnter={sinkHover} onMouseLeave={sinkLeave} onClick={handleFollow}>+ FOLLOW</button>;

  return (
    <>
      <Head>
        <title>{name} · Throughline</title>
        <meta name="description" content={`Track ${name}'s donor relationships and voting record. Donor Alignment Score: ${das ?? "pending"}.`} />
      </Head>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ background: C.bg, color: C.parchment, fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>

        {/* STICKY HEADER */}
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: C.bgCard, borderBottom: `1px solid ${C.goldBorderDim}`, transform: isSticky ? "translateY(0)" : "translateY(-100%)", transition: "transform 0.25s ease", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12 }}>
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

        {/* HERO */}
        <div ref={heroRef} style={{ position: "relative", minHeight: 280, background: C.bgCard, overflow: "hidden" }}>
          {photoUrl && <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}><img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", opacity: 0.35 }} onError={e => e.target.style.display = "none"} /></div>}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, background: `linear-gradient(to bottom, ${C.bg}, transparent)` }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, background: `linear-gradient(to top, ${C.bg}, transparent)` }} />
          <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
            <button onClick={() => router.push("/")} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: C.gold, background: "transparent", border: "none", cursor: "pointer" }}>← THROUGHLINE</button>
            {user ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => router.push("/profile")} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", color: C.gold, background: "transparent", border: `1px solid ${C.goldBorder}`, borderRadius: 2, padding: "5px 12px", cursor: "pointer" }}>MY PROFILE</button>
                <button onClick={signOut} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", color: C.parchmentDim, background: "transparent", border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 2, padding: "5px 12px", cursor: "pointer" }}>SIGN OUT</button>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", color: C.gold, background: "transparent", border: `1px solid ${C.goldBorder}`, borderRadius: 2, padding: "5px 12px", cursor: "pointer" }}>SIGN IN</button>
            )}
          </div>
          <div style={{ position: "relative", zIndex: 2, padding: "40px 20px 32px" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: partyColor + "33", color: partyColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, border: `2px solid ${partyColor}66`, marginBottom: 14, overflow: "hidden" }}>
              {photoUrl ? <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} onError={e => { e.target.style.display = "none"; }} /> : initials}
            </div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(28px, 6vw, 44px)", color: C.parchment, lineHeight: 1.05, marginBottom: 8 }}>{name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", padding: "3px 10px", borderRadius: 2, background: partyColor + "22", color: partyColor, border: `1px solid ${partyColor}44` }}>{partyLabel.toUpperCase()}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim }}>{state} · {chamber}</div>
            </div>
          </div>
        </div>

        {/* FOLLOWER ROW */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${C.goldBorderDim}`, gap: 12 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim }}>3,847 followers · FEC data through Q4 2024</div>
          {followButton}
        </div>

        {/* STAT CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "16px 20px" }}>
          <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: 12, textAlign: "center", cursor: matchPct !== null ? "default" : "pointer" }}
            onClick={() => { if (!user || !profile?.quiz_result_id) setActiveTab("compare"); }}
          >
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.parchmentDim, marginBottom: 6 }}>Your Match</div>
            {matchPct !== null ? (
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: matchPct >= 60 ? C.green : matchPct >= 40 ? C.gold : C.red }}>{matchPct}%</div>
            ) : user && profile?.quiz_result_id ? (
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, color: C.parchmentDim }}>DATA PENDING</div>
            ) : (
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 11, color: C.parchmentDim }}>🔒 TAKE QUIZ</div>
            )}
          </div>
          <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: 12, textAlign: "center" }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.parchmentDim, marginBottom: 6 }}>Avg Gift</div>
            {avgDonation != null
              ? <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: avgDonationColor(avgDonation) }}>{formatAmount(avgDonation)}</div>
              : <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: C.parchmentDim }}>— PENDING</div>
            }
          </div>
          <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, padding: 12, textAlign: "center" }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.parchmentDim, marginBottom: 6 }}>Donor Alignment Score</div>
            {das !== null && das !== undefined
              ? <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: dasColor(das) }}>{das}</div>
              : <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: C.parchmentDim }}>— PENDING</div>
            }
          </div>
        </div>

        {/* TAB BAR */}
        <div style={{ position: "sticky", top: isSticky ? 57 : 0, zIndex: 100, background: C.bg, borderBottom: `1px solid ${C.goldBorderDim}` }}>
          <div style={{ display: "flex", overflowX: "auto", padding: "0 20px", gap: 0, msOverflowStyle: "none", scrollbarWidth: "none" }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", borderBottom: activeTab === tab.id ? `2px solid ${C.gold}` : "2px solid transparent", color: activeTab === tab.id ? C.gold : C.parchmentDim, whiteSpace: "nowrap", transition: "color 0.2s" }}
              >{tab.label.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {/* TAB CONTENT */}
        <div style={{ padding: "24px 20px", maxWidth: 640, margin: "0 auto" }}>
          {activeTab === "receipt"     && <TabReceipt     politicianId={politician.id} />}
          {activeTab === "throughline" && <TabThroughline politicianId={politician.id} />}
          {activeTab === "compare"     && <TabCompare     onRequireAuth={() => setShowAuthModal(true)} politician={politician} />}
          {activeTab === "voting"      && <TabVoting      politicianId={politician.id} />}
          {activeTab === "district"    && <TabPlaceholder label="District" description="Constituent demographics and needs compared against voting record. Coming when Census data integration is live." />}
          {activeTab === "network"     && <TabPlaceholder label="Network" description="Politicians funded by the same PACs, and who votes in near-identical patterns. Coming in Phase 4." />}
          {activeTab === "timeline"    && <TabPlaceholder label="Timeline" description="Full career arc — donation events and corresponding votes plotted chronologically. Coming in Phase 4." />}
        </div>

        {showAuthModal && <AuthModal message={authMessage} onDismiss={() => setShowAuthModal(false)} />}
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  const { slug } = params;
  const { data, error } = await supabase.from("politicians").select("*").eq("slug", slug).single();
  if (error || !data) return { props: { politician: null } };
  return { props: { politician: data } };
}
