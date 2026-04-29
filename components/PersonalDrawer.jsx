import { useState, useEffect } from "react";
import supabase from "../lib/supabase";

/* ─── Constants ──────────────────────────────────────────────────────────────── */
const DIMS = [
  "economic","healthcare","climate","criminal","immigration","foreign",
  "education","freedom","guns","housing","tech","voting",
];

const DIMENSION_COLORS = {
  economic:"#c9a84c", healthcare:"#c94c78", climate:"#4ca87c",
  criminal:"#c97c4c", immigration:"#4c78c9", foreign:"#8e4cc9",
  education:"#c98e4c", freedom:"#4cc9c9", guns:"#c94c4c",
  housing:"#78c94c", tech:"#4c8ec9", voting:"#c94c9e",
};

const ISSUE_LABELS = {
  economic:"Economic Policy", climate:"Climate & Energy", healthcare:"Healthcare",
  immigration:"Immigration", guns:"Gun Policy", foreign:"Foreign Policy",
  freedom:"Personal Freedom", housing:"Housing & Urban", education:"Education",
  tech:"Tech & Privacy", voting:"Electoral Rights", criminal:"Criminal Justice",
};

const C = {
  bg:          "#0a0b0d",
  bgCard:      "#11131a",
  gold:        "#c9a84c",
  parchment:   "#e8dfc8",
  parchmentDim:"#a89d88",
  red:         "#c94c4c",
  blue:        "#4c78c9",
  purple:      "#8e4cc9",
};

/* ─── ThumbprintPolygon ──────────────────────────────────────────────────────── */
// scores: { economic: 0-100, healthcare: 0-100, ... }
function ThumbprintPolygon({ scores, size = 120 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const pts = DIMS.map((dim, i) => {
    const angle = (Math.PI * 2 * i) / DIMS.length - Math.PI / 2;
    const val = scores[dim] ?? 50;
    const normalized = Math.max(0.1, Math.min(1, val / 100));
    const rr = normalized * r;
    return `${(cx + rr * Math.cos(angle)).toFixed(2)},${(cy + rr * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon
        points={pts}
        fill="rgba(201,168,76,0.12)"
        stroke="#c9a84c"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── deriveProfile ──────────────────────────────────────────────────────────── */
function deriveProfile(scores) {
  if (!scores) return { name: "Your Political Thumbprint", tagline: "Take the quiz to see your political profile." };
  const sorted = DIMS.slice().sort((a, b) => (scores[b] ?? 50) - (scores[a] ?? 50));
  const top = sorted[0];
  const map = {
    economic:   { name: "Economic Thinker",       tagline: "You prioritize fiscal and economic policy above all else." },
    healthcare: { name: "Healthcare Advocate",    tagline: "You believe access to healthcare is a foundational right." },
    climate:    { name: "Climate Champion",        tagline: "Environmental protection is your top policy concern." },
    criminal:   { name: "Justice Reformer",        tagline: "You want to reimagine how society handles crime and punishment." },
    immigration:{ name: "Immigration Hawk",        tagline: "How the country manages its borders defines your politics." },
    foreign:    { name: "Global Strategist",       tagline: "America's role on the world stage matters most to you." },
    education:  { name: "Education First",         tagline: "Investing in schools and learning is your driving priority." },
    freedom:    { name: "Civil Libertarian",       tagline: "Personal freedom and limiting government overreach define you." },
    guns:       { name: "Second Amendment Voice",  tagline: "Gun rights and public safety shape your political identity." },
    housing:    { name: "Housing Advocate",        tagline: "Affordability and urban access are your core concerns." },
    tech:       { name: "Tech Policy Watcher",     tagline: "You're focused on how technology is reshaping power and privacy." },
    voting:     { name: "Democracy Defender",      tagline: "Electoral integrity and voting rights are your north star." },
  };
  return map[top] || { name: "Political Independent", tagline: "Your views span multiple dimensions." };
}

/* ─── SectionHeader ──────────────────────────────────────────────────────────── */
function SectionHeader({ label }) {
  return (
    <div style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 10, letterSpacing: "0.2em",
      color: C.parchmentDim, textTransform: "uppercase",
      padding: "20px 20px 8px",
      borderTop: "1px solid rgba(201,168,76,0.08)",
      marginTop: 8,
    }}>{label}</div>
  );
}

/* ─── RepRow / PolRow ────────────────────────────────────────────────────────── */
function PersonRow({ pol, onClick, showDas = false, actionLabel, onAction }) {
  const pc = pol.party === "D" ? C.blue : pol.party === "R" ? C.red : C.purple;
  const photoUrl = pol.bioguide_id
    ? `https://bioguide.congress.gov/bioguide/photo/${pol.bioguide_id[0].toUpperCase()}/${pol.bioguide_id}.jpg`
    : null;
  const initials = pol.name.split(" ").map(w => w[0]).slice(0, 2).join("");
  const chamberLabel = pol.chamber === "Senate" ? "Sen." : "Rep.";
  const das = pol.donor_alignment_score;
  const dasColor = das == null ? C.parchmentDim : das <= 33 ? "#4ca87c" : das <= 66 ? C.gold : C.red;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {/* Photo */}
      <div style={{
        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
        background: pc + "20", border: `1.5px solid ${pc}40`,
        overflow: "hidden", display: "flex", alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
        fontSize: 14, color: pc,
      }}>
        {photoUrl
          ? <img src={photoUrl} alt={pol.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} onError={e => { e.target.style.display = "none"; }} />
          : initials}
      </div>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15,
          fontWeight: 700, color: C.parchment,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{pol.name}</div>
        <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: C.parchmentDim }}>
          <span style={{ color: pc }}>{pol.party === "D" ? "D" : pol.party === "R" ? "R" : "I"}</span>
          {" · "}{pol.state}{" · "}{chamberLabel}
        </div>
      </div>

      {/* DAS score if requested */}
      {showDas && das != null && (
        <div style={{ textAlign: "right", flexShrink: 0, marginRight: 6 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: C.parchmentDim, letterSpacing: "0.08em" }}>DAS</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17, color: dasColor }}>{das}</div>
        </div>
      )}

      {/* Action button */}
      {actionLabel && (
        <button
          onClick={e => { e.stopPropagation(); onAction && onAction(); }}
          style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
            letterSpacing: "0.1em", color: C.gold,
            background: "transparent", border: "1px solid rgba(201,168,76,0.3)",
            borderRadius: 4, padding: "4px 10px", cursor: "pointer", flexShrink: 0,
          }}
        >{actionLabel}</button>
      )}
    </div>
  );
}

/* ─── PersonalDrawer ─────────────────────────────────────────────────────────── */
export default function PersonalDrawer({ isOpen, onClose, user, profile, router }) {
  const [repsData,      setRepsData]      = useState([]);
  const [followedData,  setFollowedData]  = useState([]);
  const [repsKey,       setRepsKey]       = useState(null);
  const [followedKey,   setFollowedKey]   = useState(null);

  /* Fetch reps when drawer opens — try slug match first, fall back to id */
  useEffect(() => {
    console.log("REPS DEBUG - isOpen:", isOpen);
    console.log("REPS DEBUG - my_reps raw:", profile?.my_reps);
    console.log("REPS DEBUG - my_reps type:", typeof profile?.my_reps);
    console.log("REPS DEBUG - my_reps length:", profile?.my_reps?.length);

    if (!isOpen) return;

    // Handle case where my_reps is stored as a JSON string
    let repsIds = profile?.my_reps;
    if (typeof repsIds === "string") {
      try { repsIds = JSON.parse(repsIds); } catch (e) { repsIds = []; }
    }
    if (!Array.isArray(repsIds) || repsIds.length === 0) return;

    const myRepsKey = repsIds.join(",");
    if (myRepsKey === repsKey) return;

    (async () => {
      let { data, error } = await supabase
        .from("politicians")
        .select("id, name, party, state, chamber, slug, bioguide_id")
        .in("slug", repsIds);

      console.log("REPS RESULT slug query:", data, error);

      if (!data?.length) {
        // my_reps may be stored as UUIDs — try id column
        ({ data, error } = await supabase
          .from("politicians")
          .select("id, name, party, state, chamber, slug, bioguide_id")
          .in("id", repsIds));

        console.log("REPS RESULT id query:", data, error);
      }

      setRepsData(data || []);
      setRepsKey(myRepsKey);
    })();
  }, [isOpen, profile?.my_reps]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Fetch followed politicians — try slug first, fall back to id */
  useEffect(() => {
    if (!isOpen || !profile?.followed_politicians?.length) return;
    const key = profile.followed_politicians.join(",");
    if (key === followedKey) return;

    (async () => {
      let { data } = await supabase
        .from("politicians")
        .select("id, name, party, state, chamber, slug, bioguide_id, donor_alignment_score")
        .in("slug", profile.followed_politicians);

      if (!data?.length) {
        ({ data } = await supabase
          .from("politicians")
          .select("id, name, party, state, chamber, slug, bioguide_id, donor_alignment_score")
          .in("id", profile.followed_politicians));
      }

      setFollowedData(data || []);
      setFollowedKey(key);
    })();
  }, [isOpen, profile?.followed_politicians]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Derive scores and profile type */
  const hasScores = !!(profile && DIMS.some(d => profile[`score_${d}`] != null));
  const scores    = hasScores
    ? Object.fromEntries(DIMS.map(d => [d, profile[`score_${d}`] ?? 50]))
    : null;
  const profileType = deriveProfile(scores);

  /* Navigation helper — close then push */
  const go = (path) => { onClose(); router.push(path); };

  const followed      = profile?.followed_politicians || [];
  const followedIssues = profile?.followed_issues || [];
  const extraFollowed  = followed.length > 4 ? followed.length - 4 : 0;

  return (
    <>
      {/* ── OVERLAY ── */}
      <div
        onClick={onClose}
        style={{
          display: isOpen ? "block" : "none",
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.75)",
          zIndex: 10000,
        }}
      />

      {/* ── DRAWER PANEL ── */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "88%", maxWidth: 380,
        background: C.bg,
        borderLeft: "1px solid rgba(201,168,76,0.2)",
        zIndex: 10001,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
        paddingBottom: 40,
      }}>

        {/* ── HEADER ── */}
        <div style={{
          height: 56, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid rgba(201,168,76,0.1)",
        }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, letterSpacing: "0.3em", color: C.gold,
            textTransform: "uppercase",
          }}>THROUGHLINE</span>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.parchmentDim, display: "flex", alignItems: "center",
            justifyContent: "center", padding: 4, touchAction: "manipulation",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── SECTION 1: THUMBPRINT + IDENTITY ── */}
        <div style={{ padding: "24px 20px 0", textAlign: "center" }}>
          {hasScores ? (
            <>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <ThumbprintPolygon scores={scores} size={120} />
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 22, color: C.parchment, marginTop: 12,
                letterSpacing: "0.04em",
              }}>{profileType.name}</div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic", fontSize: 13, color: C.gold,
                marginTop: 4, lineHeight: 1.5, padding: "0 16px",
              }}>{profileType.tagline}</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
                <button onClick={() => go("/quiz")} style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                  letterSpacing: "0.08em", color: C.gold,
                  background: "transparent", border: `1px solid ${C.gold}`,
                  borderRadius: 4, padding: "6px 14px", cursor: "pointer",
                  touchAction: "manipulation",
                }}>RETAKE QUIZ</button>
                {(profile?.quiz_level || 0) < 2 && (
                  <button onClick={() => go("/quiz?level=2")} style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                    letterSpacing: "0.08em", color: "#0a0b0d",
                    background: C.gold, border: "none",
                    borderRadius: 4, padding: "6px 14px", cursor: "pointer",
                    touchAction: "manipulation",
                  }}>LEVEL 2 →</button>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{
                width: 60, height: 60, borderRadius: "50%",
                border: "1.5px solid rgba(201,168,76,0.3)",
                background: C.bgCard,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a89d88" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
                </svg>
              </div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic", fontSize: 18, color: C.parchment,
                marginTop: 16,
              }}>Your political identity</div>
              <div style={{
                fontFamily: "'Figtree', sans-serif", fontSize: 12,
                color: C.parchmentDim, marginTop: 6,
              }}>Take the quiz to build your thumbprint</div>
              <button onClick={() => go("/quiz")} style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
                letterSpacing: "0.1em", color: "#0a0b0d",
                background: C.gold, border: "none",
                borderRadius: 4, padding: "10px 24px", cursor: "pointer",
                marginTop: 14, touchAction: "manipulation",
              }}>TAKE THE QUIZ →</button>
            </>
          )}
        </div>

        {/* ── SECTION 2: YOUR REPRESENTATIVES ── */}
        <SectionHeader label="YOUR REPRESENTATIVES" />
        <div style={{ padding: "8px 20px", fontSize: 11, color: "#c9a84c", fontFamily: "monospace" }}>
          DEBUG: my_reps = {JSON.stringify(profile?.my_reps)}
        </div>
        {!profile?.my_reps?.length ? (
          <div style={{ padding: "0 20px" }}>
            <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: C.parchmentDim, marginBottom: 8 }}>
              Enter your ZIP to find your reps
            </div>
            <button onClick={() => go("/call")} style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
              letterSpacing: "0.1em", color: C.gold,
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}>Add ZIP →</button>
          </div>
        ) : (
          <div style={{ padding: "0 20px" }}>
            {repsData.map(rep => (
              <PersonRow
                key={rep.slug}
                pol={rep}
                onClick={() => go(`/politician/${rep.slug}`)}
                actionLabel="VIEW →"
                onAction={() => go(`/politician/${rep.slug}`)}
              />
            ))}
          </div>
        )}

        {/* ── SECTION 3: FOLLOWING ── */}
        <SectionHeader label="FOLLOWING" />
        {!followed.length ? (
          <div style={{ padding: "0 20px" }}>
            <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: C.parchmentDim, marginBottom: 8 }}>
              Not following anyone yet.
            </div>
            <button onClick={() => go("/explore")} style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
              letterSpacing: "0.1em", color: C.gold,
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}>Explore →</button>
          </div>
        ) : (
          <div style={{ padding: "0 20px" }}>
            {followedData.slice(0, 4).map(pol => (
              <PersonRow
                key={pol.slug}
                pol={pol}
                onClick={() => go(`/politician/${pol.slug}`)}
                showDas={true}
              />
            ))}
            {extraFollowed > 0 && (
              <button onClick={() => go("/profile")} style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
                letterSpacing: "0.1em", color: C.gold,
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 0 0", display: "block",
              }}>+ {extraFollowed} more →</button>
            )}
          </div>
        )}

        {/* ── SECTION 4: YOUR ISSUES ── */}
        <SectionHeader label="YOUR ISSUES" />
        <div style={{ padding: "0 20px" }}>
          {!followedIssues.length ? (
            <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: C.parchmentDim }}>
              Not following any issues yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {followedIssues.map(issue => {
                const color = DIMENSION_COLORS[issue] || C.gold;
                return (
                  <span key={issue} style={{
                    fontFamily: "'Figtree', sans-serif", fontSize: 11,
                    fontWeight: 600, color,
                    background: color + "18",
                    border: `1px solid ${color}50`,
                    borderRadius: 4, padding: "4px 10px",
                  }}>{ISSUE_LABELS[issue] || issue}</span>
                );
              })}
            </div>
          )}
          <button onClick={() => go("/profile")} style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11,
            letterSpacing: "0.1em", color: C.gold,
            background: "none", border: "none", cursor: "pointer",
            padding: "10px 0 0", display: "block",
          }}>Manage issues →</button>
        </div>

        {/* ── SECTION 5: ACCOUNT ── */}
        <SectionHeader label="ACCOUNT" />
        <div style={{ padding: "0 20px" }}>
          {/* Email */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
            <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: C.parchmentDim }}>Email</span>
            <span style={{
              fontFamily: "'Figtree', sans-serif", fontSize: 11, color: C.parchment,
              maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right",
            }}>{user?.email}</span>
          </div>

          {/* ZIP */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
            <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: C.parchmentDim }}>ZIP Code</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{
                fontFamily: "'Figtree', sans-serif", fontSize: 11,
                color: profile?.zip_code ? C.parchment : C.parchmentDim,
              }}>{profile?.zip_code || "Not set"}</span>
              <button onClick={() => go("/call")} style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10,
                letterSpacing: "0.1em", color: C.gold,
                background: "none", border: "none", cursor: "pointer", padding: 0,
              }}>Update →</button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(201,168,76,0.08)", margin: "8px 0 12px" }} />

          {/* Sign out */}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              onClose();
              router.push("/");
            }}
            style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
              letterSpacing: "0.08em", color: C.red,
              background: "transparent", border: `1px solid ${C.red}`,
              borderRadius: 6, padding: 10, cursor: "pointer",
              width: "100%", touchAction: "manipulation",
            }}
          >SIGN OUT</button>
        </div>

      </div>
    </>
  );
}
