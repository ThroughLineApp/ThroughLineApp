import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import supabase from "../lib/supabase";
import { useAuth } from "../lib/auth";
import Nav from "../components/Nav";

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
  .pol-card:hover { border-color: rgba(201,168,76,0.35) !important; }
  .unfollow-btn:hover { background: rgba(201,76,76,0.12) !important; border-color: #c94c4c !important; color: #c94c4c !important; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }
`;

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

function polygonPoints(scores, cx, cy, r) {
  return DIMS.map((dim, i) => {
    const angle = (Math.PI * 2 * i) / DIMS.length - Math.PI / 2;
    const rad = ((scores[dim] ?? 50) / 100) * r;
    return [cx + rad * Math.cos(angle), cy + rad * Math.sin(angle)];
  });
}

function ThumbprintSVG({ scores, size = 240 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const pts = polygonPoints(scores, cx, cy, r);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25,0.5,0.75,1.0].map(ring => {
        const rp = DIMS.map((_,i) => { const a=(Math.PI*2*i)/DIMS.length-Math.PI/2; return [cx+ring*r*Math.cos(a),cy+ring*r*Math.sin(a)]; });
        return <polygon key={ring} points={rp.map(p=>p.join(",")).join(" ")} fill="none" stroke="rgba(201,168,76,0.07)" strokeWidth="1"/>;
      })}
      {DIMS.map((_,i) => { const a=(Math.PI*2*i)/DIMS.length-Math.PI/2; return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="rgba(201,168,76,0.09)" strokeWidth="1"/>; })}
      <polygon points={pts.map(p=>p.join(",")).join(" ")} fill="rgba(201,168,76,0.07)" stroke="#c9a84c" strokeWidth="2.5" strokeLinejoin="round"
        style={{ strokeDasharray:1400, strokeDashoffset:1400, animation:"thumbDraw 1.8s ease forwards 0.3s" }}/>
      {pts.map((pt,i) => <circle key={i} cx={pt[0]} cy={pt[1]} r={4} fill={Object.values(DIMENSION_COLORS)[i]} opacity={0.9}/>)}
      {DIMS.map((dim,i) => { const a=(Math.PI*2*i)/DIMS.length-Math.PI/2; const lr=r+22; return (
        <text key={dim} x={cx+lr*Math.cos(a)} y={cy+lr*Math.sin(a)} textAnchor="middle" dominantBaseline="middle"
          fontSize="7" fontFamily="'Barlow Condensed',sans-serif" fontWeight="700" fill={DIMENSION_COLORS[dim]} opacity={0.75}
        >{DIMENSION_ICONS[dim]}</text>
      );})}
    </svg>
  );
}

function SectionLabel({ text }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:"0.28em", color:C.parchmentDim, textTransform:"uppercase" }}>{text}</span>
      <div style={{ flex:1, height:1, background:"rgba(201,168,76,0.1)" }}/>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, unfollowPolitician, unfollowIssue, loading } = useAuth();

  const [quizResult, setQuizResult]         = useState(null);
  const [followedPols, setFollowedPols]     = useState([]);
  const [loadingPols, setLoadingPols]       = useState(false);
  const [pageReady, setPageReady]           = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading]);

  // Load quiz result
  useEffect(() => {
    if (!profile?.quiz_result_id) return;
    supabase.from("quiz_results").select("*").eq("id", profile.quiz_result_id).single()
      .then(({ data }) => { if (data) setQuizResult(data); });
  }, [profile?.quiz_result_id]);

  // Load followed politician details
  useEffect(() => {
    if (!profile?.followed_politicians?.length) { setFollowedPols([]); return; }
    setLoadingPols(true);
    supabase.from("politicians")
      .select("name, slug, party, state, chamber, bioguide_id, donor_alignment_score")
      .in("slug", profile.followed_politicians)
      .then(({ data }) => { setFollowedPols(data || []); setLoadingPols(false); });
  }, [profile?.followed_politicians]);

  useEffect(() => {
    if (!loading) setTimeout(() => setPageReady(true), 100);
  }, [loading]);

  const handleUnfollowPol = async (slug) => {
    await unfollowPolitician(slug);
  };

  const handleUnfollowIssue = async (issue) => {
    await unfollowIssue(issue);
  };

  const hasQuiz = !!(
    profile?.quiz_result_id ||
    profile?.score_economic != null
  );

  const scores = quizResult ? {
    economic:    quizResult.score_economic,
    healthcare:  quizResult.score_healthcare,
    climate:     quizResult.score_climate,
    criminal:    quizResult.score_criminal,
    immigration: quizResult.score_immigration,
    foreign:     quizResult.score_foreign,
    education:   quizResult.score_education,
    freedom:     quizResult.score_freedom,
    guns:        quizResult.score_guns,
    housing:     quizResult.score_housing,
    tech:        quizResult.score_tech,
    voting:      quizResult.score_voting,
  } : (hasQuiz ? {
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
  } : null);

  const partyColor = p => p==="D" ? C.blue : p==="R" ? C.red : C.purple;
  const dasColor = s => s==null ? C.parchmentDim : s<=33 ? C.green : s<=66 ? C.gold : C.red;

  if (loading || !pageReady) return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:14, color:C.parchmentDim }}>Loading…</div>
      </div>
    </>
  );

  if (!user) return null;

  return (
    <>
      <Head>
        <title>My Profile · Throughline</title>
        <meta name="description" content="Your political thumbprint and followed politicians on Throughline." />
      </Head>
      <style>{GLOBAL_STYLES}</style>
      <Nav />
      <div style={{ minHeight:"100vh", background:C.bg, color:C.parchment, fontFamily:"'Figtree',sans-serif" }}>
        <div style={{ maxWidth:640, margin:"0 auto", padding:"32px 20px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom:40, animation:"fadeSlideIn 0.5s ease forwards" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:"0.3em", color:C.gold, marginBottom:10 }}>YOUR PROFILE</div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontStyle:"italic", fontSize:"clamp(24px,5vw,36px)", color:C.parchment, lineHeight:1.2, marginBottom:8 }}>
              Your political identity,<br /><span style={{ color:C.gold }}>in your own words.</span>
            </h1>
            <p style={{ fontFamily:"'Figtree',sans-serif", fontSize:14, color:C.parchmentDim, lineHeight:1.7 }}>
              Track the politicians you follow, the issues you care about, and how your beliefs map across every dimension of American politics.
            </p>
          </div>

          {/* THUMBPRINT SECTION */}
          {hasQuiz ? (
            <div style={{ marginBottom:44, animation:"fadeSlideIn 0.5s ease forwards 0.1s", opacity:0 }}>
              <SectionLabel text="Your Political Thumbprint" />
              <div style={{ background:C.bgCard, border:`1px solid ${C.goldBorderDim}`, borderRadius:4, padding:"24px 20px" }}>
                <div style={{ display:"flex", gap:24, alignItems:"flex-start", flexWrap:"wrap" }}>
                  <div style={{ flexShrink:0 }}>
                    <ThumbprintSVG scores={scores} size={200}/>
                  </div>
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:"0.25em", color:C.gold, marginBottom:14 }}>DIMENSION SCORES</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {DIMS.map(dim => {
                        const score = scores[dim] ?? 50;
                        const color = DIMENSION_COLORS[dim];
                        return (
                          <div key={dim} style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:11, color, flexShrink:0, width:14, textAlign:"center" }}>{DIMENSION_ICONS[dim]}</span>
                            <span style={{ fontFamily:"'Figtree',sans-serif", fontWeight:500, fontSize:11, color:C.parchmentDim, width:110, flexShrink:0 }}>{DIMENSION_LABELS[dim]}</span>
                            <div style={{ flex:1, height:3, background:"rgba(255,255,255,0.05)", borderRadius:2, overflow:"hidden" }}>
                              <div style={{ "--bar-w":`${score}%`, height:"100%", width:`${score}%`, background:color, borderRadius:2, animation:"barGrow 1s ease forwards 0.5s" }}/>
                            </div>
                            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:12, color, width:28, textAlign:"right", flexShrink:0 }}>{Math.round(score)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={() => router.push("/quiz")}
                      style={{ marginTop:16, fontFamily:"'Figtree',sans-serif", fontWeight:600, fontSize:12, color:C.parchmentDim, background:"transparent", border:`1px solid rgba(201,168,76,0.2)`, borderRadius:4, padding:"7px 14px", cursor:"pointer" }}
                    >Retake the Quiz</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom:44, animation:"fadeSlideIn 0.5s ease forwards 0.1s", opacity:0 }}>
              <SectionLabel text="Your Political Thumbprint" />
              <div style={{ background:C.bgCard, border:`1px solid ${C.goldBorderDim}`, borderRadius:4, padding:"32px 24px", textAlign:"center" }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontStyle:"italic", fontSize:20, color:C.parchment, marginBottom:10, lineHeight:1.4 }}>
                  You haven't taken the quiz yet.
                </div>
                <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:13, color:C.parchmentDim, lineHeight:1.7, marginBottom:22, maxWidth:380, margin:"0 auto 22px" }}>
                  Answer 12 questions to map your beliefs across every major policy dimension and find the politicians who actually represent you.
                </div>
                <button onClick={() => router.push("/quiz")}
                  style={{ fontFamily:"'Figtree',sans-serif", fontWeight:800, fontSize:15, color:C.bg, background:C.gold, border:"none", borderRadius:4, padding:"13px 36px", cursor:"pointer" }}
                >Take the Quiz →</button>
              </div>
            </div>
          )}

          {/* BADGES */}
          {profile?.badges?.length > 0 && (
            <div style={{ marginBottom:32 }}>
              <div style={{ fontSize:11, letterSpacing:"0.2em", color:C.gold, marginBottom:12, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif" }}>YOUR BADGES</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {profile.badges.map(id => {
                  const b = { voter:{icon:"🗳️",label:"Voter"}, informed:{icon:"📊",label:"Informed"}, wonk:{icon:"🏛️",label:"Wonk"}, activist:{icon:"✊",label:"Activist"}, engaged:{icon:"🔔",label:"Engaged"}, analyst:{icon:"🔍",label:"Analyst"} }[id];
                  if (!b) return null;
                  return (
                    <div key={id} style={{ padding:"8px 14px", background:C.bgCard, border:`1px solid rgba(201,168,76,0.25)`, borderRadius:20, display:"flex", alignItems:"center", gap:7 }}>
                      <span>{b.icon}</span>
                      <span style={{ fontSize:12, fontWeight:600, color:C.parchment, fontFamily:"'Figtree',sans-serif" }}>{b.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEVEL 2 CTA */}
          {profile?.quiz_level === 1 && (
            <div style={{
              background: "#111318",
              borderRadius: 12,
              border: "0.5px solid rgba(201,168,76,0.3)",
              padding: "20px 16px",
              marginTop: 16,
              marginBottom: 32,
              textAlign: "center",
            }}>
              <p style={{ color: "#C9A84C", fontFamily: "Arial Black", fontSize: 15, margin: "0 0 6px" }}>🧠 Level 2 Unlocked</p>
              <p style={{ color: "#9A9488", fontFamily: "Arial", fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>
                Take the Informed Quiz to refine your political profile across all 12 dimensions.
              </p>
              <button
                onClick={() => router.push("/quiz?level=2")}
                style={{ background: "#C9A84C", color: "#0A0B0D", border: "none", borderRadius: 8, padding: "12px 24px", fontFamily: "Arial Black", fontSize: 14, cursor: "pointer", width: "100%" }}
              >Start Level 2 →</button>
            </div>
          )}

          {/* FOLLOWED POLITICIANS */}
          <div style={{ marginBottom:44, animation:"fadeSlideIn 0.5s ease forwards 0.2s", opacity:0 }}>
            <SectionLabel text={`Following · ${profile?.followed_politicians?.length || 0} Politicians`} />
            {loadingPols ? (
              <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:13, color:C.parchmentDim, padding:"20px 0" }}>Loading…</div>
            ) : followedPols.length === 0 ? (
              <div style={{ background:C.bgCard, border:`1px solid ${C.goldBorderDim}`, borderRadius:4, padding:"24px 20px", textAlign:"center" }}>
                <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:14, color:C.parchmentDim, lineHeight:1.7, marginBottom:16 }}>
                  You're not following any politicians yet.<br/>Follow politicians from the homepage or their profile pages.
                </div>
                <button onClick={() => router.push("/")}
                  style={{ fontFamily:"'Figtree',sans-serif", fontWeight:700, fontSize:13, color:C.bg, background:C.gold, border:"none", borderRadius:4, padding:"10px 24px", cursor:"pointer" }}
                >Browse Politicians →</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {followedPols.map(pol => {
                  const pc = partyColor(pol.party);
                  const initials = pol.name.split(" ").map(w=>w[0]).slice(0,2).join("");
                  const photoUrl = pol.bioguide_id ? `https://bioguide.congress.gov/bioguide/photo/${pol.bioguide_id[0]}/${pol.bioguide_id}.jpg` : null;
                  const das = pol.donor_alignment_score;
                  return (
                    <div key={pol.slug} className="pol-card"
                      style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:C.bgCard, border:`1px solid ${C.goldBorderDim}`, borderRadius:4, transition:"border-color 0.15s" }}
                    >
                      <div onClick={() => router.push(`/politician/${pol.slug}`)} style={{ display:"flex", alignItems:"center", gap:14, flex:1, cursor:"pointer", minWidth:0 }}>
                        <div style={{ width:44, height:44, borderRadius:"50%", background:pc+"20", color:pc, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:14, flexShrink:0, overflow:"hidden", border:`1.5px solid ${pc}40` }}>
                          {photoUrl ? <img src={photoUrl} alt={pol.name} style={{ width:"100%",height:"100%",objectFit:"cover",objectPosition:"top" }} onError={e=>e.target.style.display="none"}/> : initials}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontFamily:"'Figtree',sans-serif", fontWeight:700, fontSize:15, color:C.parchment, marginBottom:2 }}>{pol.name}</div>
                          <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:12, color:C.parchmentDim }}>{pol.party} · {pol.state} · {pol.chamber}</div>
                        </div>
                        {das != null && (
                          <div style={{ textAlign:"center", flexShrink:0 }}>
                            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:9, letterSpacing:"0.08em", textTransform:"uppercase", color:C.parchmentDim, marginBottom:2 }}>DAS</div>
                            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:20, color:dasColor(das) }}>{das}</div>
                          </div>
                        )}
                      </div>
                      <button className="unfollow-btn" onClick={() => handleUnfollowPol(pol.slug)}
                        style={{ fontFamily:"'Figtree',sans-serif", fontWeight:600, fontSize:11, color:C.parchmentDim, background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:4, padding:"7px 12px", cursor:"pointer", flexShrink:0, transition:"all 0.15s ease", whiteSpace:"nowrap" }}
                      >Unfollow</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FOLLOWED ISSUES */}
          <div style={{ marginBottom:44, animation:"fadeSlideIn 0.5s ease forwards 0.3s", opacity:0 }}>
            <SectionLabel text={`Following · ${profile?.followed_issues?.length || 0} Issues`} />
            {!profile?.followed_issues?.length ? (
              <div style={{ background:C.bgCard, border:`1px solid ${C.goldBorderDim}`, borderRadius:4, padding:"24px 20px", textAlign:"center" }}>
                <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:14, color:C.parchmentDim, lineHeight:1.7, marginBottom:16 }}>
                  You're not following any issues yet.<br/>Follow issues from the homepage to track votes that matter to you.
                </div>
                <button onClick={() => router.push("/")}
                  style={{ fontFamily:"'Figtree',sans-serif", fontWeight:700, fontSize:13, color:C.bg, background:C.gold, border:"none", borderRadius:4, padding:"10px 24px", cursor:"pointer" }}
                >Browse Issues →</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {profile.followed_issues.map(issue => {
                  const style = ISSUE_COLORS[issue] || { color:C.gold, border:C.goldBorder, bg:"rgba(201,168,76,0.08)" };
                  const label = ISSUE_LABELS[issue] || issue;
                  return (
                    <div key={issue} style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"8px 12px 8px 16px", borderRadius:4, border:`1.5px solid ${style.border}`, background:style.bg }}>
                      <span style={{ fontFamily:"'Figtree',sans-serif", fontWeight:600, fontSize:13, color:style.color }}>{label}</span>
                      <button onClick={() => handleUnfollowIssue(issue)}
                        style={{ fontFamily:"'Figtree',sans-serif", fontWeight:600, fontSize:11, color:C.parchmentDim, background:"rgba(0,0,0,0.2)", border:"none", borderRadius:3, padding:"3px 8px", cursor:"pointer", transition:"all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.color=C.red; }}
                        onMouseLeave={e => { e.currentTarget.style.color=C.parchmentDim; }}
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COMING SOON — FEED TEASER */}
          <div style={{ padding:22, background:C.bgDeep, border:`1px solid ${C.goldBorderDim}`, borderRadius:4, textAlign:"center", animation:"fadeSlideIn 0.5s ease forwards 0.4s", opacity:0 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:12, letterSpacing:"0.15em", color:C.gold, marginBottom:8 }}>YOUR FEED — COMING SOON</div>
            <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:13, color:C.parchmentDim, lineHeight:1.7 }}>
              When a politician you follow receives a donation and then votes, you'll see the story here — personalized to your values and the issues you care about.
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
