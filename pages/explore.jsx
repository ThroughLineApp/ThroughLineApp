import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import supabase from "../lib/supabase";
import { useAuth } from "../lib/auth";
import Nav from "../components/Nav";

// ── Global styles ─────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Barlow+Condensed:wght@400;600;700;800&family=Playfair+Display:ital,wght@1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0b0d; font-family: 'Figtree', sans-serif; }
  @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
  .pol-card { transition: border-color 0.2s; }
  .pol-card:hover { border-color: rgba(201,168,76,0.4) !important; }
`;

// ── Constants ─────────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0b0d", card: "#11131a", gold: "#c9a84c",
  parchment: "#e8dfc8", parchmentDim: "#a89d88",
  red: "#c94c4c", green: "#4ca87c", blue: "#4c78c9", purple: "#8e4cc9",
  border: "rgba(201,168,76,0.15)", borderHover: "rgba(201,168,76,0.4)",
};

const DIMS = [
  "economic","healthcare","climate","criminal","immigration",
  "foreign","education","freedom","guns","housing","tech","voting",
];

const DIMENSION_LABELS = {
  economic:"Economic Policy", healthcare:"Healthcare", climate:"Climate & Energy",
  criminal:"Criminal Justice", immigration:"Immigration", foreign:"Foreign Policy",
  education:"Education", freedom:"Personal Freedom", guns:"Gun Policy",
  housing:"Housing & Urban", tech:"Tech & Privacy", voting:"Electoral Rights",
};

const DIMENSION_SCORE_COLS = {
  economic:"score_economic", healthcare:"score_healthcare", climate:"score_climate",
  criminal:"score_criminal", immigration:"score_immigration", foreign:"score_foreign",
  education:"score_education", freedom:"score_freedom", guns:"score_guns",
  housing:"score_housing", tech:"score_tech", voting:"score_voting",
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function partyColor(party) {
  if (!party) return C.gold;
  const p = party.toUpperCase();
  if (p === "D" || p.startsWith("DEM")) return C.blue;
  if (p === "R" || p.startsWith("REP")) return C.red;
  return C.purple;
}

function partyLabel(party) {
  if (!party) return "—";
  const p = party.toUpperCase();
  if (p === "D" || p.startsWith("DEM")) return "DEM";
  if (p === "R" || p.startsWith("REP")) return "REP";
  return "IND";
}

function partyBg(party) {
  if (!party) return "rgba(201,168,76,0.2)";
  const p = party.toUpperCase();
  if (p === "D" || p.startsWith("DEM")) return "rgba(76,120,201,0.2)";
  if (p === "R" || p.startsWith("REP")) return "rgba(201,76,76,0.2)";
  return "rgba(142,76,201,0.2)";
}

function dasColor(score) {
  if (score == null) return C.parchmentDim;
  if (score <= 33) return C.green;
  if (score <= 66) return C.gold;
  return C.red;
}

function bioguidePhotoUrl(bioguide_id) {
  if (!bioguide_id) return null;
  return `https://bioguide.congress.gov/bioguide/photo/${bioguide_id[0].toUpperCase()}/${bioguide_id}.jpg`;
}

function matchColor(pct) {
  if (pct > 65) return C.green;
  if (pct >= 40) return C.gold;
  return C.red;
}

function calcMatch(quizScores, politician) {
  if (!quizScores) return null;
  const eligible = DIMS.filter(d => quizScores[d] != null && politician[DIMENSION_SCORE_COLS[d]] != null);
  if (eligible.length === 0) return null;
  const top3 = eligible
    .sort((a, b) => Math.abs(quizScores[b] ?? 0) - Math.abs(quizScores[a] ?? 0))
    .slice(0, 3);
  const diffs = top3.map(d => {
    const diff = Math.abs((quizScores[d] ?? 50) - (politician[DIMENSION_SCORE_COLS[d]] ?? 50));
    return diff / 40;
  });
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.round(Math.max(0, Math.min(1, 1 - avgDiff)) * 100);
}

function getTopDims(quizScores, n = 3) {
  return DIMS
    .filter(d => quizScores?.[d] != null)
    .sort((a, b) => Math.abs(quizScores[b] ?? 0) - Math.abs(quizScores[a] ?? 0))
    .slice(0, n);
}

function getAlignment(userScore, polScore) {
  const sameDir = (userScore > 0 && polScore > 0) || (userScore < 0 && polScore < 0) || (userScore === 0 && polScore === 0);
  const diff = Math.abs(userScore - polScore);
  if (sameDir && diff <= 8)   return { label: "Aligned",  color: C.green, barW: "100%" };
  if (!sameDir || diff > 12)  return { label: "Mismatch", color: C.red,   barW: "20%"  };
  return                             { label: "Mixed",    color: C.gold,  barW: "50%"  };
}

// ── BottomNavBar ──────────────────────────────────────────────────────────────
function BottomNavBar({ router }) {
  const path = router.pathname;
  const activeId = path === "/" ? "feed" : path === "/explore" ? "explore" : path === "/quiz" ? "quiz" : path === "/profile" ? "profile" : "";
  const tabs = [
    { id:"feed",    label:"Feed",    route:"/",        icon:(a)=>(<svg width={22} height={22} viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke={a?"#c9a84c":"#a89d88"} strokeWidth={1.6} fill="none"/><path d="M9 21V12h6v9" stroke={a?"#c9a84c":"#a89d88"} strokeWidth={1.6}/></svg>) },
    { id:"explore", label:"Explore", route:"/explore", icon:(a)=>(<svg width={22} height={22} viewBox="0 0 24 24" fill="none"><circle cx={12} cy={12} r={9} stroke={a?"#c9a84c":"#a89d88"} strokeWidth={1.6}/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" stroke={a?"#c9a84c":"#a89d88"} strokeWidth={1.4}/></svg>) },
    { id:"quiz",    label:"Quiz",    route:"/quiz",    icon:(a)=>(<svg width={22} height={22} viewBox="0 0 24 24" fill="none"><circle cx={12} cy={12} r={9} stroke={a?"#c9a84c":"#a89d88"} strokeWidth={1.6}/><circle cx={12} cy={12} r={5} stroke={a?"#c9a84c":"#a89d88"} strokeWidth={1.3}/><circle cx={12} cy={12} r={2} fill={a?"#c9a84c":"#a89d88"}/></svg>) },
    { id:"profile", label:"Profile", route:"/profile", icon:(a)=>(<svg width={22} height={22} viewBox="0 0 24 24" fill="none"><circle cx={12} cy={8} r={3.5} stroke={a?"#c9a84c":"#a89d88"} strokeWidth={1.6}/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={a?"#c9a84c":"#a89d88"} strokeWidth={1.6} strokeLinecap="round"/></svg>) },
    { id:"issues",  label:"Issues",  route:null,       icon:(a)=>(<svg width={22} height={22} viewBox="0 0 24 24" fill="none"><line x1={3} y1={6} x2={21} y2={6} stroke={a?"#c9a84c":"#a89d88"} strokeWidth={1.6} strokeLinecap="round"/><line x1={3} y1={12} x2={16} y2={12} stroke={a?"#c9a84c":"#a89d88"} strokeWidth={1.6} strokeLinecap="round"/><line x1={3} y1={18} x2={11} y2={18} stroke={a?"#c9a84c":"#a89d88"} strokeWidth={1.6} strokeLinecap="round"/></svg>) },
  ];
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, width:"100%", height:56, background:"#0a0b0d", borderTop:"1px solid rgba(201,168,76,0.10)", display:"flex", alignItems:"center", justifyContent:"space-around", zIndex:9999, paddingBottom:"env(safe-area-inset-bottom, 0px)" }}>
      {tabs.map(tab => {
        const active = tab.id === activeId;
        return (
          <button key={tab.id} type="button"
            onClick={() => tab.route ? router.push(tab.route) : alert(`${tab.label} — coming soon`)}
            style={{ flex:1, height:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:0 }}>
            {tab.icon(active)}
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:"0.08em", color:active?"#c9a84c":"#a89d88", textTransform:"uppercase" }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  const shimmerStyle = {
    background: "linear-gradient(90deg, #11131a 25%, #1a1d26 50%, #11131a 75%)",
    backgroundSize: "800px 100%",
    animation: "shimmer 1.5s infinite",
    borderRadius: 4,
  };
  const bar = (w, h) => (
    <div style={{ height: h, width: w, ...shimmerStyle, marginBottom: 6 }} />
  );
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
        <div style={{ width:56, height:56, borderRadius:"50%", flexShrink:0, ...shimmerStyle }} />
        <div style={{ flex:1 }}>
          {bar("55%", 18)}
          {bar("35%", 11)}
          {bar("45%", 11)}
        </div>
        <div style={{ width:80, height:32, ...shimmerStyle, borderRadius:6 }} />
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:14 }}>
        {[0,1,2].map(i => <div key={i} style={{ flex:1, height:60, ...shimmerStyle, borderRadius:8 }} />)}
      </div>
      {bar("100%", 12)}
      {bar("80%", 10)}
    </div>
  );
}

// ── PoliticianCard ────────────────────────────────────────────────────────────
function PoliticianCard({ politician, quizScores, donationData, isMyRep, isFollowing, onFollowToggle, router }) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = bioguidePhotoUrl(politician.bioguide_id);
  const pColor   = partyColor(politician.party);
  const das      = politician.donor_alignment_score;

  // Match %
  const matchPct = calcMatch(quizScores, politician);

  // Donation bar
  const smallTotal = donationData?.small_dollar_total ?? 0;
  const pacTotal   = donationData?.pac_total ?? 0;
  const donTotal   = smallTotal + pacTotal;
  const smallPct   = donTotal > 0 ? Math.round((smallTotal / donTotal) * 100) : 0;
  const pacPct     = donTotal > 0 ? Math.round((pacTotal   / donTotal) * 100) : 0;
  const donLoading = !donationData;

  // Top 3 issue alignment
  const topDims = quizScores ? getTopDims(quizScores) : [];

  // Initials fallback
  const initials = (() => {
    const parts = (politician.name || "").split(" ").filter(Boolean);
    if (parts.length >= 2) return parts[0][0] + parts[parts.length - 1][0];
    if (parts.length === 1) return parts[0][0];
    return "?";
  })();

  return (
    <div className="pol-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, position:"relative", animation:"fadeIn 0.3s ease forwards" }}>

      {/* ── ROW 1: IDENTITY ── */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
        {/* Photo */}
        <div style={{ flexShrink:0 }}>
          {photoUrl && !imgError ? (
            <img src={photoUrl} alt={politician.name} onError={() => setImgError(true)}
              style={{ width:56, height:56, borderRadius:"50%", objectFit:"cover", border:`2px solid ${pColor}` }} />
          ) : (
            <div style={{ width:56, height:56, borderRadius:"50%", background:pColor, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:"#e8dfc8" }}>
              {initials}
            </div>
          )}
        </div>

        {/* Name + meta */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:700, color:C.parchment, lineHeight:1, marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {politician.name}
          </div>
          <div style={{ fontSize:12, color:C.parchmentDim, marginBottom:6 }}>
            {politician.state}{politician.state && politician.chamber ? " · " : ""}{politician.chamber}
          </div>
          {/* Badges */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:"0.1em", padding:"2px 8px", borderRadius:10, background:partyBg(politician.party), color:pColor }}>
              {partyLabel(politician.party)}
            </span>
            {isMyRep && (
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:"0.1em", padding:"2px 8px", borderRadius:10, background:"rgba(201,168,76,0.2)", color:C.gold }}>
                YOUR REP
              </span>
            )}
            {isFollowing && (
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:"0.1em", padding:"2px 8px", borderRadius:10, background:"rgba(76,168,124,0.2)", color:C.green }}>
                FOLLOWING
              </span>
            )}
          </div>
        </div>

        {/* Follow button */}
        <button type="button" onClick={() => onFollowToggle(politician)}
          style={{ flexShrink:0, fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, letterSpacing:"0.08em", padding:"6px 14px", borderRadius:6, cursor:"pointer", transition:"all 0.15s",
            background: isFollowing ? "rgba(76,168,124,0.1)" : "transparent",
            border: isFollowing ? `1px solid ${C.green}` : `1px solid ${C.gold}`,
            color: isFollowing ? C.green : C.gold,
          }}>
          {isFollowing ? "✓ Following" : "+ Follow"}
        </button>
      </div>

      {/* ── ROW 2: STAT CHIPS ── */}
      <div style={{ display:"flex", gap:10, marginTop:14 }}>
        {/* Match % */}
        <div style={{ flex:1, background:C.bg, borderRadius:8, padding:"10px 14px", textAlign:"center" }}>
          {quizScores && matchPct != null ? (
            <>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:24, fontWeight:700, color:matchColor(matchPct), lineHeight:1 }}>
                {matchPct}<span style={{ fontSize:14 }}>%</span>
              </div>
              <div style={{ fontSize:10, color:C.parchmentDim, marginTop:3, fontFamily:"'Figtree',sans-serif" }}>match</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:18, lineHeight:1 }}>🔒</div>
              <div style={{ fontSize:11, color:C.parchmentDim, marginTop:3, fontFamily:"'Figtree',sans-serif" }}>Take quiz</div>
            </>
          )}
        </div>

        {/* DAS */}
        <div style={{ flex:1, background:C.bg, borderRadius:8, padding:"10px 14px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:24, fontWeight:700, color:dasColor(das), lineHeight:1 }}>
            {das != null ? das : "—"}
          </div>
          <div style={{ fontSize:10, color:C.parchmentDim, marginTop:3, fontFamily:"'Figtree',sans-serif" }}>DAS</div>
        </div>

        {/* Donation source */}
        <div style={{ flex:1, background:C.bg, borderRadius:8, padding:"10px 14px", textAlign:"center" }}>
          {donLoading ? (
            <div style={{ fontSize:11, color:C.parchmentDim, fontFamily:"'Figtree',sans-serif", paddingTop:6 }}>Loading...</div>
          ) : (
            <>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, lineHeight:1.3, color: smallTotal > pacTotal ? C.green : C.red }}>
                {smallTotal > pacTotal ? "Mostly small $" : "Mostly PAC $"}
              </div>
              <div style={{ fontSize:10, color:C.parchmentDim, marginTop:3, fontFamily:"'Figtree',sans-serif" }}>funding source</div>
            </>
          )}
        </div>
      </div>

      {/* ── ROW 3: DONATION BAR ── */}
      <div style={{ marginTop:14 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:C.parchmentDim, letterSpacing:"0.15em", marginBottom:6, textTransform:"uppercase" }}>
          Donation Sources
        </div>
        <div style={{ width:"100%", height:12, borderRadius:6, overflow:"hidden", background:C.bg, display:"flex" }}>
          {donLoading ? (
            <div style={{ flex:1, background:"#1a1d26", animation:"shimmer 1.5s infinite", backgroundSize:"800px 100%" }} />
          ) : (
            <>
              <div style={{ width:`${smallPct}%`, background:C.green, height:"100%", transition:"width 0.5s ease" }} />
              <div style={{ width:`${pacPct}%`,   background:C.gold,  height:"100%", transition:"width 0.5s ease" }} />
            </>
          )}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, gap:4 }}>
          <span style={{ fontSize:10, color:C.green, fontFamily:"'Figtree',sans-serif" }}>Small dollar {smallPct}%</span>
          <span style={{ fontSize:10, color:C.gold,  fontFamily:"'Figtree',sans-serif" }}>PAC money {pacPct}%</span>
          <span style={{ fontSize:10, color:C.parchmentDim, opacity:0.5, fontFamily:"'Figtree',sans-serif" }}>Dark money — data pending</span>
        </div>
      </div>

      {/* ── ROW 4: ISSUE ALIGNMENT ── */}
      {quizScores && topDims.length > 0 ? (
        <div style={{ marginTop:14 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:C.parchmentDim, letterSpacing:"0.15em", marginBottom:8, textTransform:"uppercase" }}>
            Your Top Issues
          </div>
          {topDims.map(dim => {
            const userScore = quizScores[dim] ?? 50;
            const polScore  = politician[DIMENSION_SCORE_COLS[dim]] ?? 50;
            const { label, color, barW } = getAlignment(userScore, polScore);
            return (
              <div key={dim} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <span style={{ fontFamily:"'Figtree',sans-serif", fontSize:11, color:C.parchmentDim, width:120, flexShrink:0 }}>
                  {DIMENSION_LABELS[dim]}
                </span>
                <div style={{ flex:1, height:4, borderRadius:2, background:C.bg, overflow:"hidden" }}>
                  <div style={{ width:barW, height:"100%", background:color, transition:"width 0.4s ease" }} />
                </div>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:"0.1em", color, width:52, textAlign:"right" }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      ) : politician.top_donor_industry ? (
        <div style={{ marginTop:14 }}>
          <span style={{ fontSize:11, color:C.parchmentDim, fontFamily:"'Figtree',sans-serif" }}>
            Top donor: {politician.top_donor_industry}
          </span>
        </div>
      ) : null}

      {/* ── ROW 5: ACTION BUTTONS ── */}
      <div style={{ marginTop:16, display:"flex", flexWrap:"wrap", gap:8 }}>
        <button type="button"
          onClick={() => router.push(`/politician/${politician.slug}?tab=receipt`)}
          style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, letterSpacing:"0.1em", padding:"8px 16px", borderRadius:6, cursor:"pointer", background:C.gold, color:"#0a0b0d", border:"none", whiteSpace:"nowrap" }}>
          SEE THE RECEIPTS →
        </button>
        <button type="button"
          onClick={() => router.push(`/politician/${politician.slug}?tab=voting`)}
          style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, letterSpacing:"0.1em", padding:"8px 16px", borderRadius:6, cursor:"pointer", background:"transparent", border:`1px solid ${C.gold}`, color:C.gold, whiteSpace:"nowrap" }}>
          VOTING HISTORY
        </button>
        <button type="button"
          onClick={() => router.push(`/politician/${politician.slug}?tab=biography`)}
          style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, letterSpacing:"0.1em", padding:"8px 16px", borderRadius:6, cursor:"pointer", background:"transparent", border:`1px solid ${C.gold}`, color:C.gold, whiteSpace:"nowrap" }}>
          BIOGRAPHY
        </button>
        <button type="button"
          onClick={() => router.push("/call")}
          style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, letterSpacing:"0.1em", padding:"8px 16px", borderRadius:6, cursor:"pointer", background:"transparent", border:`1px solid ${C.parchmentDim}`, color:C.parchmentDim, whiteSpace:"nowrap" }}>
          CALL THIS REP
        </button>
      </div>
    </div>
  );
}

// ── Pill button helper ────────────────────────────────────────────────────────
function Pill({ label, active, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, letterSpacing:"0.08em", padding:"5px 14px", borderRadius:20, cursor:disabled?"default":"pointer", whiteSpace:"nowrap", transition:"all 0.15s",
        background: active ? C.gold : "transparent",
        border: `1px solid ${active ? C.gold : (disabled ? C.parchmentDim : C.gold)}`,
        color: active ? "#0a0b0d" : (disabled ? C.parchmentDim : C.gold),
        opacity: disabled ? 0.5 : 1,
      }}>
      {label}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [politicians,  setPoliticians]  = useState([]);
  const [donationMap,  setDonationMap]  = useState({});
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [followingMap, setFollowingMap] = useState({});
  const [isMobile,     setIsMobile]     = useState(false);

  // Filter + sort state
  const [searchTerm,    setSearchTerm]    = useState("");
  const [partyFilter,   setPartyFilter]   = useState("All");
  const [chamberFilter, setChamberFilter] = useState("All");
  const [stateFilter,   setStateFilter]   = useState("All States");
  const [sortBy,        setSortBy]        = useState("prominence");

  // Build quiz scores from profile columns (same pattern as index.jsx)
  const quizScores = (profile && profile.quiz_level >= 1) ? {
    economic:    profile.score_economic,
    healthcare:  profile.score_healthcare,
    climate:     profile.score_climate,
    criminal:    profile.score_criminal,
    immigration: profile.score_immigration,
    foreign:     profile.score_foreign,
    education:   profile.score_education,
    freedom:     profile.score_freedom,
    guns:        profile.score_guns,
    housing:     profile.score_housing,
    tech:        profile.score_tech,
    voting:      profile.score_voting,
  } : null;
  const hasQuiz = quizScores != null && Object.values(quizScores).some(v => v != null);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Sync followingMap from profile
  useEffect(() => {
    if (!profile?.followed_politicians) return;
    const map = {};
    profile.followed_politicians.forEach(slug => { map[slug] = true; });
    setFollowingMap(map);
  }, [profile?.followed_politicians]);

  // Load politicians + donations
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: pols, error: polsError } = await supabase
        .from("politicians")
        .select("id, name, party, state, chamber, slug, bioguide_id, donor_alignment_score, score_economic, score_healthcare, score_climate, score_criminal, score_immigration, score_foreign, score_education, score_freedom, score_guns, score_housing, score_tech, score_voting, prominence_score, top_donor_industry")
        .order("prominence_score", { ascending: false })
        .limit(100);

      if (polsError) throw polsError;
      setPoliticians(pols || []);

      // Batch-fetch donation breakdowns in parallel
      if (pols && pols.length > 0) {
        const results = await Promise.all(
          pols.map(p =>
            supabase.rpc("get_donation_breakdown", { pol_id: p.id })
              .then(({ data }) => ({ id: p.id, data: data?.[0] ?? null }))
              .catch(() => ({ id: p.id, data: null }))
          )
        );
        const map = {};
        results.forEach(r => { if (r.data) map[r.id] = r.data; });
        setDonationMap(map);
      }
    } catch (e) {
      console.error("Explore load error:", e.message);
      setError("Could not load politicians.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Follow toggle
  const handleFollowToggle = async (politician) => {
    if (!user) { alert("Sign in to follow politicians"); return; }

    const currentFollowed = profile?.followed_politicians || [];
    const isNowFollowing = followingMap[politician.slug];
    const newFollowed = isNowFollowing
      ? currentFollowed.filter(s => s !== politician.slug)
      : [...currentFollowed, politician.slug];

    // Optimistic update
    setFollowingMap(prev => ({ ...prev, [politician.slug]: !isNowFollowing }));

    try {
      await supabase
        .from("profiles")
        .update({ followed_politicians: newFollowed })
        .eq("id", user.id);
    } catch (e) {
      // Revert on failure
      setFollowingMap(prev => ({ ...prev, [politician.slug]: isNowFollowing }));
      console.error("Follow toggle failed:", e.message);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm(""); setPartyFilter("All");
    setChamberFilter("All"); setStateFilter("All States");
  };

  // Filtered + sorted list
  const myReps = profile?.my_reps || [];
  const processed = politicians
    .filter(p => {
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (partyFilter !== "All") {
        const pl = partyLabel(p.party);
        if (partyFilter === "D" && pl !== "DEM") return false;
        if (partyFilter === "R" && pl !== "REP") return false;
        if (partyFilter === "I" && pl !== "IND") return false;
      }
      if (chamberFilter !== "All" && p.chamber !== chamberFilter) return false;
      if (stateFilter !== "All States" && p.state !== stateFilter) return false;
      return true;
    })
    .map(p => ({
      ...p,
      _isMyRep:  myReps.includes(p.bioguide_id),
      _matchPct: calcMatch(quizScores, p),
    }))
    .sort((a, b) => {
      // Always pin YOUR REP first
      if (a._isMyRep && !b._isMyRep) return -1;
      if (!a._isMyRep && b._isMyRep) return 1;
      if (sortBy === "match" && hasQuiz) {
        return (b._matchPct ?? -1) - (a._matchPct ?? -1);
      }
      if (sortBy === "das") {
        return (b.donor_alignment_score ?? -1) - (a.donor_alignment_score ?? -1);
      }
      // prominence (default)
      return (b.prominence_score ?? 0) - (a.prominence_score ?? 0);
    });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.bg, paddingBottom:80, transform:"none", overflowX:"visible", overflowY:"visible" }}>
      <Head>
        <title>Explore Politicians — Throughline</title>
        <meta name="description" content="Explore every member of Congress. See their donor alignment score, match percentage, and funding sources." />
      </Head>
      <style>{GLOBAL_STYLES}</style>

      <Nav />

      {/* ── Sticky filter bar ──────────────────────────────────────────────── */}
      <div style={{ position:"sticky", top:0, zIndex:100, background:C.bg, borderBottom:`1px solid ${C.border}`, padding:"12px 16px" }}>
        {/* Search */}
        <input
          type="text"
          placeholder="Search politicians..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width:"100%", background:"#11131a", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.parchment, fontFamily:"'Figtree',sans-serif", fontSize:14, outline:"none" }}
        />

        {/* Filter pills + sort */}
        <div style={{ display:"flex", gap:8, marginTop:8, overflowX:"auto", paddingBottom:2, alignItems:"center" }}>
          {/* Party */}
          {["All","D","R","I"].map(v => (
            <Pill key={v} label={v === "All" ? "All Parties" : v} active={partyFilter === v} onClick={() => setPartyFilter(v)} />
          ))}

          <div style={{ width:1, height:20, background:C.border, flexShrink:0, margin:"0 4px" }} />

          {/* Chamber */}
          {["All","Senate","House"].map(v => (
            <Pill key={v} label={v === "All" ? "All Chambers" : v} active={chamberFilter === v} onClick={() => setChamberFilter(v)} />
          ))}

          <div style={{ width:1, height:20, background:C.border, flexShrink:0, margin:"0 4px" }} />

          {/* State dropdown */}
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
            style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, letterSpacing:"0.08em", padding:"5px 10px", borderRadius:20, background:"transparent", border:`1px solid ${C.gold}`, color:C.gold, cursor:"pointer", width:90, flexShrink:0, outline:"none" }}>
            <option value="All States" style={{ background:C.card }}>All States</option>
            {US_STATES.map(s => <option key={s} value={s} style={{ background:C.card }}>{s}</option>)}
          </select>

          <div style={{ flex:1, minWidth:8 }} />

          {/* Sort */}
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, color:C.parchmentDim, letterSpacing:"0.1em", flexShrink:0 }}>SORT:</span>
          <Pill label="Prominence" active={sortBy === "prominence"} onClick={() => setSortBy("prominence")} />
          <Pill label="Match %" active={sortBy === "match"} onClick={() => hasQuiz && setSortBy("match")} disabled={!hasQuiz} />
          <Pill label="DAS" active={sortBy === "das"} onClick={() => setSortBy("das")} />
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:16 }}>

        {/* Loading */}
        {loading && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:16 }}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{ width: isMobile ? "100%" : "calc(50% - 8px)" }}>
                <SkeletonCard />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign:"center", padding:"60px 24px" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, color:C.parchment, marginBottom:12 }}>
              {error}
            </div>
            <button type="button" onClick={loadData}
              style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, letterSpacing:"0.1em", padding:"10px 24px", background:C.gold, color:"#0a0b0d", border:"none", borderRadius:6, cursor:"pointer" }}>
              TRY AGAIN
            </button>
          </div>
        )}

        {/* Empty after filter */}
        {!loading && !error && processed.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 24px" }}>
            <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:14, color:C.parchmentDim, marginBottom:16 }}>
              No politicians match your filters.
            </div>
            <button type="button" onClick={clearFilters}
              style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, letterSpacing:"0.1em", padding:"10px 24px", background:"transparent", border:`1px solid ${C.gold}`, color:C.gold, borderRadius:6, cursor:"pointer" }}>
              CLEAR FILTERS
            </button>
          </div>
        )}

        {/* Results count */}
        {!loading && !error && processed.length > 0 && (
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, color:C.parchmentDim, letterSpacing:"0.1em", marginBottom:12 }}>
            {processed.length} POLITICIAN{processed.length !== 1 ? "S" : ""}
          </div>
        )}

        {/* Cards grid */}
        {!loading && !error && processed.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:16 }}>
            {processed.map(politician => (
              <div key={politician.id} style={{ width: isMobile ? "100%" : "calc(50% - 8px)" }}>
                <PoliticianCard
                  politician={politician}
                  quizScores={hasQuiz ? quizScores : null}
                  donationData={donationMap[politician.id] ?? null}
                  isMyRep={politician._isMyRep}
                  isFollowing={!!followingMap[politician.slug]}
                  onFollowToggle={handleFollowToggle}
                  router={router}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom nav ──────────────────────────────────────────────────────── */}
      <BottomNavBar router={router} />
    </div>
  );
}
