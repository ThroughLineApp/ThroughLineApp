import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../lib/auth";
import supabase from "../lib/supabase";

const C = {
  bg: "#0a0b0d",
  bgCard: "#11131a",
  bgDeep: "#0d0f14",
  gold: "#c9a84c",
  goldDim: "#8a6e30",
  goldBorder: "rgba(201,168,76,0.35)",
  goldBorderDim: "rgba(201,168,76,0.15)",
  parchment: "#e8dfc8",
  parchmentDim: "#a89d88",
  green: "#4ca87c",
  red: "#c94c4c",
  blue: "#4c78c9",
  white: "#ffffff",
};

const ALL_POLITICIANS = [
  { id: "mitch-mcconnell", initials: "MM", party: "rep", name: "Mitch McConnell", meta: "R · KY · Senate", das: 84, dasColor: C.red, avg: "$2.4k", avgColor: C.red, events: 47, strip: C.red, donationDate: "Mar 14, 2024", voteType: "no", voteLabel: "VOTED NO · 89 days later", voteColor: C.red, summary: '"$1.2M from pharma PACs — then voted against Medicare drug pricing caps."', followers: "3,847" },
  { id: "bernie-sanders", initials: "BS", party: "dem", name: "Bernie Sanders", meta: "D · VT · Senate", das: 12, dasColor: C.green, avg: "$27", avgColor: C.green, events: 8, strip: C.blue, donationDate: "Jan 9, 2024", voteType: "yes", voteLabel: "VOTED YES · 12 days later", voteColor: C.green, summary: '"Small donor-funded — voted yes on minimum wage increase consistent with stated positions."', followers: "5,112" },
  { id: "amy-klobuchar", initials: "AK", party: "dem", name: "Amy Klobuchar", meta: "D · MN · Senate", das: 48, dasColor: C.gold, avg: "$340", avgColor: C.gold, events: 23, strip: C.blue, donationDate: "Oct 3, 2023", voteType: "yes", voteLabel: "VOTED YES · 61 days later", voteColor: C.green, summary: '"$480K from tech industry — voted yes on weakened antitrust amendment."', followers: "2,291" },
  { id: "rand-paul", initials: "RP", party: "rep", name: "Rand Paul", meta: "R · KY · Senate", das: 31, dasColor: C.green, avg: "$44", avgColor: C.green, events: 14, strip: C.red, donationDate: "Feb 21, 2024", voteType: "no", voteLabel: "VOTED NO · 33 days later", voteColor: C.red, summary: '"Voted no on defense spending — consistent with his stated anti-interventionist record."', followers: "1,876" },
  { id: "alexandria-ocasio-cortez", initials: "AO", party: "dem", name: "Alexandria Ocasio-Cortez", meta: "D · NY · House", das: 9, dasColor: C.green, avg: "$18", avgColor: C.green, events: 5, strip: C.blue, donationDate: "Nov 1, 2023", voteType: "yes", voteLabel: "VOTED YES · 7 days later", voteColor: C.green, summary: '"Grassroots-funded — voted yes on Green New Deal framework consistent with donor base."', followers: "8,204" },
  { id: "ted-cruz", initials: "TC", party: "rep", name: "Ted Cruz", meta: "R · TX · Senate", das: 77, dasColor: C.red, avg: "$1.8k", avgColor: C.red, events: 38, strip: C.red, donationDate: "Apr 4, 2024", voteType: "no", voteLabel: "VOTED NO · 55 days later", voteColor: C.red, summary: '"$900K from oil & gas PACs — voted no on clean energy tax credits."', followers: "2,940" },
  { id: "elizabeth-warren", initials: "EW", party: "dem", name: "Elizabeth Warren", meta: "D · MA · Senate", das: 22, dasColor: C.green, avg: "$31", avgColor: C.green, events: 11, strip: C.blue, donationDate: "Dec 12, 2023", voteType: "yes", voteLabel: "VOTED YES · 19 days later", voteColor: C.green, summary: '"Rejected PAC money — voted yes on Wall Street accountability act."', followers: "4,517" },
  { id: "marco-rubio", initials: "MR", party: "rep", name: "Marco Rubio", meta: "R · FL · Senate", das: 61, dasColor: C.gold, avg: "$620", avgColor: C.red, events: 29, strip: C.red, donationDate: "Feb 8, 2024", voteType: "yes", voteLabel: "VOTED YES · 44 days later", voteColor: C.green, summary: '"$540K from defense contractors — voted yes on expanded military spending bill."', followers: "1,632" },
];

const ALL_ISSUES = [
  { id: "economic",    label: "Economic Policy",  color: "#c9a84c", border: "rgba(201,168,76,0.4)",  bg: "rgba(201,168,76,0.08)" },
  { id: "climate",     label: "Climate & Energy",  color: "#4ca87c", border: "rgba(76,168,124,0.4)", bg: "rgba(76,168,124,0.08)" },
  { id: "healthcare",  label: "Healthcare",         color: "#c94c78", border: "rgba(201,76,120,0.4)", bg: "rgba(201,76,120,0.08)" },
  { id: "immigration", label: "Immigration",        color: "#4c78c9", border: "rgba(76,120,201,0.4)", bg: "rgba(76,120,201,0.08)" },
  { id: "guns",        label: "Gun Policy",         color: "#c94c4c", border: "rgba(201,76,76,0.4)",  bg: "rgba(201,76,76,0.08)" },
  { id: "foreign",     label: "Foreign Policy",     color: "#7c4cc9", border: "rgba(124,76,201,0.4)", bg: "rgba(124,76,201,0.08)" },
  { id: "freedom",     label: "Personal Freedom",   color: "#4cc9c9", border: "rgba(76,201,201,0.4)", bg: "rgba(76,201,201,0.08)" },
  { id: "housing",     label: "Housing & Urban",    color: "#78c94c", border: "rgba(120,201,76,0.4)", bg: "rgba(120,201,76,0.08)" },
  { id: "education",   label: "Education",          color: "#c98e4c", border: "rgba(201,142,76,0.4)", bg: "rgba(201,142,76,0.08)" },
  { id: "tech",        label: "Tech & Privacy",     color: "#4c8ec9", border: "rgba(76,142,201,0.4)", bg: "rgba(76,142,201,0.08)" },
  { id: "voting",      label: "Electoral Rights",   color: "#c94c9e", border: "rgba(201,76,158,0.4)", bg: "rgba(201,76,158,0.08)" },
  { id: "criminal",    label: "Criminal Justice",   color: "#c97c4c", border: "rgba(201,124,76,0.4)", bg: "rgba(201,124,76,0.08)" },
];

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800&family=Playfair+Display:ital,wght@1,400;1,700&family=Inter:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0b0d; }
  @keyframes tlTravel {
    0%   { left: 0; opacity: 1; }
    84%  { left: calc(100% - 7px); opacity: 1; }
    85%  { left: calc(100% - 7px); opacity: 0; }
    86%  { left: 0; opacity: 0; }
    100% { left: 0; opacity: 1; }
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

function PoliticianCard({ pol, onFollow, animateIn, isFollowing }) {
  const router = useRouter();
  const avatarBg    = pol.party === "dem" ? "rgba(76,120,201,0.18)" : "rgba(201,76,76,0.18)";
  const avatarColor = pol.party === "dem" ? "#6a96e8" : "#e87070";
  return (
    <div style={{ background: C.bgCard, border: `1px solid rgba(201,168,76,0.15)`, borderRadius: 2, overflow: "hidden", animation: animateIn ? "cardIn 0.35s ease forwards" : "none" }}>
      <div style={{ height: 5, background: pol.strip }} />
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 14, flexShrink: 0, border: "1.5px solid rgba(201,168,76,0.2)" }}>{pol.initials}</div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: C.parchment, lineHeight: 1.1, marginBottom: 4 }}>{pol.name}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: pol.strip, flexShrink: 0, display: "inline-block" }} />{pol.meta}
              </div>
            </div>
          </div>
          {isFollowing ? (
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: C.green, border: `2px solid ${C.green}`, borderRadius: 2, padding: "7px 14px", whiteSpace: "nowrap", flexShrink: 0 }}>✓ FOLLOWING</div>
          ) : (
            <button onClick={() => onFollow(pol.id, pol.name, "pol")}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.1em", color: "#0a0b0d", backgroundColor: "#ffffff", border: "2px solid #ffffff", borderRadius: 2, padding: "7px 14px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
            >+ FOLLOW</button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
          {[{ label: "Donor Alignment", value: pol.das, color: pol.dasColor }, { label: "Avg Gift", value: pol.avg, color: pol.avgColor }, { label: "Events", value: pol.events, color: C.gold }].map(s => (
            <div key={s.label} style={{ background: C.bgDeep, border: "1px solid rgba(201,168,76,0.08)", borderRadius: 2, padding: "8px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: C.parchmentDim, marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 17, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ background: C.bgDeep, border: "1px solid rgba(201,168,76,0.08)", borderRadius: 2, padding: "9px 11px", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.parchmentDim, marginBottom: 7 }}>Latest throughline</div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, flexShrink: 0 }} />
            <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.2)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -3, width: 7, height: 7, borderRadius: "50%", background: C.gold, animation: "tlTravel 2.8s ease-in-out infinite" }} />
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: pol.voteType === "yes" ? C.green : C.red, flexShrink: 0 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: 9, color: C.parchmentDim }}>
            <span>{pol.donationDate}</span>
            <span style={{ color: pol.voteColor }}>{pol.voteLabel}</span>
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 11.5, color: C.parchment, lineHeight: 1.45, marginTop: 6 }}>{pol.summary}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(201,168,76,0.08)", paddingTop: 10 }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim }}>{pol.followers} followers</span>
          <button onClick={() => router.push(`/politician/${pol.id}`)}
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", color: "#0a0b0d", backgroundColor: C.gold, border: `2px solid ${C.gold}`, borderRadius: 2, padding: "6px 14px", cursor: "pointer" }}
          >VIEW RECEIPT →</button>
        </div>
      </div>
    </div>
  );
}

function IssuePill({ issue, onFollow, isFollowing }) {
  return (
    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 14px", borderRadius: 2, border: `1.5px solid ${isFollowing ? issue.color : issue.border}`, background: issue.bg, color: issue.color, opacity: isFollowing ? 0.6 : 1 }}>
      <span>{issue.label}</span>
      {isFollowing ? (
        <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: C.green, color: "#fff", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✓</div>
      ) : (
        <button onClick={() => onFollow(issue.id, issue.label, "issue")}
          style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "#ffffff", color: "#0a0b0d", fontSize: 16, fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none", flexShrink: 0, padding: 0 }}
        >+</button>
      )}
    </div>
  );
}

function AuthModal({ message, onDismiss }) {
  const [mode, setMode]         = useState("signin");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!email || !email.includes("@")) { setError("Enter a valid email address."); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError(null);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
    }
    setLoading(false);
    onDismiss();
  };

  return (
    <div onClick={onDismiss} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bgCard, border: `1px solid ${C.goldBorder}`, borderRadius: 2, padding: "32px 28px", maxWidth: 340, width: "90%", textAlign: "center" }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: "0.3em", color: C.gold, marginBottom: 10 }}>FREE ACCOUNT</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 20, color: C.parchment, lineHeight: 1.25, marginBottom: 16 }}>
          {message || (mode === "signup" ? "Create your account" : "Sign in to Throughline")}
        </div>
        <div style={{ display: "flex", gap: 0, marginBottom: 20, border: `1px solid ${C.goldBorder}`, borderRadius: 2, overflow: "hidden" }}>
          {["signin", "signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(null); }}
              style={{ flex: 1, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", padding: "8px", border: "none", cursor: "pointer", background: mode === m ? C.gold : "transparent", color: mode === m ? C.bg : C.parchmentDim }}
            >{m === "signin" ? "SIGN IN" : "SIGN UP"}</button>
          ))}
        </div>
        <input type="email" placeholder="your@email.com" value={email}
          onChange={e => { setEmail(e.target.value); setError(null); }}
          style={{ width: "100%", background: C.bgDeep, border: `1.5px solid ${C.goldBorder}`, borderRadius: 2, padding: "12px 14px", fontSize: 14, color: C.parchment, outline: "none", fontFamily: "'Inter', sans-serif", marginBottom: 10 }}
        />
        <input type="password" placeholder="password (6+ characters)" value={password}
          onChange={e => { setPassword(e.target.value); setError(null); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={{ width: "100%", background: C.bgDeep, border: `1.5px solid ${error ? C.red : C.goldBorder}`, borderRadius: 2, padding: "12px 14px", fontSize: 14, color: C.parchment, outline: "none", fontFamily: "'Inter', sans-serif", marginBottom: 10 }}
        />
        {error && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.red, marginBottom: 10 }}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading}
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "0.12em", color: "#0a0b0d", backgroundColor: loading ? C.goldDim : C.gold, border: "none", borderRadius: 2, padding: 13, cursor: loading ? "default" : "pointer", width: "100%", marginBottom: 14 }}
        >{loading ? "LOADING…" : mode === "signup" ? "CREATE ACCOUNT →" : "SIGN IN →"}</button>
        <button onClick={onDismiss} style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, background: "none", border: "none", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>maybe later</button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, showAuthModal, setShowAuthModal, authMessage, followPolitician, followIssue, isFollowingPolitician, isFollowingIssue, signOut } = useAuth();

  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [searching, setSearching]         = useState(false);
  const [shownPols, setShownPols]         = useState(["mitch-mcconnell", "bernie-sanders", "amy-klobuchar", "rand-paul"]);
  const [shownIssues, setShownIssues]     = useState(ALL_ISSUES.slice(0, 8).map(i => i.id));
  const [animatingIn, setAnimatingIn]     = useState(new Set());

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.from("politicians").select("name, party, state, chamber, slug, donor_alignment_score").ilike("name", `%${searchQuery}%`).limit(6);
      if (!error) setSearchResults(data || []);
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const nextPol   = () => ALL_POLITICIANS.find(p => !shownPols.includes(p.id) && !isFollowingPolitician(p.id));
  const nextIssue = () => ALL_ISSUES.find(i => !shownIssues.includes(i.id) && !isFollowingIssue(i.id));

  const handleFollowPol = async (id) => {
    const ok = await followPolitician(id);
    if (ok) {
      const next = nextPol();
      setShownPols(prev => { const u = prev.filter(p => p !== id); return next ? [...u, next.id] : u; });
      if (next) { setAnimatingIn(prev => new Set([...prev, next.id])); setTimeout(() => setAnimatingIn(prev => { const s = new Set(prev); s.delete(next.id); return s; }), 400); }
    }
  };

  const handleFollowIssue = async (id) => {
    const ok = await followIssue(id);
    if (ok) {
      const next = nextIssue();
      setShownIssues(prev => { const u = prev.filter(i => i !== id); return next ? [...u, next.id] : u; });
    }
  };

  const handleFollow = (id, name, type) => type === "pol" ? handleFollowPol(id) : handleFollowIssue(id);

  const sectionLabel = (text) => (
    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", color: C.parchmentDim, textTransform: "uppercase", padding: "0 24px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
      {text}<div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.12)" }} />
    </div>
  );

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ minHeight: "100vh", background: C.bg, color: C.parchment, fontFamily: "'Inter', sans-serif", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 500, height: 300, background: "radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1 }}>

          {/* NAV */}
          <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
  <div>
    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "0.12em", color: C.gold }}>THROUGHLINE</div>
    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, marginTop: 2 }}>Every vote has a price. We show you the receipt.</div>
  </div>
  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
    {user ? (
  <>
    <button onClick={() => router.push("/feed")} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: C.parchment, backgroundColor: "transparent", border: `2px solid rgba(255,255,255,0.2)`, borderRadius: 2, padding: "7px 16px", cursor: "pointer" }}>MY FEED</button>
    <button onClick={() => router.push("/profile")} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: C.gold, backgroundColor: "transparent", border: `2px solid ${C.goldBorder}`, borderRadius: 2, padding: "7px 16px", cursor: "pointer" }}>MY PROFILE</button>
    <button onClick={() => router.push("/quiz")} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: C.parchment, backgroundColor: "transparent", border: `2px solid rgba(255,255,255,0.2)`, borderRadius: 2, padding: "7px 16px", cursor: "pointer" }}>TAKE THE QUIZ</button>
    <button onClick={signOut} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: C.parchmentDim, backgroundColor: "transparent", border: `2px solid rgba(255,255,255,0.15)`, borderRadius: 2, padding: "7px 16px", cursor: "pointer" }}>SIGN OUT</button>
  </>
    ) : (
      <>
        <button onClick={() => setShowAuthModal(true)} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: "#ffffff", backgroundColor: "transparent", border: "2px solid #ffffff", borderRadius: 2, padding: "7px 16px", cursor: "pointer" }}>SIGN IN</button>
        <button onClick={() => router.push("/quiz")} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: "#0a0b0d", backgroundColor: C.gold, border: `2px solid ${C.gold}`, borderRadius: 2, padding: "7px 16px", cursor: "pointer" }}>TAKE THE QUIZ</button>
      </>
    )}
  </div>
</nav>

          {/* HERO */}
          <div style={{ padding: "48px 24px 32px", textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: "0.3em", color: C.gold, marginBottom: 14 }}>FOLLOW THE MONEY</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: "clamp(26px, 5.5vw, 42px)", fontWeight: 700, color: C.parchment, lineHeight: 1.15, marginBottom: 10 }}>
              Who's voting for you —<br />and <span style={{ color: C.gold }}>who's paying them to?</span>
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim, lineHeight: 1.7, marginBottom: 28 }}>
              We draw a straight line from the day a donation was received to the day a politician voted. No spin. Just the receipt.
            </p>
            <div style={{ position: "relative", maxWidth: 480, margin: "0 auto 10px" }}>
              <div style={{ display: "flex", height: 48 }}>
                <input type="text" placeholder="Search any senator or representative…" value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                  style={{ flex: 1, background: C.bgCard, border: `2px solid rgba(201,168,76,0.35)`, borderRight: "none", borderRadius: "2px 0 0 2px", padding: "0 16px", fontSize: 14, color: C.parchment, outline: "none", fontFamily: "'Inter', sans-serif" }}
                />
                <button
                  onClick={() => { setSearchOpen(true); }}
                  style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, color: "#0a0b0d", background: C.gold, border: "none", borderRadius: "0 2px 2px 0", padding: "0 16px", cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.1em" }}>
                  SEARCH
                </button>
              </div>
              {searchOpen && searchQuery.length >= 2 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.bgCard, border: `2px solid rgba(201,168,76,0.35)`, borderTop: "none", borderRadius: "0 0 2px 2px", zIndex: 100 }}>
                  {searchResults.length === 0 && !searching && <div style={{ padding: "14px 16px", fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim }}>No results for "{searchQuery}"</div>}
                  {searchResults.map(r => {
                    const party = r.party?.toLowerCase().startsWith("r") ? "rep" : "dem";
                    const initials = r.name.split(" ").map(w => w[0]).slice(0, 2).join("");
                    const das = r.donor_alignment_score;
                    const dc = das == null ? C.parchmentDim : das < 34 ? C.green : das < 67 ? C.gold : C.red;
                    return (
                      <div key={r.slug} onMouseDown={() => router.push(`/politician/${r.slug}`)}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid rgba(201,168,76,0.07)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#161922"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: party === "dem" ? "rgba(76,120,201,0.18)" : "rgba(201,76,76,0.18)", color: party === "dem" ? "#6a96e8" : "#e87070", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 10, flexShrink: 0 }}>{initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: C.parchment }}>{r.name}</div>
                          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim }}>{r.party} · {r.state} · {r.chamber}</div>
                        </div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: dc, flexShrink: 0 }}>{das != null ? `DAS ${das}` : "—"}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim }}>538 current members · updated quarterly with FEC data</p>
          </div>

          {/* DAS EXPLAINER */}
          <div style={{ padding: "0 24px", marginBottom: 20 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: C.parchment, marginBottom: 4 }}>
              <span style={{ color: C.gold }}>DONOR ALIGNMENT SCORE (DAS)</span> — what does this mean?
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, lineHeight: 1.6, marginBottom: 10, maxWidth: 560 }}>
              A score from 0–100 measuring how often a politician's votes benefit their top donors. Calculated from FEC campaign finance records matched against congressional votes. Lower is cleaner.
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[{ dot: C.green, label: "0–33 · Low — votes don't follow the money" }, { dot: C.gold, label: "34–66 · Moderate — mixed record" }, { dot: C.red, label: "67–100 · High — votes consistently favor donors" }].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.dot, flexShrink: 0 }} />{l.label}
                </div>
              ))}
            </div>
          </div>

          {/* POLITICIAN CARDS */}
          {sectionLabel("MOST WATCHED")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, padding: "0 24px", marginBottom: 32 }}>
            {shownPols.map(id => { const pol = ALL_POLITICIANS.find(p => p.id === id); return pol ? <PoliticianCard key={id} pol={pol} onFollow={handleFollow} animateIn={animatingIn.has(id)} isFollowing={isFollowingPolitician(id)} /> : null; })}
          </div>

          {/* ISSUE PILLS */}
          <div style={{ padding: "0 24px", marginBottom: 40 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", color: C.parchmentDim, textTransform: "uppercase", marginBottom: 0, display: "flex", alignItems: "center", gap: 12 }}>
              FOLLOW BY ISSUE<div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.12)" }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              {shownIssues.map(id => { const issue = ALL_ISSUES.find(i => i.id === id); return issue ? <IssuePill key={id} issue={issue} onFollow={handleFollow} isFollowing={isFollowingIssue(id)} /> : null; })}
            </div>
          </div>

        </div>

        {showAuthModal && <AuthModal message={authMessage} onDismiss={() => setShowAuthModal(false)} />}
      </div>
    </>
  );
}
