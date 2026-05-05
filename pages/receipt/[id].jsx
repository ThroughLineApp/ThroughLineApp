import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import supabase from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import AuthModal from "../../components/AuthModal";
import Nav from "../../components/Nav";

const C = {
  bg:            "#0a0b0d",
  surface:       "#111318",
  surface2:      "#181c22",
  gold:          "#c9a84c",
  goldBorder:    "rgba(201,168,76,0.35)",
  goldBorderDim: "rgba(201,168,76,0.12)",
  text:          "#f0ece4",
  text2:         "#9a9488",
  green:         "#4caf7d",
  red:           "#e05c4b",
  blue:          "#5b9cf6",
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

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,400;1,700&display=swap');
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
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

function formatAmount(amt) {
  if (!amt) return "$0";
  if (amt >= 1_000_000) return `$${(amt / 1_000_000).toFixed(1)}M`;
  if (amt >= 1_000)     return `$${(amt / 1_000).toFixed(0)}K`;
  return `$${amt.toLocaleString()}`;
}
function formatDate(s) {
  if (!s) return "Unknown date";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ReceiptPage({ event, politician }) {
  const router = useRouter();
  const { user, profile, requireAuth, showAuthModal, authMessage, setShowAuthModal } = useAuth();
  const [quizResult, setQuizResult]   = useState(null);
  const [followedDim, setFollowedDim] = useState(false);
  const [copyDone, setCopyDone]       = useState(false);

  // Sync follow state from profile
  useEffect(() => {
    if (event?.dimension && profile?.followed_dimensions) {
      setFollowedDim((profile.followed_dimensions || []).includes(event.dimension));
    }
  }, [profile, event]);

  // Load quiz result for L2+ CTA bar
  useEffect(() => {
    if (!user || !profile?.quiz_result_id || (profile?.quiz_level || 0) < 2) return;
    supabase
      .from("quiz_results")
      .select("*")
      .eq("id", profile.quiz_result_id)
      .single()
      .then(({ data }) => setQuizResult(data || null));
  }, [user, profile]);

  if (!event) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Arial Black", fontSize: 18, color: C.text2 }}>Receipt not found.</div>
      </div>
    );
  }

  // Derived values
  const rawPac   = event.donor_pac_name || event.donor_name || "";
  const pacName  = (rawPac && !rawPac.match(/^C\d{8}$/i))
    ? rawPac
    : (event.donor_industry ? event.donor_industry + " PAC" : "Unknown PAC");
  const industry  = event.donor_industry || "Unknown";
  const howVoted  = event.how_voted || "—";
  const voteColor = ["yea","yes"].includes(howVoted.toLowerCase()) ? C.green : C.red;
  const days      = event.days_between != null ? Math.abs(event.days_between) : null;
  const dimColor  = DIMENSION_COLORS[event.dimension] || C.gold;
  const dimLabel  = DIMENSION_LABELS[event.dimension] || event.dimension || "Policy";
  const quizLevel = profile?.quiz_level || 0;

  const bioguideId = politician?.bioguide_id;
  const photoUrl   = bioguideId
    ? `https://bioguide.congress.gov/bioguide/photo/${bioguideId[0]}/${bioguideId}.jpg`
    : null;
  const initials   = politician?.name
    ? politician.name.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("")
    : "??";
  const partyColor = politician?.party === "R" ? C.red
    : politician?.party === "D" ? C.blue
    : C.text2;
  const partyLabel = politician?.party === "R" ? "REPUBLICAN"
    : politician?.party === "D" ? "DEMOCRAT"
    : politician?.party || "INDEPENDENT";

  const userDimScore = quizResult ? quizResult[`score_${event.dimension}`] : null;

  const handleFollowDim = async () => {
    if (!user) { requireAuth("Sign in to follow issues and get alerts."); return; }
    const current = profile?.followed_dimensions || [];
    const updated = followedDim
      ? current.filter(d => d !== event.dimension)
      : [...current, event.dimension];
    const { error } = await supabase.from("profiles").update({ followed_dimensions: updated }).eq("id", user.id);
    if (!error) setFollowedDim(!followedDim);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Throughline Receipt",
          text: `${politician?.name || "This politician"} received ${formatAmount(event.donation_amount)} then voted ${howVoted.toUpperCase()} on ${event.bill_name || "a bill"}.`,
          url: window.location.href,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const card       = { background: C.surface, borderRadius: 12, border: "0.5px solid rgba(255,255,255,0.08)", padding: 20, marginBottom: 16 };
  const btnGold    = { fontFamily: "Arial Black", fontSize: 12, letterSpacing: "0.06em", padding: "10px 20px", borderRadius: 8, background: C.gold, color: "#0a0b0d", border: "none", cursor: "pointer" };
  const btnOutline = { fontFamily: "Arial Black", fontSize: 12, letterSpacing: "0.06em", padding: "10px 20px", borderRadius: 8, background: "transparent", color: C.gold, border: `1.5px solid ${C.gold}`, cursor: "pointer" };

  return (
    <>
      <Head>
        <title>{politician?.name || "Politician"} — Throughline Receipt</title>
        <meta name="description" content={`${politician?.name} received ${formatAmount(event.donation_amount)} from ${pacName} then voted ${howVoted.toUpperCase()}.`} />
      </Head>
      <style>{GLOBAL_STYLES}</style>

      <Nav />
      <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Arial" }}>

        {/* ── HEADER ───────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: `0.5px solid ${C.goldBorderDim}`,
          position: "sticky", top: 0, zIndex: 100, background: C.bg,
        }}>
          <button onClick={() => router.push("/")}
            style={{ fontFamily: "Arial Black", fontSize: 13, letterSpacing: "0.25em", color: C.gold, background: "none", border: "none", cursor: "pointer" }}>
            THROUGHLINE
          </button>
          <button onClick={() => router.back()}
            style={{ fontFamily: "Arial", fontSize: 13, color: C.text2, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.03em" }}>
            ← BACK
          </button>
        </div>

        <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 60px" }}>

          {/* ── RECEIPT HERO CARD ─────────────────────────────── */}
          <div style={{
            ...card,
            borderLeft: `4px solid ${C.gold}`,
            paddingLeft: 22,
            animation: "fadeIn 0.4s ease forwards",
          }}>
            <div style={{ fontFamily: "Arial Black", fontSize: 9, letterSpacing: "0.3em", color: C.gold, marginBottom: 16 }}>RECEIPT</div>

            {/* Politician row */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                background: partyColor + "22", border: `1.5px solid ${partyColor}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Arial Black", fontSize: 18, color: partyColor,
              }}>
                {photoUrl
                  ? <img src={photoUrl} alt={politician?.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} onError={e => { e.target.style.display = "none"; }} />
                  : initials}
              </div>
              <div>
                <div style={{ fontFamily: "Arial Black", fontSize: 20, color: C.text, lineHeight: 1.1, marginBottom: 6 }}>
                  {politician?.name || "Unknown Politician"}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "Arial Black", fontSize: 9, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 4, background: partyColor + "22", color: partyColor, border: `1px solid ${partyColor}44` }}>
                    {partyLabel}
                  </span>
                  <span style={{ fontFamily: "Arial", fontSize: 12, color: C.text2 }}>
                    {[politician?.state, politician?.chamber].filter(Boolean).join(" · ")}
                  </span>
                </div>
              </div>
            </div>

            {/* PAC + Amount */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "Arial", fontSize: 10, letterSpacing: "0.15em", color: C.text2, marginBottom: 4, textTransform: "uppercase" }}>Received from</div>
              <div style={{ fontFamily: "Arial Black", fontSize: 15, color: C.text, marginBottom: 12 }}>{pacName}</div>
              <div style={{ fontFamily: "Arial Black", fontSize: 44, color: C.gold, lineHeight: 1 }}>
                {formatAmount(event.donation_amount)}
              </div>
            </div>

            {/* Industry badge */}
            <div style={{ display: "inline-block", fontFamily: "Arial Black", fontSize: 9, letterSpacing: "0.15em", padding: "3px 10px", borderRadius: 6, background: dimColor + "22", color: dimColor, border: `1px solid ${dimColor}44` }}>
              {industry.toUpperCase()}
            </div>
          </div>

          {/* ── TIMELINE STRIP ───────────────────────────────── */}
          <div style={{ ...card, animation: "fadeIn 0.4s ease 0.1s both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, position: "relative" }}>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.gold, margin: "0 auto 6px" }} />
                <div style={{ fontFamily: "Arial", fontSize: 9, letterSpacing: "0.12em", color: C.text2, textTransform: "uppercase", marginBottom: 2 }}>Donation</div>
                <div style={{ fontFamily: "Arial Black", fontSize: 11, color: C.text }}>{formatDate(event.donation_date)}</div>
              </div>
              <div style={{ flex: 1, position: "relative", height: 2, background: "rgba(201,168,76,0.2)", margin: "0 14px" }}>
                <div style={{ position: "absolute", top: -4, width: 10, height: 10, borderRadius: "50%", background: C.gold, animation: "tlTravel 3s ease-in-out infinite" }} />
                {days !== null && (
                  <div style={{ position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)", fontFamily: "Arial Black", fontSize: 11, color: C.gold, whiteSpace: "nowrap" }}>
                    {days} DAYS LATER
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: voteColor, margin: "0 auto 6px", animation: "dotPulse 1.5s ease-in-out 3.2s 3" }} />
                <div style={{ fontFamily: "Arial", fontSize: 9, letterSpacing: "0.12em", color: C.text2, textTransform: "uppercase", marginBottom: 2 }}>Vote cast</div>
                <div style={{ fontFamily: "Arial Black", fontSize: 11, color: C.text }}>{formatDate(event.vote_date)}</div>
              </div>
            </div>
          </div>

          {/* ── VOTE CARD ─────────────────────────────────────── */}
          <div style={{ ...card, animation: "fadeIn 0.4s ease 0.15s both" }}>
            <div style={{ fontFamily: "Arial Black", fontSize: 16, color: C.text, marginBottom: 6, lineHeight: 1.2 }}>
              {event.bill_name || "Unknown Bill"}
            </div>
            <div style={{ fontFamily: "Arial", fontSize: 11, color: C.text2, marginBottom: 14 }}>
              {[event.bill_id, formatDate(event.vote_date)].filter(Boolean).join(" · ")}
              {event.bill_link && (
                <> · <a href={event.bill_link} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, textDecoration: "none" }}>View bill ↗</a></>
              )}
            </div>
            <div style={{ fontFamily: "Arial Black", fontSize: 36, color: voteColor, marginBottom: event.vote_impact ? 14 : 0 }}>
              VOTED {howVoted.toUpperCase()}
            </div>
            {event.vote_impact && (
              <div style={{ fontFamily: "Arial", fontSize: 13, color: C.text, lineHeight: 1.65 }}>{event.vote_impact}</div>
            )}
          </div>

          {/* ── THROUGHLINE NARRATIVE ─────────────────────────── */}
          {event.throughline_summary && (
            <div style={{
              borderLeft: `4px solid ${C.gold}`,
              background: C.surface, borderRadius: "0 12px 12px 0",
              padding: "18px 20px", marginBottom: 16,
              animation: "fadeIn 0.4s ease 0.2s both",
            }}>
              <div style={{ fontFamily: "Arial Black", fontSize: 9, letterSpacing: "0.2em", color: C.gold, marginBottom: 10, textTransform: "uppercase" }}>The Throughline</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 15, color: C.text, lineHeight: 1.8 }}>
                {event.throughline_summary}
              </div>
              {event.corruption_contribution != null && (
                <div style={{ fontFamily: "Arial Black", fontSize: 11, color: C.red, letterSpacing: "0.1em", marginTop: 12 }}>
                  +{Math.round(Number(event.corruption_contribution))} POINTS TO DONOR ALIGNMENT SCORE
                </div>
              )}
            </div>
          )}

          {/* ── ADAPTIVE CTA ──────────────────────────────────── */}
          <div style={{
            background: C.surface2, borderRadius: 12,
            border: `1px solid ${C.goldBorderDim}`,
            padding: 24, marginBottom: 16,
            animation: "fadeIn 0.4s ease 0.25s both",
          }}>
            {!user ? (
              <>
                <div style={{ fontFamily: "Arial Black", fontSize: 20, color: C.text, marginBottom: 8, lineHeight: 1.2 }}>
                  See how YOUR beliefs compare
                </div>
                <div style={{ fontFamily: "Arial", fontSize: 13, color: C.text2, lineHeight: 1.65, marginBottom: 20 }}>
                  Take the quiz to see how your values line up with this vote — and every other vote this politician has made.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={() => requireAuth("Sign in to follow issues and get alerts.")} style={btnGold}>SIGN UP</button>
                  <button onClick={() => router.push("/quiz")} style={btnOutline}>TAKE THE QUIZ</button>
                </div>
              </>
            ) : quizLevel === 0 ? (
              <>
                <div style={{ fontFamily: "Arial Black", fontSize: 20, color: C.text, marginBottom: 8, lineHeight: 1.2 }}>
                  Take the quiz to see your alignment with this vote
                </div>
                <div style={{ fontFamily: "Arial", fontSize: 13, color: C.text2, lineHeight: 1.65, marginBottom: 20 }}>
                  Find out how your beliefs match up with this politician's actual voting record.
                </div>
                <button onClick={() => router.push("/quiz")} style={btnGold}>START QUIZ</button>
              </>
            ) : quizLevel === 1 ? (
              <>
                <div style={{ fontFamily: "Arial Black", fontSize: 20, color: C.text, marginBottom: 8, lineHeight: 1.2 }}>
                  Go deeper — see how this vote affects your L2 profile
                </div>
                <div style={{ fontFamily: "Arial", fontSize: 13, color: C.text2, lineHeight: 1.65, marginBottom: 20 }}>
                  Level 2 refines your thumbprint across all 12 dimensions — including {dimLabel.toLowerCase()}, which this vote directly affects.
                </div>
                <button onClick={() => router.push("/quiz?level=2")} style={btnGold}>CONTINUE TO L2</button>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "Arial Black", fontSize: 20, color: C.text, marginBottom: 4, lineHeight: 1.2 }}>
                  Your thumbprint vs this vote
                </div>
                <div style={{ fontFamily: "Arial Black", fontSize: 9, letterSpacing: "0.2em", color: dimColor, marginBottom: 20, textTransform: "uppercase" }}>
                  {dimLabel}
                </div>
                {userDimScore != null ? (
                  <>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontFamily: "Arial", fontSize: 10, letterSpacing: "0.1em", color: C.text2, width: 86, flexShrink: 0, textTransform: "uppercase" }}>Your score</div>
                      <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${userDimScore}%`, background: dimColor, borderRadius: 4 }} />
                      </div>
                      <div style={{ fontFamily: "Arial Black", fontSize: 14, color: dimColor, width: 28, textAlign: "right" }}>{Math.round(userDimScore)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                      <div style={{ fontFamily: "Arial", fontSize: 10, letterSpacing: "0.1em", color: C.text2, width: 86, flexShrink: 0, textTransform: "uppercase" }}>Vote</div>
                      <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: ["yea","yes"].includes(howVoted.toLowerCase()) ? "100%" : "6%", background: voteColor, borderRadius: 4 }} />
                      </div>
                      <div style={{ fontFamily: "Arial Black", fontSize: 12, color: voteColor, width: 28, textAlign: "right" }}>{howVoted.toUpperCase().slice(0, 3)}</div>
                    </div>
                    <div style={{ fontFamily: "Arial", fontSize: 12, color: C.text2, lineHeight: 1.65 }}>
                      Your {dimLabel.toLowerCase()} score is {Math.round(userDimScore)}. This politician voted {howVoted.toUpperCase()} after receiving {formatAmount(event.donation_amount)} from {pacName}.
                    </div>
                  </>
                ) : (
                  <div style={{ fontFamily: "Arial", fontSize: 13, color: C.text2 }}>Score data pending for this dimension.</div>
                )}
              </>
            )}
          </div>

          {/* ── POLICY FOLLOW STRIP ───────────────────────────── */}
          {event.dimension && (
            <div style={{
              ...card,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              animation: "fadeIn 0.4s ease 0.3s both",
            }}>
              <div>
                <div style={{ fontFamily: "Arial", fontSize: 11, color: C.text2, marginBottom: 4 }}>This vote affects:</div>
                <div style={{ fontFamily: "Arial Black", fontSize: 14, color: dimColor, letterSpacing: "0.05em" }}>
                  {dimLabel.toUpperCase()}
                </div>
              </div>
              <button
                onClick={handleFollowDim}
                style={{
                  fontFamily: "Arial Black", fontSize: 11, letterSpacing: "0.08em",
                  padding: "8px 16px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap",
                  background: followedDim ? dimColor + "22" : "transparent",
                  color: followedDim ? dimColor : C.gold,
                  border: `1.5px solid ${followedDim ? dimColor : C.gold}`,
                }}
              >{followedDim ? "✓ FOLLOWING" : "+ FOLLOW THIS ISSUE"}</button>
            </div>
          )}

          {/* ── DO SOMETHING ABOUT IT ─────────────────────────── */}
          <div style={{
            background: C.surface, borderRadius: 12,
            border: `1.5px solid ${C.goldBorder}`,
            padding: 24, marginBottom: 16,
            animation: "fadeIn 0.4s ease 0.35s both",
          }}>
            <div style={{ fontFamily: "Arial Black", fontSize: 18, color: C.text, marginBottom: 8, letterSpacing: "0.02em" }}>
              DO SOMETHING ABOUT IT
            </div>
            <div style={{ fontFamily: "Arial", fontSize: 13, color: C.text2, lineHeight: 1.65, marginBottom: 20 }}>
              Your representative may be voting on this right now.
            </div>
            <button
              onClick={() => router.push(`/call?bill_id=${encodeURIComponent(event.bill_id || "")}&dimension=${encodeURIComponent(event.dimension || "")}`)}
              style={btnGold}
            >
              FIND MY REP + GET A SCRIPT →
            </button>
          </div>

          {/* ── LOCAL EVENTS ──────────────────────────────────── */}
          <div style={{ ...card, animation: "fadeIn 0.4s ease 0.4s both" }}>
            <div style={{ fontFamily: "Arial Black", fontSize: 18, color: C.text, marginBottom: 8, letterSpacing: "0.02em" }}>
              EVENTS NEAR YOU
            </div>
            <div style={{ fontFamily: "Arial", fontSize: 13, color: C.text2, lineHeight: 1.65, marginBottom: 20 }}>
              Find rallies, town halls, and voting resources relevant to this issue in your area.
            </div>
            <button
              onClick={() => router.push(`/events?dimension=${encodeURIComponent(event.dimension || "")}`)}
              style={btnOutline}
            >
              FIND LOCAL EVENTS →
            </button>
          </div>

          {/* ── SHARE STRIP ───────────────────────────────────── */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", animation: "fadeIn 0.4s ease 0.45s both" }}>
            <button
              onClick={handleCopy}
              style={{ ...btnOutline, color: copyDone ? C.green : C.gold, borderColor: copyDone ? C.green : C.gold }}
            >
              {copyDone ? "✓ COPIED" : "COPY LINK"}
            </button>
            <button onClick={handleShare} style={btnOutline}>SHARE ↗</button>
          </div>

        </div>
      </div>

      {showAuthModal && <AuthModal message={authMessage} onDismiss={() => setShowAuthModal(false)} />}
    </>
  );
}

export async function getServerSideProps({ params }) {
  const { id } = params;

  const { data: event, error } = await supabase
    .from("throughline_events")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !event) return { props: { event: null, politician: null } };

  let politician = null;
  if (event.politician_id) {
    const { data } = await supabase
      .from("politicians")
      .select("id, name, party, state, chamber, bioguide_id, slug")
      .eq("id", event.politician_id)
      .single();
    politician = data || null;
  }

  return { props: { event, politician } };
}
