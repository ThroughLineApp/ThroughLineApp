import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import supabase from "../lib/supabase";
import { useAuth } from "../lib/auth";

/* ─── Design tokens ─────────────────────────────────────────── */
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
};

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Barlow+Condensed:wght@400;700;800&family=Playfair+Display:ital,wght@1,400;1,700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0b0d; }
  @keyframes fadeSlideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes thumbDraw { from{stroke-dashoffset:1400} to{stroke-dashoffset:0} }
  @keyframes barGrow { from{width:0} to{width:var(--bar-w)} }
  @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
  .pol-card:hover { border-color: rgba(201,168,76,0.35) !important; }
  .unfollow-btn:hover { background: rgba(201,76,76,0.12) !important; border-color: #c94c4c !important; color: #c94c4c !important; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }
`;

/* ─── Dimension metadata ────────────────────────────────────── */
const DIMENSION_ICONS = {
  economic:"◈", healthcare:"✦", climate:"❋", criminal:"⊕",
  immigration:"◎", foreign:"⊞", education:"◇", freedom:"◉",
  guns:"⊗", housing:"⬡", tech:"⊛", voting:"◐",
};
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
const ISSUE_COLORS = {
  economic:   { color:"#c9a84c", border:"rgba(201,168,76,0.4)",  bg:"rgba(201,168,76,0.08)" },
  climate:    { color:"#4ca87c", border:"rgba(76,168,124,0.4)",  bg:"rgba(76,168,124,0.08)" },
  healthcare: { color:"#c94c78", border:"rgba(201,76,120,0.4)",  bg:"rgba(201,76,120,0.08)" },
  immigration:{ color:"#4c78c9", border:"rgba(76,120,201,0.4)",  bg:"rgba(76,120,201,0.08)" },
  guns:       { color:"#c94c4c", border:"rgba(201,76,76,0.4)",   bg:"rgba(201,76,76,0.08)"  },
  foreign:    { color:"#7c4cc9", border:"rgba(124,76,201,0.4)",  bg:"rgba(124,76,201,0.08)" },
  freedom:    { color:"#4cc9c9", border:"rgba(76,201,201,0.4)",  bg:"rgba(76,201,201,0.08)" },
  housing:    { color:"#78c94c", border:"rgba(120,201,76,0.4)",  bg:"rgba(120,201,76,0.08)" },
  education:  { color:"#c98e4c", border:"rgba(201,142,76,0.4)",  bg:"rgba(201,142,76,0.08)" },
  tech:       { color:"#4c8ec9", border:"rgba(76,142,201,0.4)",  bg:"rgba(76,142,201,0.08)" },
  voting:     { color:"#c94c9e", border:"rgba(201,76,158,0.4)",  bg:"rgba(201,76,158,0.08)" },
  criminal:   { color:"#c97c4c", border:"rgba(201,124,76,0.4)",  bg:"rgba(201,124,76,0.08)" },
};
const ISSUE_LABELS = {
  economic:"Economic Policy", climate:"Climate & Energy", healthcare:"Healthcare",
  immigration:"Immigration", guns:"Gun Policy", foreign:"Foreign Policy",
  freedom:"Personal Freedom", housing:"Housing & Urban", education:"Education",
  tech:"Tech & Privacy", voting:"Electoral Rights", criminal:"Criminal Justice",
};
const DIMS = Object.keys(DIMENSION_COLORS);

/* ─── ThumbprintSVG (copied from quiz.jsx) ──────────────────── */
function ThumbprintSVG({ scores, size = 220, animate = true }) {
  const cx = size / 2, cy = size / 2, r = size * 0.40;
  const pt = (i, rr) => {
    const a = (Math.PI * 2 * i) / DIMS.length - Math.PI / 2;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  };
  const pts = DIMS.map((dim, i) => {
    const rr = ((scores[dim] ?? 50) / 100) * r;
    return pt(i, rr);
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map(f => {
        const rp = DIMS.map((_, i) => pt(i, f * r));
        return <polygon key={f} points={rp.map(p => p.join(",")).join(" ")} fill="none" stroke="rgba(201,168,76,0.07)" strokeWidth="1"/>;
      })}
      {DIMS.map((_, i) => {
        const [x, y] = pt(i, r);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(201,168,76,0.09)" strokeWidth="1"/>;
      })}
      <polygon
        points={pts.map(p => p.join(",")).join(" ")}
        fill="rgba(201,168,76,0.07)"
        stroke="#c9a84c"
        strokeWidth="2.5"
        strokeLinejoin="round"
        style={animate ? { strokeDasharray: 1400, strokeDashoffset: 1400, animation: "thumbDraw 2s ease forwards 0.4s" } : {}}
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={4.5} fill={Object.values(DIMENSION_COLORS)[i]} opacity={0.9}/>
      ))}
      {DIMS.map((dim, i) => {
        const [x, y] = pt(i, r + 22);
        return (
          <text key={dim} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize="8" fontFamily="'Barlow Condensed',sans-serif" fontWeight="700"
            fill={DIMENSION_COLORS[dim]} opacity={0.7}>
            {DIMENSION_ICONS[dim]}
          </text>
        );
      })}
    </svg>
  );
}

/* ─── deriveProfile — gives an archetype label from top scores ─ */
function deriveProfile(scores) {
  if (!scores) return { name: "Your Political Thumbprint", tagline: "Take the quiz to see your political profile." };
  const sorted = DIMS.slice().sort((a, b) => (scores[b] ?? 50) - (scores[a] ?? 50));
  const top = sorted[0];
  const map = {
    economic:   { name: "Economic Thinker",     tagline: "You prioritize fiscal and economic policy above all else." },
    healthcare: { name: "Healthcare Advocate",  tagline: "You believe access to healthcare is a foundational right." },
    climate:    { name: "Climate Champion",      tagline: "Environmental protection is your top policy concern." },
    criminal:   { name: "Justice Reformer",      tagline: "You want to reimagine how society handles crime and punishment." },
    immigration:{ name: "Immigration Hawk",      tagline: "How the country manages its borders defines your politics." },
    foreign:    { name: "Global Strategist",     tagline: "America's role on the world stage matters most to you." },
    education:  { name: "Education First",       tagline: "Investing in schools and learning is your driving priority." },
    freedom:    { name: "Civil Libertarian",     tagline: "Personal freedom and limiting government overreach define you." },
    guns:       { name: "Second Amendment Voice",tagline: "Gun rights and public safety shape your political identity." },
    housing:    { name: "Housing Advocate",      tagline: "Affordability and urban access are your core concerns." },
    tech:       { name: "Tech Policy Watcher",   tagline: "You're focused on how technology is reshaping power and privacy." },
    voting:     { name: "Democracy Defender",    tagline: "Electoral integrity and voting rights are your north star." },
  };
  return map[top] || { name: "Political Independent", tagline: "Your views span multiple dimensions." };
}

/* ─── SectionLabel ─────────────────────────────────────────── */
function SectionLabel({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: "0.28em", color: C.parchmentDim, textTransform: "uppercase" }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.1)" }}/>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, setShowAuthModal, unfollowPolitician, unfollowIssue } = useAuth();

  const [followedPols,   setFollowedPols]   = useState([]);
  const [myReps,         setMyReps]         = useState([]);
  const [loadingPols,    setLoadingPols]    = useState(false);
  const [loadingReps,    setLoadingReps]    = useState(false);
  const [signingOut,     setSigningOut]     = useState(false);
  const [zipEdit,        setZipEdit]        = useState(false);
  const [zipValue,       setZipValue]       = useState("");
  const [zipSaving,      setZipSaving]      = useState(false);


  /* Init zip from profile */
  useEffect(() => {
    if (profile?.zip_code) setZipValue(profile.zip_code);
  }, [profile?.zip_code]);

  /* Load followed politician details — followed_politicians stores UUIDs */
  useEffect(() => {
    if (!profile?.followed_politicians?.length) { setFollowedPols([]); return; }
    setLoadingPols(true);
    supabase
      .from("politicians")
      .select("name, slug, party, state, chamber, bioguide_id, donor_alignment_score")
      .in("id", profile.followed_politicians)
      .then(({ data }) => { setFollowedPols(data || []); setLoadingPols(false); });
  }, [JSON.stringify(profile?.followed_politicians)]);

  /* Load "your reps" — my_reps stores bioguide_ids */
  useEffect(() => {
    if (!profile?.my_reps?.length) { setMyReps([]); return; }
    setLoadingReps(true);
    supabase
      .from("politicians")
      .select("name, slug, party, state, chamber, bioguide_id, donor_alignment_score")
      .in("bioguide_id", profile.my_reps)
      .then(({ data }) => { setMyReps(data || []); setLoadingReps(false); });
  }, [JSON.stringify(profile?.my_reps)]);


  /* Scores from profile columns */
  const hasQuiz = DIMS.some(d => profile?.[`score_${d}`] != null);
  const scores = hasQuiz ? Object.fromEntries(DIMS.map(d => [d, profile[`score_${d}`] ?? 50])) : null;
  const profileType = deriveProfile(scores);

  const partyColor = p => p === "D" ? C.blue : p === "R" ? C.red : C.purple;
  const dasColor   = s => s == null ? C.parchmentDim : s <= 33 ? C.green : s <= 66 ? C.gold : C.red;

  const handleUnfollowPol   = async (slug)  => { await unfollowPolitician(slug); };
  const handleUnfollowIssue = async (issue) => { await unfollowIssue(issue); };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSaveZip = async () => {
    if (!user) return;
    setZipSaving(true);
    await supabase.from("profiles").update({ zip_code: zipValue }).eq("id", user.id);
    setZipSaving(false);
    setZipEdit(false);
  };

  /* ── Loading / auth gate ── */
  if (loading) return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 14, color: C.parchmentDim }}>Loading…</div>
      </div>
    </>
  );

  if (!user) return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.parchment, fontFamily: "'Figtree',sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 20px 120px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>

        {/* Wordmark */}
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: "0.3em", color: C.gold, marginBottom: 48 }}>
          THROUGHLINE
        </div>

        {/* Ghost thumbprint */}
        <div style={{ opacity: 0.35, marginBottom: 28 }}>
          <ThumbprintSVG scores={Object.fromEntries(DIMS.map(d => [d, 0]))} size={180} animate={false} />
        </div>

        {/* Heading */}
        <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: "clamp(20px,5vw,28px)", color: C.parchment, lineHeight: 1.3, marginBottom: 14 }}>
          Your political identity lives here.
        </div>

        {/* Subtext */}
        <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 14, color: C.parchmentDim, lineHeight: 1.7, marginBottom: 36, maxWidth: 320 }}>
          Take the quiz to build your thumbprint.<br/>No account required.
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 280 }}>
          <button
            onClick={() => router.push("/quiz")}
            style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: "0.12em", color: C.bg, background: C.gold, border: "none", borderRadius: 4, padding: "14px 24px", cursor: "pointer" }}
          >FIND YOUR SHAPE →</button>
          <button
            onClick={() => setShowAuthModal(true)}
            style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.12em", color: C.gold, background: "transparent", border: `1px solid rgba(201,168,76,0.35)`, borderRadius: 4, padding: "14px 24px", cursor: "pointer" }}
          >SIGN IN</button>
        </div>

      </div>
    </div>
  );

  /* ── Politician mini-card (shared for reps + following) ── */
  const PolCard = ({ pol, showUnfollow = false }) => {
    const pc = partyColor(pol.party);
    const photoUrl = pol.bioguide_id
      ? `https://bioguide.congress.gov/bioguide/photo/${pol.bioguide_id[0].toUpperCase()}/${pol.bioguide_id}.jpg`
      : null;
    const initials = pol.name.split(" ").map(w => w[0]).slice(0, 2).join("");
    const das = pol.donor_alignment_score;
    const chamberLabel = pol.chamber === "Senate" ? "Sen." : "Rep.";
    return (
      <div
        className="pol-card"
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 4, transition: "border-color 0.15s" }}
      >
        <div
          onClick={() => router.push(`/politician/${pol.slug}`)}
          style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, cursor: "pointer", minWidth: 0 }}
        >
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: pc + "20", color: pc, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 14, flexShrink: 0, overflow: "hidden", border: `1.5px solid ${pc}40` }}>
            {photoUrl
              ? <img src={photoUrl} alt={pol.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} onError={e => e.target.style.display = "none"}/>
              : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 700, fontSize: 15, color: C.parchment, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pol.name}</div>
            <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 12, color: C.parchmentDim }}>
              <span style={{ color: pc }}>{pol.party === "D" ? "Democrat" : pol.party === "R" ? "Republican" : "Independent"}</span>
              {" · "}{pol.state}{" · "}{chamberLabel}
            </div>
          </div>
          {das != null && (
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, letterSpacing: "0.08em", color: C.parchmentDim, marginBottom: 2 }}>DAS</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 20, color: dasColor(das) }}>{das}</div>
            </div>
          )}
        </div>
        {showUnfollow && (
          <button
            className="unfollow-btn"
            onClick={() => handleUnfollowPol(pol.slug)}
            style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 600, fontSize: 11, color: C.parchmentDim, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "7px 12px", cursor: "pointer", flexShrink: 0, transition: "all 0.15s ease", whiteSpace: "nowrap" }}
          >Unfollow</button>
        )}
      </div>
    );
  };

  /* ─────────────────────────────────────────── RENDER ──── */
  return (
    <div style={{
      position: "relative",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
      touchAction: "pan-y",
      userSelect: "none",
      WebkitUserSelect: "none",
    }}>
      <Head>
        <title>My Profile · Throughline</title>
        <meta name="description" content="Your political thumbprint and followed politicians on Throughline." />
      </Head>
      <style>{GLOBAL_STYLES}</style>

      <div style={{ minHeight: "100vh", background: C.bg, color: C.parchment, fontFamily: "'Figtree',sans-serif" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 120px" }}>

          {/* ── SECTION 1: Header ── */}
          <div style={{ marginBottom: 36, animation: "fadeSlideIn 0.5s ease forwards" }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, letterSpacing: "0.3em", color: C.gold, marginBottom: 10 }}>YOUR PROFILE</div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: "clamp(22px,5vw,32px)", color: C.parchment, lineHeight: 1.2, marginBottom: 8 }}>
              Your political identity,<br/><span style={{ color: C.gold }}>in your own words.</span>
            </h1>
            <p style={{ fontFamily: "'Figtree',sans-serif", fontSize: 14, color: C.parchmentDim, lineHeight: 1.7 }}>
              Track the politicians you follow, the issues you care about, and how your beliefs map across every dimension of American politics.
            </p>
          </div>

          {/* ── SECTION 2: Thumbprint Polygon ── */}
          <div style={{ marginBottom: 44, animation: "fadeSlideIn 0.5s ease forwards 0.1s", opacity: 0 }}>
            <SectionLabel text="Your Political Thumbprint" />
            {hasQuiz ? (
              <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 4, padding: "24px 20px" }}>
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: "0.1em", color: C.gold, marginBottom: 4 }}>
                    {profileType.name}
                  </div>
                  <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.6 }}>
                    {profileType.tagline}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <ThumbprintSVG scores={scores} size={220} animate={true}/>
                </div>

                {/* ── SECTION 3: Dimension Score Bars ── */}
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, letterSpacing: "0.25em", color: C.gold, marginBottom: 12 }}>DIMENSION SCORES</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {DIMS.map(dim => {
                    const score = scores[dim] ?? 50;
                    const color = DIMENSION_COLORS[dim];
                    return (
                      <div key={dim} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color, flexShrink: 0, width: 14, textAlign: "center" }}>{DIMENSION_ICONS[dim]}</span>
                        <span style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 500, fontSize: 11, color: C.parchmentDim, width: 116, flexShrink: 0 }}>{DIMENSION_LABELS[dim]}</span>
                        <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ "--bar-w": `${score}%`, height: "100%", width: `${score}%`, background: color, borderRadius: 2, animation: "barGrow 1s ease forwards 0.5s" }}/>
                        </div>
                        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, color, width: 28, textAlign: "right", flexShrink: 0 }}>{Math.round(score)}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
                  <button
                    onClick={() => router.push("/quiz")}
                    style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 600, fontSize: 12, color: C.parchmentDim, background: "transparent", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 4, padding: "7px 14px", cursor: "pointer" }}
                  >Retake the Quiz</button>
                  {profile?.quiz_level === 1 && (
                    <button
                      onClick={() => router.push("/quiz?level=2")}
                      style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 700, fontSize: 12, color: C.bg, background: C.gold, border: "none", borderRadius: 4, padding: "7px 16px", cursor: "pointer" }}
                    >Level 2 →</button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 4, padding: "32px 24px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 20, color: C.parchment, marginBottom: 10, lineHeight: 1.4 }}>
                  You haven't taken the quiz yet.
                </div>
                <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 13, color: C.parchmentDim, lineHeight: 1.7, marginBottom: 22, maxWidth: 380, margin: "0 auto 22px" }}>
                  Answer 12 questions to map your beliefs across every major policy dimension and find the politicians who actually represent you.
                </div>
                <button
                  onClick={() => router.push("/quiz")}
                  style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 800, fontSize: 15, color: C.bg, background: C.gold, border: "none", borderRadius: 4, padding: "13px 36px", cursor: "pointer" }}
                >Take the Quiz →</button>
              </div>
            )}
          </div>

          {/* ── SECTION 4: Your Representatives ── */}
          <div style={{ marginBottom: 44, animation: "fadeSlideIn 0.5s ease forwards 0.15s", opacity: 0 }}>
            <SectionLabel text={`Your Representatives · ${myReps.length || 0}`} />
            {loadingReps ? (
              <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 13, color: C.parchmentDim, padding: "20px 0" }}>Loading…</div>
            ) : myReps.length === 0 ? (
              <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 4, padding: "24px 20px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 14, color: C.parchmentDim, lineHeight: 1.7, marginBottom: 16 }}>
                  We don't know your ZIP code yet.<br/>Add it below to see your elected representatives.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {myReps.map(pol => <PolCard key={pol.slug} pol={pol} showUnfollow={false}/>)}
              </div>
            )}
          </div>

          {/* ── SECTION 5: Following (Politicians) ── */}
          <div style={{ marginBottom: 44, animation: "fadeSlideIn 0.5s ease forwards 0.2s", opacity: 0 }}>
            <SectionLabel text={`Following · ${profile?.followed_politicians?.length || 0} Politicians`} />
            {loadingPols ? (
              <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 13, color: C.parchmentDim, padding: "20px 0" }}>Loading…</div>
            ) : followedPols.length === 0 ? (
              <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 4, padding: "24px 20px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 14, color: C.parchmentDim, lineHeight: 1.7, marginBottom: 16 }}>
                  You're not following any politicians yet.<br/>Explore politicians to start following them.
                </div>
                <button
                  onClick={() => router.push("/explore")}
                  style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 700, fontSize: 13, color: C.bg, background: C.gold, border: "none", borderRadius: 4, padding: "10px 24px", cursor: "pointer" }}
                >Explore Politicians →</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {followedPols.map(pol => <PolCard key={pol.slug} pol={pol} showUnfollow={true}/>)}
              </div>
            )}
          </div>

          {/* ── SECTION 6: Issues You Follow ── */}
          <div style={{ marginBottom: 44, animation: "fadeSlideIn 0.5s ease forwards 0.25s", opacity: 0 }}>
            <SectionLabel text={`Following · ${profile?.followed_issues?.length || 0} Issues`} />
            {!profile?.followed_issues?.length ? (
              <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 4, padding: "24px 20px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 14, color: C.parchmentDim, lineHeight: 1.7, marginBottom: 16 }}>
                  You're not following any issues yet.<br/>Follow issues from the feed to track votes that matter to you.
                </div>
                <button
                  onClick={() => router.push("/")}
                  style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 700, fontSize: 13, color: C.bg, background: C.gold, border: "none", borderRadius: 4, padding: "10px 24px", cursor: "pointer" }}
                >Go to Feed →</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {profile.followed_issues.map(issue => {
                  const s = ISSUE_COLORS[issue] || { color: C.gold, border: C.goldBorder, bg: "rgba(201,168,76,0.08)" };
                  return (
                    <div key={issue} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 12px 8px 16px", borderRadius: 4, border: `1.5px solid ${s.border}`, background: s.bg }}>
                      <span style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 600, fontSize: 13, color: s.color }}>{ISSUE_LABELS[issue] || issue}</span>
                      <button
                        onClick={() => handleUnfollowIssue(issue)}
                        style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 600, fontSize: 11, color: C.parchmentDim, background: "rgba(0,0,0,0.2)", border: "none", borderRadius: 3, padding: "3px 8px", cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.color = C.red; }}
                        onMouseLeave={e => { e.currentTarget.style.color = C.parchmentDim; }}
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── SECTION 7: Account ── */}
          <div style={{ marginBottom: 24, animation: "fadeSlideIn 0.5s ease forwards 0.3s", opacity: 0 }}>
            <SectionLabel text="Account" />
            <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 4, padding: "20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Email */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, letterSpacing: "0.2em", color: C.parchmentDim, marginBottom: 3 }}>EMAIL</div>
                  <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 14, color: C.parchment }}>{user.email}</div>
                </div>
              </div>

              <div style={{ height: 1, background: "rgba(201,168,76,0.07)" }}/>

              {/* ZIP code */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, letterSpacing: "0.2em", color: C.parchmentDim, marginBottom: 3 }}>ZIP CODE</div>
                  {zipEdit ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="text"
                        value={zipValue}
                        onChange={e => setZipValue(e.target.value.replace(/\D/g, "").slice(0, 5))}
                        placeholder="12345"
                        style={{ width: 90, background: "#0d0f14", border: `1px solid ${C.goldBorder}`, borderRadius: 4, color: C.parchment, fontSize: 14, padding: "6px 10px", fontFamily: "'Figtree',sans-serif", outline: "none" }}
                      />
                      <button
                        onClick={handleSaveZip}
                        disabled={zipSaving || zipValue.length !== 5}
                        style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, color: C.bg, background: zipValue.length === 5 ? C.gold : "rgba(201,168,76,0.3)", border: "none", borderRadius: 4, padding: "6px 14px", cursor: zipValue.length === 5 ? "pointer" : "default" }}
                      >{zipSaving ? "Saving…" : "Save"}</button>
                      <button
                        onClick={() => { setZipEdit(false); setZipValue(profile?.zip_code || ""); }}
                        style={{ fontFamily: "'Figtree',sans-serif", fontSize: 12, color: C.parchmentDim, background: "transparent", border: "none", cursor: "pointer", padding: "6px 4px" }}
                      >Cancel</button>
                    </div>
                  ) : (
                    <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 14, color: profile?.zip_code ? C.parchment : C.parchmentDim }}>
                      {profile?.zip_code || "Not set"}
                    </div>
                  )}
                </div>
                {!zipEdit && (
                  <button
                    onClick={() => setZipEdit(true)}
                    style={{ fontFamily: "'Figtree',sans-serif", fontSize: 12, color: C.gold, background: "transparent", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 4, padding: "6px 14px", cursor: "pointer", flexShrink: 0 }}
                  >{profile?.zip_code ? "Edit" : "Add ZIP"}</button>
                )}
              </div>

              <div style={{ height: 1, background: "rgba(201,168,76,0.07)" }}/>

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 600, fontSize: 14, color: C.red, background: "transparent", border: `1px solid rgba(201,76,76,0.25)`, borderRadius: 4, padding: "12px", cursor: "pointer", transition: "all 0.15s", width: "100%" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,76,76,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >{signingOut ? "Signing out…" : "Sign Out"}</button>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
