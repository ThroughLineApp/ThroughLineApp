import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import supabase from "../lib/supabase";
import { useAuth } from "../lib/auth";
import Nav from "../components/Nav";

// ── Global styles ────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Barlow+Condensed:wght@400;600;700;800&family=Playfair+Display:ital,wght@1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0b0d; font-family: 'Figtree', sans-serif; }
  @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0b0d",
  card: "#11131a",
  cardHover: "#161922",
  gold: "#c9a84c",
  parchment: "#e8dfc8",
  parchmentDim: "#a89d88",
  red: "#c94c4c",
  blue: "#4c78c9",
  green: "#4ca87c",
  purple: "#8e4cc9",
  border: "rgba(201,168,76,0.15)",
  borderHover: "rgba(201,168,76,0.40)",
};

const DIMENSION_COLORS = {
  economic: "#c9a84c",
  healthcare: "#c94c78",
  climate: "#4ca87c",
  criminal: "#c94c4c",
  immigration: "#4c78c9",
  foreign: "#7c4cc9",
  education: "#c98e4c",
  freedom: "#4cc9c9",
  guns: "#c94c4c",
  housing: "#78c94c",
  tech: "#4c8ec9",
  voting: "#c94c9e",
};

const DIMENSION_LABELS = {
  economic: "Economic Policy",
  healthcare: "Healthcare",
  climate: "Climate & Energy",
  criminal: "Criminal Justice",
  immigration: "Immigration",
  foreign: "Foreign Policy",
  education: "Education",
  freedom: "Personal Freedom",
  guns: "Gun Policy",
  housing: "Housing & Urban",
  tech: "Tech & Privacy",
  voting: "Electoral Rights",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(n) {
  if (!n) return "";
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "K";
  return "$" + n.toLocaleString();
}

function partyColor(party) {
  if (party === "D") return "#4c78c9";
  if (party === "R") return "#c94c4c";
  return "#8e4cc9";
}

function partyLabel(party) {
  if (party === "D") return "Democrat";
  if (party === "R") return "Republican";
  return "Independent";
}

function dasColor(score) {
  if (score <= 33) return "#4ca87c";
  if (score <= 66) return "#c9a84c";
  return "#c94c4c";
}

function bioguidePhotoUrl(bioguide_id) {
  if (!bioguide_id) return null;
  const letter = bioguide_id[0].toUpperCase();
  return `https://bioguide.congress.gov/bioguide/photo/${letter}/${bioguide_id}.jpg`;
}

// ── CorruptionCard ────────────────────────────────────────────────────────────
function CorruptionCard({ event, userDimensions, router, noLeftBorder, pacNameMap }) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const pol = event.politicians || {};
  const photoUrl = bioguidePhotoUrl(pol.bioguide_id);
  const pColor = partyColor(pol.party);
  const das = pol.donor_alignment_score;

  // Resolved donor display name — look up PAC name from map, fall back to donor_name
  const donorDisplay = pacNameMap?.[event.donor_name] ||
    (event.donor_name && !event.donor_name.startsWith("C00") ? event.donor_name : null);

  // Filter out procedural / uninformative bill names
  const billDisplay = (
    event.bill_name &&
    !event.bill_name.startsWith("On the Cloture") &&
    !event.bill_name.startsWith("On the Nomination") &&
    !event.bill_name.startsWith("On the Motion")
  ) ? event.bill_name : null;

  // Build headline from available fields
  const parts = [];
  if (pol.name) parts.push(pol.name);
  if (event.how_voted) parts.push(`voted ${event.how_voted}`);
  if (billDisplay) parts.push(`on ${billDisplay}`);
  if (event.days_between && donorDisplay) {
    parts.push(`— ${event.days_between} days after a ${formatCurrency(event.donation_amount)} donation from ${donorDisplay}`);
  } else if (event.days_between && event.donation_amount) {
    parts.push(`— ${event.days_between} days after a ${formatCurrency(event.donation_amount)} donation`);
  }
  const headline = parts.length > 0 ? parts.join(" ") + "." : "";

  const dimColor = DIMENSION_COLORS[event.dimension] || C.gold;
  const dimLabel = DIMENSION_LABELS[event.dimension] || event.dimension;
  const userCaresDimension =
    userDimensions &&
    event.dimension &&
    userDimensions[event.dimension] != null;

  return (
    <div
      onClick={() => pol.slug && router.push("/politician/" + pol.slug)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.cardHover : C.card,
        borderRadius: noLeftBorder ? 0 : 8,
        borderLeft: noLeftBorder ? "none" : "3px solid #c9a84c",
        overflow: "hidden",
        padding: 16,
        cursor: pol.slug ? "pointer" : "default",
        transition: "background 0.15s ease",
        animation: "fadeIn 0.3s ease forwards",
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          {photoUrl && !imgError ? (
            <img
              src={photoUrl}
              alt={pol.name || "Politician"}
              onError={() => setImgError(true)}
              style={{
                width: 44, height: 44, borderRadius: "50%",
                objectFit: "cover", border: `2px solid ${pColor}`,
              }}
            />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: pColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 18, fontWeight: 700, color: "#e8dfc8",
            }}>
              {pol.name ? pol.name.charAt(0) : "?"}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 16,
            color: C.parchment,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{pol.name || "Unknown"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2, flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10, fontWeight: 700,
              color: pColor,
              background: pColor + "22",
              padding: "1px 6px", borderRadius: 10,
              letterSpacing: "0.05em",
            }}>{partyLabel(pol.party)}</span>
            {pol.state && (
              <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: C.parchmentDim }}>
                {pol.state}
              </span>
            )}
            {pol.chamber && (
              <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: C.parchmentDim }}>
                · {pol.chamber === "senate" ? "Senate" : "House"}
              </span>
            )}
          </div>
        </div>
        {das != null && (
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 20, fontWeight: 700,
              color: dasColor(das),
            }}>{das}</div>
            <div style={{
              fontFamily: "'Figtree', sans-serif",
              fontSize: 9, color: C.parchmentDim,
              letterSpacing: "0.08em",
            }}>DAS</div>
          </div>
        )}
      </div>

      {/* Headline */}
      {headline && (
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic",
          fontSize: 15, color: C.parchment,
          lineHeight: 1.45, marginTop: 12,
        }}>{headline}</p>
      )}

      {/* Dimension pill */}
      {event.dimension && (
        <div style={{ marginTop: 10 }}>
          <span style={{
            display: "inline-block",
            background: dimColor + "22",
            border: `1px solid ${dimColor}44`,
            color: dimColor,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10, fontWeight: 700,
            letterSpacing: "0.1em",
            padding: "2px 8px", borderRadius: 10,
            textTransform: "uppercase",
          }}>{dimLabel}</span>
        </div>
      )}

      {/* DAS impact line */}
      {event.corruption_contribution != null && (
        <div style={{
          fontFamily: "'Figtree', sans-serif",
          fontSize: 11, color: C.red,
          marginTop: 6,
        }}>+{event.corruption_contribution} pts to Donor Alignment Score</div>
      )}

      {/* Ideology match line */}
      {userCaresDimension && (
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic",
          fontSize: 12, color: C.gold,
          marginTop: 4,
        }}>This affects an issue you care about: {dimLabel}</div>
      )}

      {/* CTA row */}
      <div style={{
        marginTop: 12,
        borderTop: "1px solid rgba(201,168,76,0.10)",
        paddingTop: 10,
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11, letterSpacing: "0.15em",
          color: C.gold,
        }}>VIEW THROUGHLINE →</span>
      </div>
    </div>
  );
}

// ── YourRepCard ───────────────────────────────────────────────────────────────
function YourRepCard({ event, userDimensions, router, pacNameMap }) {
  return (
    <div style={{
      borderRadius: 8,
      overflow: "hidden",
      border: "1px solid rgba(201,168,76,0.35)",
    }}>
      <div style={{
        height: 28,
        background: "rgba(201,168,76,0.12)",
        borderBottom: "1px solid rgba(201,168,76,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 10, fontWeight: 700,
          color: "#c9a84c", letterSpacing: "0.3em",
        }}>YOUR REP</span>
      </div>
      <CorruptionCard
        event={event}
        userDimensions={userDimensions}
        router={router}
        noLeftBorder={true}
        pacNameMap={pacNameMap}
      />
    </div>
  );
}

// ── QuizPromptCard ────────────────────────────────────────────────────────────
function QuizPromptCard({ router }) {
  return (
    <div style={{
      background: C.card,
      borderRadius: 8,
      padding: 24,
      textAlign: "center",
      border: "1px solid rgba(201,168,76,0.25)",
    }}>
      <svg
        width={60} height={60} viewBox="0 0 60 60"
        style={{ opacity: 0.4, marginBottom: 12, display: "block", margin: "0 auto 12px" }}
      >
        <polygon
          points="30,4 54,17 54,43 30,56 6,43 6,17"
          fill="none" stroke="#c9a84c" strokeWidth="1.5"
        />
        <polygon
          points="30,14 44,22 44,38 30,46 16,38 16,22"
          fill="none" stroke="#c9a84c" strokeWidth="0.75" opacity="0.5"
        />
      </svg>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 22, fontWeight: 700,
        color: C.parchment, marginBottom: 8,
      }}>Your feed is running on raw data.</div>
      <div style={{
        fontFamily: "'Figtree', sans-serif",
        fontSize: 13, color: C.parchmentDim,
        lineHeight: 1.5,
      }}>12 questions unlock your political thumbprint and personalize everything you see.</div>
      <button
        onClick={() => router.push("/quiz")}
        style={{
          width: "100%",
          marginTop: 20,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 16, fontWeight: 700,
          letterSpacing: "0.2em",
          color: "#0a0b0d",
          background: "#c9a84c",
          border: "none",
          borderRadius: 4,
          padding: 14,
          cursor: "pointer",
        }}
      >TAKE THE QUIZ →</button>
    </div>
  );
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  const bar = (w, h, extra = {}) => (
    <div style={{
      height: h, width: w,
      background: "rgba(201,168,76,0.06)",
      borderRadius: 4,
      animation: "pulse 1.4s infinite",
      ...extra,
    }} />
  );
  return (
    <div style={{ background: C.card, borderRadius: 8, padding: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(201,168,76,0.06)",
          animation: "pulse 1.4s infinite",
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {bar("55%", 14)}
          {bar("35%", 10)}
        </div>
        {bar(36, 36, { borderRadius: 4 })}
      </div>
      {bar("92%", 13, { marginBottom: 6 })}
      {bar("78%", 13, { marginBottom: 6 })}
      {bar("62%", 13, { marginBottom: 10 })}
      {bar("28%", 20, { borderRadius: 10 })}
    </div>
  );
}

// ── BottomNav (shared) ────────────────────────────────────────────────────────
function BottomNav({ router }) {
  const path = router.pathname;
  const activeId = path === "/" ? "feed" : path === "/quiz" ? "quiz" : path === "/profile" ? "profile" : "";

  const tabs = [
    {
      id: "feed", label: "Feed", route: "/",
      icon: (a) => (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
            stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth={1.6} fill="none" />
          <path d="M9 21V12h6v9" stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth={1.6} />
        </svg>
      ),
    },
    {
      id: "explore", label: "Explore", route: null,
      icon: (a) => (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <circle cx={12} cy={12} r={9} stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth={1.6} />
          <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"
            stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth={1.4} />
        </svg>
      ),
    },
    {
      id: "quiz", label: "Quiz", route: "/quiz",
      icon: (a) => (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <circle cx={12} cy={12} r={9} stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth={1.6} />
          <circle cx={12} cy={12} r={5} stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth={1.3} />
          <circle cx={12} cy={12} r={2} fill={a ? "#c9a84c" : "#a89d88"} />
        </svg>
      ),
    },
    {
      id: "profile", label: "Profile", route: "/profile",
      icon: (a) => (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <circle cx={12} cy={8} r={3.5} stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth={1.6} />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
            stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth={1.6} strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "issues", label: "Issues", route: null,
      icon: (a) => (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <line x1={3} y1={6} x2={21} y2={6} stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth={1.6} strokeLinecap="round" />
          <line x1={3} y1={12} x2={16} y2={12} stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth={1.6} strokeLinecap="round" />
          <line x1={3} y1={18} x2={11} y2={18} stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth={1.6} strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      width: "100%",
      zIndex: 9999,
      background: "#0a0b0d",
      borderTop: "1px solid rgba(201,168,76,0.10)",
      height: "56px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => tab.route ? router.push(tab.route) : alert(`${tab.label} — coming soon`)}
            style={{
              flex: 1,
              height: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: 0,
            }}
          >
            {tab.icon(active)}
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 9, fontWeight: 700,
              letterSpacing: "0.08em",
              color: active ? "#c9a84c" : "#a89d88",
              textTransform: "uppercase",
            }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, setShowAuthModal } = useAuth();
  const [cards, setCards] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);
  const [pacNameMap, setPacNameMap] = useState({});

  // Build quiz scores object from profile columns (0–100 scale)
  const quizScores =
    profile && profile.quiz_level >= 1
      ? {
          economic: profile.score_economic,
          healthcare: profile.score_healthcare,
          climate: profile.score_climate,
          criminal: profile.score_criminal,
          immigration: profile.score_immigration,
          foreign: profile.score_foreign,
          education: profile.score_education,
          freedom: profile.score_freedom,
          guns: profile.score_guns,
          housing: profile.score_housing,
          tech: profile.score_tech,
          voting: profile.score_voting,
        }
      : null;

  const hasQuiz = quizScores != null && Object.values(quizScores).some((v) => v != null);

  useEffect(() => {
    if (authLoading) return; // wait for auth state to resolve

    async function loadFeed() {
      try {
        // ── Query 1: flat events (no nested join) ────────────────────────────
        const { data: events } = await supabase
          .from("throughline_events")
          .select("id, corruption_contribution, dimension, donor_name, donation_amount, donation_date, bill_name, how_voted, days_between, vote_impact, throughline_summary, politician_id")
          .not("corruption_contribution", "is", null)
          .order("corruption_contribution", { ascending: false })
          .limit(200);

        // ── Query 2: flat rep events (logged in + my_reps) ──────────────────
        let rawRepEvents = null;
        const myReps = profile?.my_reps;
        if (user && Array.isArray(myReps) && myReps.length > 0) {
          try {
            const { data: repEvents } = await supabase
              .from("throughline_events")
              .select("id, corruption_contribution, dimension, donor_name, donation_amount, donation_date, bill_name, how_voted, days_between, vote_impact, throughline_summary, politician_id")
              .not("corruption_contribution", "is", null)
              .order("corruption_contribution", { ascending: false })
              .limit(20);
            rawRepEvents = repEvents;
          } catch (e) {
            console.log("Rep event fetch silently failed:", e.message);
          }
        }

        // ── Fetch politicians in one separate query ───────────────────────
        const allRawEvents = [...(events || []), ...(rawRepEvents || [])];
        const politicianIds = [...new Set(allRawEvents.map(e => e.politician_id).filter(Boolean))];
        const politicianMap = {};
        if (politicianIds.length > 0) {
          const { data: politicianRows } = await supabase
            .from("politicians")
            .select("id, name, party, state, chamber, slug, bioguide_id, donor_alignment_score")
            .in("id", politicianIds);
          if (politicianRows) {
            politicianRows.forEach(p => { politicianMap[p.id] = p; });
          }
        }

        // ── Attach politicians to events ─────────────────────────────────
        const enrichedEvents = (events || []).map(e => ({
          ...e,
          politicians: politicianMap[e.politician_id] || null,
        }));

        // ── Find rep event from raw rep events ───────────────────────────
        let repEvent = null;
        if (rawRepEvents && Array.isArray(myReps) && myReps.length > 0) {
          const enrichedRepEvents = rawRepEvents.map(e => ({
            ...e,
            politicians: politicianMap[e.politician_id] || null,
          }));
          const match = enrichedRepEvents.find(
            (e) => e.politicians && myReps.includes(e.politicians.bioguide_id)
          );
          if (match) repEvent = match;
        }

        // ── PAC name lookup (separate query, won't block feed) ───────────
        const allEnrichedEvents = [...enrichedEvents, ...(repEvent ? [repEvent] : [])];
        const pacIds = [...new Set(allEnrichedEvents.map(e => e.donor_name).filter(Boolean))];
        const resolvedPacNameMap = {};
        if (pacIds.length > 0) {
          try {
            const { data: pacRows } = await supabase
              .from("pac_donors")
              .select("pac_id, pac_name")
              .in("pac_id", pacIds.slice(0, 100));
            if (pacRows) {
              pacRows.forEach(row => { if (row.pac_name) resolvedPacNameMap[row.pac_id] = row.pac_name; });
            }
          } catch (e) {
            console.log("PAC name lookup silently failed:", e.message);
          }
        }
        setPacNameMap(resolvedPacNameMap);

        // ── Diagnostic logging ───────────────────────────────────────────
        console.log("Total events fetched:", events?.length);
        console.log("politicianMap size:", Object.keys(politicianMap).length);

        // ── Deduplicate: one event per politician ────────────────────────
        const seenPoliticians = new Set();
        const dedupedEvents = [];
        for (const event of enrichedEvents) {
          const politicianId = event.politicians?.slug || event.politicians?.name;
          if (politicianId && !seenPoliticians.has(politicianId)) {
            seenPoliticians.add(politicianId);
            dedupedEvents.push(event);
          }
        }
        console.log("Unique politicians after dedup:", dedupedEvents.length);

        // ── Ideology weighting (if quiz taken) ────────────────────────────
        let sorted = dedupedEvents;
        if (hasQuiz && quizScores) {
          sorted = sorted
            .map((e) => {
              const userScore = quizScores[e.dimension] ?? 50; // 0–100 scale
              const weight = 1 + (userScore / 100) * 0.8; // 1.0–1.8 multiplier
              return { ...e, _weightedScore: (e.corruption_contribution || 0) * weight };
            })
            .sort((a, b) => b._weightedScore - a._weightedScore);
        }

        // ── Assemble feed array ───────────────────────────────────────────
        const feedCards = sorted.map((e) => ({ type: "corruption", event: e }));

        // Insert your-rep card at index 0 if available
        if (repEvent) {
          feedCards.unshift({ type: "your_rep", event: repEvent });
        }

        // Splice quiz prompt at index 2 if user hasn't taken quiz
        if (!hasQuiz) {
          feedCards.splice(2, 0, { type: "quiz_prompt" });
        }

        setCards(feedCards);
      } catch (e) {
        console.error("Feed load error:", e.message);
        setFeedError("Something went wrong loading the feed.");
      } finally {
        setFeedLoading(false);
      }
    }

    loadFeed();
  }, [authLoading, user?.id]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Throughline — Every vote has a price. We show you the receipt.</title>
        <meta
          name="description"
          content="Track the money behind every congressional vote. See which politicians vote for their donors."
        />
      </Head>
      <style>{GLOBAL_STYLES}</style>

      <Nav />

      {/* ── Sticky top bar ──────────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        height: 52,
        background: "#0a0b0d",
        borderBottom: "1px solid rgba(201,168,76,0.10)",
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        zIndex: 100,
      }}>
        {/* Wordmark */}
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800, fontSize: 15,
          letterSpacing: "0.25em",
          color: "#c9a84c",
        }}>THROUGHLINE</div>

        {/* Right: bell + avatar/sign-in */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Notification bell — non-functional placeholder */}
          <button style={{
            background: "none", border: "none",
            cursor: "default", padding: 4,
            color: "#a89d88",
          }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
                stroke="#a89d88" strokeWidth={1.6} strokeLinecap="round" />
            </svg>
          </button>

          {/* Avatar or Sign In */}
          {user ? (
            <div
              onClick={() => router.push("/profile")}
              style={{
                width: 30, height: 30,
                borderRadius: "50%",
                background: "#c9a84c",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 14, fontWeight: 700,
                color: "#0a0b0d",
                cursor: "pointer",
              }}
            >
              {(user.email || "?").charAt(0).toUpperCase()}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700, fontSize: 12,
                letterSpacing: "0.1em",
                color: "#0a0b0d",
                background: "#c9a84c",
                border: "none",
                borderRadius: 3,
                padding: "5px 12px",
                cursor: "pointer",
              }}
            >SIGN IN</button>
          )}
        </div>
      </div>

      {/* ── Feed column ─────────────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 600,
        margin: "0 auto",
        paddingTop: 68,
        paddingBottom: "72px",
        paddingLeft: 16,
        paddingRight: 16,
      }}>
        {feedLoading ? (
          // Skeleton loading state
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : feedError ? (
          // Error state
          <div style={{
            textAlign: "center",
            padding: "60px 24px",
            fontFamily: "'Figtree', sans-serif",
            fontSize: 14,
            color: "#a89d88",
            lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 16, fontWeight: 700,
              color: "#e8dfc8", marginBottom: 8,
            }}>Something went wrong</div>
            {feedError}
          </div>
        ) : cards.length === 0 ? (
          // Empty state
          <div style={{
            textAlign: "center",
            padding: "60px 24px",
            fontFamily: "'Figtree', sans-serif",
            fontSize: 14,
            color: "#a89d88",
            lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 16, fontWeight: 700,
              color: "#e8dfc8", marginBottom: 8,
            }}>Feed loading…</div>
            Data is being processed. Check back shortly.
          </div>
        ) : (
          // Feed cards
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cards.map((card, idx) => {
              if (card.type === "your_rep") {
                return (
                  <YourRepCard
                    key={`yr-${card.event.id}`}
                    event={card.event}
                    userDimensions={quizScores}
                    router={router}
                    pacNameMap={pacNameMap}
                  />
                );
              }
              if (card.type === "quiz_prompt") {
                return <QuizPromptCard key="quiz-prompt" router={router} />;
              }
              return (
                <CorruptionCard
                  key={card.event.id || idx}
                  event={card.event}
                  userDimensions={quizScores}
                  router={router}
                  pacNameMap={pacNameMap}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom nav ──────────────────────────────────────────────────────── */}
      <BottomNav router={router} />
    </>
  );
}
