// pages/local.jsx
// ── Throughline Local Page ──────────────────────────────────────────────────
// DO NOT DEPLOY without review. Do not commit to GitHub.
// ─────────────────────────────────────────────────────────────────────────────

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
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
`;

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:           "#0a0b0d",
  card:         "#11131a",
  gold:         "#c9a84c",
  parchment:    "#e8dfc8",
  parchmentDim: "#a89d88",
  red:          "#c94c4c",
  green:        "#4ca87c",
  blue:         "#4c78c9",
  purple:       "#8e4cc9",
  border:       "rgba(201,168,76,0.15)",
};

// ── Dimension color map (matches profile.jsx) ─────────────────────────────────
const DIMENSION_COLORS = {
  economic:   "#c9a84c",
  healthcare: "#c94c78",
  climate:    "#4ca87c",
  criminal:   "#c97c4c",
  immigration:"#4c78c9",
  foreign:    "#8e4cc9",
  education:  "#c98e4c",
  freedom:    "#4cc9c9",
  guns:       "#c94c4c",
  housing:    "#78c94c",
  tech:       "#4c8ec9",
  voting:     "#c94c9e",
};

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

function dimColor(dimension) {
  return DIMENSION_COLORS[dimension] || C.parchmentDim;
}

function dimBg(dimension) {
  const hex = DIMENSION_COLORS[dimension];
  if (!hex) return "rgba(168,157,136,0.1)";
  // parse hex to rgb for rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.12)`;
}

function truncate(str, n) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

function formatAmount(n) {
  if (!n) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

// ── ZIP → reps resolver ───────────────────────────────────────────────────────
async function resolveReps(zip) {
  const res = await fetch(`/api/call/lookup-zip?zip=${zip}`);
  if (!res.ok) throw new Error("Could not look up representatives for that ZIP.");
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const bioguideIds = [
    ...(data.senators || []).map((s) => s.bioguide_id),
    ...(data.rep ? [data.rep.bioguide_id] : []),
  ].filter(Boolean);

  return { bioguideIds, state: data.state };
}

// ── ZIP Modal ─────────────────────────────────────────────────────────────────
function ZipModal({ onSubmit, loading, error }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleaned = input.replace(/\D/g, "").slice(0, 5);
    if (cleaned.length !== 5) return;
    onSubmit(cleaned);
  };

  return (
    // Overlay
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
      background: "rgba(10,11,13,0.85)", backdropFilter: "blur(2px)",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: C.card,
        border: `1px solid ${C.gold}`,
        borderRadius: 4,
        padding: 40,
        width: "100%",
        maxWidth: 380,
        textAlign: "center",
        animation: "fadeIn 0.25s ease forwards",
      }}>
        {/* Pin icon */}
        <div style={{ fontSize: 36, marginBottom: 16, lineHeight: 1 }}>📍</div>

        {/* Heading */}
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 32, fontWeight: 700,
          color: C.parchment, letterSpacing: "0.04em",
          marginBottom: 10,
        }}>
          WHERE DO YOU VOTE?
        </div>

        {/* Subtext */}
        <div style={{
          fontFamily: "'Figtree',sans-serif",
          fontSize: 13, color: C.parchmentDim,
          lineHeight: 1.5, marginBottom: 28,
        }}>
          Enter your ZIP code to see your representatives and what they've been voting on.
        </div>

        {/* ZIP input */}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={5}
          placeholder="12345"
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
          style={{
            width: "100%", textAlign: "center",
            fontSize: 18, letterSpacing: "0.2em",
            padding: "12px 16px",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.parchment,
            outline: "none",
            fontFamily: "'Barlow Condensed',sans-serif",
            marginBottom: 8,
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => { e.target.style.borderColor = C.gold; }}
          onBlur={(e)  => { e.target.style.borderColor = C.border; }}
        />

        {/* Error */}
        {error && (
          <div style={{ fontSize: 12, color: C.red, marginBottom: 10, fontFamily: "'Figtree',sans-serif" }}>
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || input.length < 5}
          style={{
            width: "100%",
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 15, fontWeight: 700, letterSpacing: "0.12em",
            padding: "13px 0",
            borderRadius: 4,
            border: "none",
            cursor: loading || input.length < 5 ? "default" : "pointer",
            background: loading || input.length < 5 ? "rgba(201,168,76,0.4)" : C.gold,
            color: "#0a0b0d",
            transition: "background 0.15s",
            marginTop: 4,
          }}
        >
          {loading ? "LOOKING UP…" : "FIND MY REPS →"}
        </button>
      </form>
    </div>
  );
}

// ── RepPhoto — multi-step fallback: Wikipedia → Bioguide → Initials ───────────
function RepPhoto({ bioguide_id, name, party, size = 56 }) {
  // step 0 = try Wikipedia, step 1 = try Bioguide, step 2 = initials
  const [step, setStep] = useState(0);

  const wikipediaUrl = bioguide_id
    ? `https://en.wikipedia.org/wiki/Special:Redirect/file/${bioguide_id}.jpg`
    : null;
  const bioguideUrl = bioguide_id
    ? `https://bioguide.congress.gov/bioguide/photo/${bioguide_id[0].toUpperCase()}/${bioguide_id}.jpg`
    : null;

  const src = step === 0 ? wikipediaUrl : step === 1 ? bioguideUrl : null;
  const pColor = partyColor(party);

  const initials = (() => {
    const parts = (name || "").split(" ").filter(Boolean);
    if (parts.length >= 2) return parts[0][0] + parts[parts.length - 1][0];
    if (parts.length === 1) return parts[0][0];
    return "?";
  })();

  if (step < 2 && src) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setStep((s) => s + 1)}
        style={{
          width: size, height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: `2px solid ${pColor}`,
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size,
      borderRadius: "50%",
      background: pColor,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Barlow Condensed',sans-serif",
      fontSize: Math.round(size * 0.36),
      fontWeight: 700, color: C.parchment,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ── DonorPill ─────────────────────────────────────────────────────────────────
function DonorPill({ donor }) {
  const color = dimColor(donor.dimension);
  const bg    = dimBg(donor.dimension);
  return (
    <div style={{
      borderLeft: `3px solid ${color}`,
      background: bg,
      borderRadius: "0 4px 4px 0",
      padding: "5px 10px",
      flex: "1 1 0",
      minWidth: 0,
    }}>
      <div style={{
        fontFamily: "'Figtree',sans-serif",
        fontSize: 11, color: C.parchment,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {truncate(donor.pac_name || `PAC ${donor.pac_id}`, 24)}
      </div>
      <div style={{ fontSize: 10, color, marginTop: 2 }}>
        {formatAmount(donor.total_amount)}
      </div>
    </div>
  );
}

// ── EventMiniCard ─────────────────────────────────────────────────────────────
function EventMiniCard({ event, onTap }) {
  const voteColor = event.how_voted === "Yea" || event.how_voted === "Yes"
    ? C.green : C.red;
  const voteLabel = event.how_voted === "Yea" || event.how_voted === "Yes"
    ? "YES" : "NO";

  const donorLine = [
    event.days_between != null ? `${event.days_between} days` : null,
    event.donation_amount ? `after ${formatAmount(event.donation_amount)} ${event.donor_industry || ""} donation` : null,
  ].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        width: "100%", textAlign: "left",
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "8px 12px",
        cursor: "pointer",
        marginBottom: 6,
        display: "block",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Figtree',sans-serif",
            fontSize: 12, color: C.parchment,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {truncate(event.bill_name || event.bill_id || "Unknown bill", 48)}
          </div>
          {donorLine && (
            <div style={{ fontSize: 10, color: C.parchmentDim, marginTop: 2 }}>
              {donorLine}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
          <span style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
            padding: "2px 7px", borderRadius: 3,
            background: `${voteColor}22`,
            color: voteColor,
          }}>
            {voteLabel}
          </span>
          {event.corruption_contribution != null && (
            <span style={{ fontSize: 10, color: C.gold }}>
              +{event.corruption_contribution} pts
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── RepCard ───────────────────────────────────────────────────────────────────
function RepCard({ politician, donationData, topDonors, recentEvents, isFollowing, onFollowToggle, router }) {
  const pColor  = partyColor(politician.party);
  const das     = politician.donor_alignment_score;

  // Donation bar
  const smallTotal = donationData?.small_dollar_total ?? 0;
  const pacTotal   = donationData?.pac_total ?? 0;
  const donTotal   = smallTotal + pacTotal;
  const smallPct   = donTotal > 0 ? Math.round((smallTotal / donTotal) * 100) : 0;
  const pacPct     = donTotal > 0 ? Math.round((pacTotal   / donTotal) * 100) : 0;
  const donPending = !donationData;

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.gold}`,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 16,
      animation: "fadeIn 0.3s ease forwards",
    }}>
      {/* ── ROW 1: IDENTITY ── */}
      <div style={{ padding: "18px 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {/* Photo */}
          <RepPhoto
            bioguide_id={politician.bioguide_id}
            name={politician.name}
            party={politician.party}
            size={56}
          />

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 22, fontWeight: 700,
              color: C.parchment, lineHeight: 1,
              marginBottom: 4,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {politician.name}
            </div>

            {/* Party badge + Chamber + State */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 10, letterSpacing: "0.1em",
                padding: "2px 8px", borderRadius: 10,
                background: partyBg(politician.party), color: pColor,
              }}>
                {partyLabel(politician.party)}
              </span>
              <span style={{ fontSize: 12, color: C.parchmentDim, fontFamily: "'Figtree',sans-serif" }}>
                {[politician.chamber, politician.state].filter(Boolean).join(" · ")}
              </span>
            </div>

            {/* YOUR REP badge */}
            <span style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 10, letterSpacing: "0.1em",
              padding: "2px 8px", borderRadius: 10,
              background: "rgba(201,168,76,0.15)", color: C.gold,
              display: "inline-block",
            }}>
              YOUR REP
            </span>
          </div>

          {/* DAS badge + Follow button stacked */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
            {/* DAS score badge */}
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 20, fontWeight: 700,
                color: dasColor(das), lineHeight: 1,
              }}>
                {das != null ? das : "—"}
              </div>
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 9, letterSpacing: "0.1em",
                color: C.parchmentDim, marginTop: 2,
              }}>
                DONOR SCORE
              </div>
            </div>

            {/* Follow button */}
            <button
              type="button"
              onClick={() => onFollowToggle(politician.id)}
              style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 12, letterSpacing: "0.08em",
                padding: "6px 14px", borderRadius: 6,
                cursor: "pointer", transition: "all 0.15s",
                background: isFollowing ? "rgba(76,168,124,0.1)" : "transparent",
                border: isFollowing ? `1px solid ${C.green}` : `1px solid ${C.gold}`,
                color: isFollowing ? C.green : C.gold,
              }}
            >
              {isFollowing ? "✓ Following" : "+ Follow"}
            </button>
          </div>
        </div>
      </div>

      {/* ── ROW 2: DONATION BAR ── */}
      <div style={{ padding: "0 18px 14px" }}>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 9, letterSpacing: "0.15em",
          color: C.gold, textTransform: "uppercase",
          marginBottom: 6,
        }}>
          FUNDING SOURCE
        </div>

        {donPending ? (
          <div style={{ fontSize: 11, color: C.parchmentDim, fontFamily: "'Figtree',sans-serif", fontStyle: "italic" }}>
            Data pending
          </div>
        ) : (
          <>
            <div style={{
              width: "100%", height: 8, borderRadius: 4,
              overflow: "hidden", background: C.bg, display: "flex",
            }}>
              <div style={{ width: `${smallPct}%`, background: C.green, height: "100%", transition: "width 0.5s ease" }} />
              <div style={{ width: `${pacPct}%`,   background: C.gold,  height: "100%", transition: "width 0.5s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: C.green, fontFamily: "'Figtree',sans-serif" }}>
                Small dollar {smallPct}%
              </span>
              <span style={{ fontSize: 10, color: C.gold, fontFamily: "'Figtree',sans-serif" }}>
                PAC money {pacPct}%
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── ROW 3: TOP DONORS ── */}
      <div style={{ padding: "0 18px 14px" }}>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 9, letterSpacing: "0.15em",
          color: C.gold, textTransform: "uppercase",
          marginBottom: 8,
        }}>
          TOP DONORS
        </div>

        {!topDonors || topDonors.length === 0 ? (
          <div style={{ fontSize: 11, color: C.parchmentDim, fontFamily: "'Figtree',sans-serif", fontStyle: "italic" }}>
            No donor data yet.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            {topDonors.map((d, i) => (
              <DonorPill key={d.pac_id || i} donor={d} />
            ))}
          </div>
        )}
      </div>

      {/* ── ROW 4: RECENT ACTIVITY ── */}
      <div style={{ padding: "0 18px 18px" }}>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontSize: 9, letterSpacing: "0.15em",
          color: C.gold, textTransform: "uppercase",
          marginBottom: 8,
        }}>
          RECENT ACTIVITY
        </div>

        {!recentEvents || recentEvents.length === 0 ? (
          <div style={{
            fontSize: 12, color: C.parchmentDim,
            fontFamily: "'Figtree',sans-serif", fontStyle: "italic",
          }}>
            No donation-vote connections found yet.
          </div>
        ) : (
          recentEvents.map((ev, i) => (
            <EventMiniCard
              key={ev.id || i}
              event={ev}
              onTap={() => router.push(`/politician/${politician.slug}`)}
            />
          ))
        )}

        {/* Link to full profile */}
        <button
          type="button"
          onClick={() => router.push(`/politician/${politician.slug}`)}
          style={{
            marginTop: 8,
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 13, letterSpacing: "0.1em",
            padding: "8px 16px", borderRadius: 4,
            cursor: "pointer",
            background: "transparent",
            border: `1px solid ${C.gold}`,
            color: C.gold,
            width: "100%",
          }}
        >
          SEE FULL PROFILE →
        </button>
      </div>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <span style={{
        fontFamily: "'Barlow Condensed',sans-serif",
        fontWeight: 700, fontSize: 10,
        letterSpacing: "0.28em",
        color: C.parchmentDim, textTransform: "uppercase",
      }}>
        {text}
      </span>
      <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.1)" }} />
    </div>
  );
}

// ── On-demand FEC PAC name enrichment ────────────────────────────────────────
// Fires after pac_donors query resolves. For any donor row with a null pac_name,
// looks up the committee name from the FEC API, updates local state immediately,
// then fires a background POST to /api/enrich-pac-name to persist it server-side.
async function enrichPacNames(doMap, setDonorsMap) {
  const FEC_KEY = process.env.NEXT_PUBLIC_FEC_API_KEY;
  if (!FEC_KEY) return;

  // Collect unique pac_ids that need names, tracking which polIds reference each
  const pacToPolIds = {}; // { pac_id: [polId, ...] }
  Object.entries(doMap).forEach(([polId, donors]) => {
    donors.forEach((donor) => {
      if (!donor.pac_name && donor.pac_id) {
        if (!pacToPolIds[donor.pac_id]) pacToPolIds[donor.pac_id] = [];
        pacToPolIds[donor.pac_id].push(polId);
      }
    });
  });

  const uniquePacIds = Object.keys(pacToPolIds);
  if (uniquePacIds.length === 0) return;

  await Promise.allSettled(
    uniquePacIds.map(async (pac_id) => {
      try {
        const res = await fetch(
          `https://api.open.fec.gov/v1/committee/${pac_id}/?api_key=${FEC_KEY}`
        );
        if (!res.ok) return;
        const json = await res.json();
        const name = json.name;
        if (!name) return;

        // Update local state so the pill re-renders immediately
        setDonorsMap((prev) => {
          const next = { ...prev };
          (pacToPolIds[pac_id] || []).forEach((polId) => {
            if (next[polId]) {
              next[polId] = next[polId].map((d) =>
                d.pac_id === pac_id ? { ...d, pac_name: name } : d
              );
            }
          });
          return next;
        });

        // Background DB persist via service-role API route — fire and forget
        fetch("/api/enrich-pac-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pac_id, pac_name: name }),
        }).catch(() => {});
      } catch (_) {
        // silently ignore — enrichment is best-effort
      }
    })
  );
}

// ── Main LocalPage ────────────────────────────────────────────────────────────
export default function LocalPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, requireAuth, followPolitician, unfollowPolitician } = useAuth();

  const [zip,          setZip]          = useState(null);
  const [reps,         setReps]         = useState([]);
  const [donationMap,  setDonationMap]  = useState({});  // { uuid: breakdownData }
  const [donorsMap,    setDonorsMap]    = useState({});  // { uuid: [top 3 donors] }
  const [eventsMap,    setEventsMap]    = useState({});  // { uuid: [2 recent events] }
  const [followingMap, setFollowingMap] = useState({});  // { uuid: bool }
  const [showModal,    setShowModal]    = useState(false);
  const [resolving,    setResolving]    = useState(false);
  const [zipError,     setZipError]     = useState(null);
  const [loadingReps,  setLoadingReps]  = useState(false);

  // ── Sync followingMap from profile ─────────────────────────────────────────
  useEffect(() => {
    if (!profile?.followed_politicians) return;
    const map = {};
    profile.followed_politicians.forEach((id) => { map[id] = true; });
    setFollowingMap(map);
  }, [profile?.followed_politicians]);

  // ── On auth resolve: pick up ZIP from profile or localStorage ──────────────
  useEffect(() => {
    if (authLoading) return;

    const savedZip = profile?.zip_code || (typeof window !== "undefined" && localStorage.getItem("local_zip"));
    if (savedZip) {
      setZip(savedZip);
    } else {
      setShowModal(true);
    }
  }, [authLoading, profile?.zip_code]);

  // ── When ZIP is set, load reps ─────────────────────────────────────────────
  useEffect(() => {
    if (!zip) return;
    loadRepsForZip(zip);
  }, [zip]);  // eslint-disable-line react-hooks/exhaustive-deps

  const loadRepsForZip = useCallback(async (resolvedZip) => {
    setLoadingReps(true);
    try {
      // 1. Get bioguide_ids via resolveReps (or from saved profile/localStorage)
      let bioguideIds;
      const savedIds = profile?.my_reps?.length
        ? profile.my_reps
        : (typeof window !== "undefined" && localStorage.getItem("local_my_reps"))
          ? JSON.parse(localStorage.getItem("local_my_reps"))
          : null;

      if (savedIds?.length) {
        bioguideIds = savedIds;
      } else {
        // Resolve fresh from APIs
        const result = await resolveReps(resolvedZip);
        bioguideIds = result.bioguideIds;
        // Persist
        if (user) {
          await supabase
            .from("profiles")
            .update({ zip_code: resolvedZip, my_reps: bioguideIds })
            .eq("id", user.id);
        } else {
          if (typeof window !== "undefined") {
            localStorage.setItem("local_zip", resolvedZip);
            localStorage.setItem("local_my_reps", JSON.stringify(bioguideIds));
          }
        }
      }

      if (!bioguideIds?.length) {
        setReps([]);
        setLoadingReps(false);
        return;
      }

      // 2. Query politicians table
      const { data: polData, error: polError } = await supabase
        .from("politicians")
        .select("id, name, party, state, chamber, slug, bioguide_id, donor_alignment_score, top_donor_industry")
        .in("bioguide_id", bioguideIds);

      if (polError) throw polError;
      const pols = polData || [];
      setReps(pols);

      if (!pols.length) {
        setLoadingReps(false);
        return;
      }

      // 3. Fetch supplemental data in parallel for each politician
      const [donBreakdowns, donorsResults, eventsResults] = await Promise.all([
        // Donation breakdowns
        Promise.all(
          pols.map((p) =>
            supabase.rpc("get_donation_breakdown", { pol_id: p.id })
              .then(({ data }) => ({ id: p.id, data: data?.[0] ?? null }))
              .catch(() => ({ id: p.id, data: null }))
          )
        ),
        // Top 3 donors
        Promise.all(
          pols.map((p) =>
            supabase
              .from("pac_donors")
              .select("pac_id, pac_name, dimension, total_amount")
              .eq("politician_id", p.id)
              .order("total_amount", { ascending: false })
              .limit(3)
              .then(({ data }) => ({ id: p.id, data: data || [] }))
              .catch(() => ({ id: p.id, data: [] }))
          )
        ),
        // 2 most recent events
        Promise.all(
          pols.map((p) =>
            supabase
              .from("throughline_events")
              .select("id, bill_name, bill_id, vote_date, how_voted, days_between, donation_amount, donor_industry, corruption_contribution")
              .eq("politician_id", p.id)
              .order("vote_date", { ascending: false })
              .limit(2)
              .then(({ data }) => ({ id: p.id, data: data || [] }))
              .catch(() => ({ id: p.id, data: [] }))
          )
        ),
      ]);

      const dMap = {}, doMap = {}, eMap = {};
      donBreakdowns.forEach((r) => { if (r.data) dMap[r.id] = r.data; });
      donorsResults.forEach((r)  => { doMap[r.id] = r.data; });
      eventsResults.forEach((r)  => { eMap[r.id]  = r.data; });

      setDonationMap(dMap);
      setDonorsMap(doMap);
      setEventsMap(eMap);
      enrichPacNames(doMap, setDonorsMap).catch(() => {});
    } catch (err) {
      console.error("Local reps load error:", err.message);
    } finally {
      setLoadingReps(false);
    }
  }, [user, profile?.my_reps]);

  // ── ZIP modal submit ────────────────────────────────────────────────────────
  const handleZipSubmit = async (inputZip) => {
    setResolving(true);
    setZipError(null);
    try {
      const { bioguideIds } = await resolveReps(inputZip);

      // Persist
      if (user) {
        await supabase
          .from("profiles")
          .update({ zip_code: inputZip, my_reps: bioguideIds })
          .eq("id", user.id);
      } else {
        if (typeof window !== "undefined") {
          localStorage.setItem("local_zip", inputZip);
          localStorage.setItem("local_my_reps", JSON.stringify(bioguideIds));
        }
      }

      setZip(inputZip);
      setShowModal(false);

      // Load reps with fresh bioguideIds (bypass savedIds check)
      setLoadingReps(true);
      const { data: polData } = await supabase
        .from("politicians")
        .select("id, name, party, state, chamber, slug, bioguide_id, donor_alignment_score, top_donor_industry")
        .in("bioguide_id", bioguideIds);
      const pols = polData || [];
      setReps(pols);

      // Supplemental data
      if (pols.length) {
        const [donBreakdowns, donorsResults, eventsResults] = await Promise.all([
          Promise.all(
            pols.map((p) =>
              supabase.rpc("get_donation_breakdown", { pol_id: p.id })
                .then(({ data }) => ({ id: p.id, data: data?.[0] ?? null }))
                .catch(() => ({ id: p.id, data: null }))
            )
          ),
          Promise.all(
            pols.map((p) =>
              supabase
                .from("pac_donors")
                .select("pac_id, pac_name, dimension, total_amount")
                .eq("politician_id", p.id)
                .order("total_amount", { ascending: false })
                .limit(3)
                .then(({ data }) => ({ id: p.id, data: data || [] }))
                .catch(() => ({ id: p.id, data: [] }))
            )
          ),
          Promise.all(
            pols.map((p) =>
              supabase
                .from("throughline_events")
                .select("id, bill_name, bill_id, vote_date, how_voted, days_between, donation_amount, donor_industry, corruption_contribution")
                .eq("politician_id", p.id)
                .order("vote_date", { ascending: false })
                .limit(2)
                .then(({ data }) => ({ id: p.id, data: data || [] }))
                .catch(() => ({ id: p.id, data: [] }))
            )
          ),
        ]);

        const dMap = {}, doMap = {}, eMap = {};
        donBreakdowns.forEach((r) => { if (r.data) dMap[r.id] = r.data; });
        donorsResults.forEach((r)  => { doMap[r.id] = r.data; });
        eventsResults.forEach((r)  => { eMap[r.id]  = r.data; });

        setDonationMap(dMap);
        setDonorsMap(doMap);
        setEventsMap(eMap);
        enrichPacNames(doMap, setDonorsMap).catch(() => {});
      }
    } catch (err) {
      setZipError(err.message || "Could not find representatives. Check your ZIP and try again.");
    } finally {
      setResolving(false);
      setLoadingReps(false);
    }
  };

  // ── Follow toggle ───────────────────────────────────────────────────────────
  const handleFollowToggle = async (politicianId) => {
    const isNowFollowing = followingMap[politicianId];
    // Optimistic
    setFollowingMap((prev) => ({ ...prev, [politicianId]: !isNowFollowing }));
    const ok = isNowFollowing
      ? await unfollowPolitician(politicianId)
      : await followPolitician(politicianId);
    if (ok === false) {
      // Revert (followPolitician returns false if user not logged in / error)
      setFollowingMap((prev) => ({ ...prev, [politicianId]: isNowFollowing }));
    }
  };

  // ── Wait for auth to resolve before showing anything meaningful ────────────
  const pageReady = !authLoading;
  const showBlur  = showModal;

  // ── Skeleton card ───────────────────────────────────────────────────────────
  const shimmer = {
    background: "linear-gradient(90deg, #11131a 25%, #1a1d26 50%, #11131a 75%)",
    backgroundSize: "800px 100%",
    animation: "shimmer 1.5s infinite",
    borderRadius: 4,
  };
  const SkeletonBar = ({ w, h }) => (
    <div style={{ height: h, width: w, ...shimmer, marginBottom: 6 }} />
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 80 }}>
      <Head>
        <title>Local Representatives — Throughline</title>
        <meta name="description" content="See your local representatives, their donor connections, and recent votes." />
      </Head>
      <style>{GLOBAL_STYLES}</style>

      {/* ZIP Modal */}
      {showModal && (
        <ZipModal
          onSubmit={handleZipSubmit}
          loading={resolving}
          error={zipError}
        />
      )}

      {/* Page content — blurred when modal is open */}
      <div style={{
        filter:  showBlur ? "blur(4px)" : "none",
        opacity: showBlur ? 0.4 : 1,
        transition: "filter 0.2s, opacity 0.2s",
        pointerEvents: showBlur ? "none" : "auto",
      }}>
        <Nav />

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>

          {/* ── SECTION 2: PAGE HEADER ── */}
          {zip && (
            <div style={{ marginBottom: 24, animation: "fadeIn 0.3s ease forwards" }}>
              <div style={{
                fontFamily: "'Figtree',sans-serif",
                fontSize: 11, color: C.gold,
                letterSpacing: "0.2em", textTransform: "uppercase",
                marginBottom: 4,
              }}>
                YOUR LOCAL
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <div style={{
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: 28, fontWeight: 700,
                  color: C.parchment,
                }}>
                  Representatives for {zip}
                </div>
                <button
                  type="button"
                  onClick={() => { setShowModal(true); setZipError(null); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontFamily: "'Figtree',sans-serif",
                    fontSize: 12, color: C.parchmentDim,
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  Change ZIP
                </button>
              </div>
            </div>
          )}

          {/* ── SECTION 3: REP CARDS ── */}
          {loadingReps && (
            <div>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 4, padding: 18, marginBottom: 16,
                }}>
                  <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", ...shimmer, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <SkeletonBar w="50%" h={18} />
                      <SkeletonBar w="30%" h={11} />
                      <SkeletonBar w="40%" h={11} />
                    </div>
                    <div style={{ width: 80, height: 60, ...shimmer, borderRadius: 6 }} />
                  </div>
                  <SkeletonBar w="100%" h={8} />
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    {[0, 1, 2].map((j) => (
                      <div key={j} style={{ flex: 1, height: 42, ...shimmer, borderRadius: 4 }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingReps && !showModal && reps.length === 0 && zip && (
            <div style={{
              textAlign: "center", padding: "40px 24px",
              fontFamily: "'Figtree',sans-serif",
              fontSize: 14, color: C.parchmentDim,
            }}>
              No representatives found for {zip}. Try a different ZIP code.{" "}
              <button
                type="button"
                onClick={() => { setShowModal(true); setZipError(null); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: C.gold, fontFamily: "'Figtree',sans-serif",
                  fontSize: 14, textDecoration: "underline",
                }}
              >
                Change ZIP
              </button>
            </div>
          )}

          {!loadingReps && reps.map((pol) => (
            <RepCard
              key={pol.id}
              politician={pol}
              donationData={donationMap[pol.id] ?? null}
              topDonors={donorsMap[pol.id] ?? []}
              recentEvents={eventsMap[pol.id] ?? []}
              isFollowing={!!followingMap[pol.id]}
              onFollowToggle={handleFollowToggle}
              router={router}
            />
          ))}

          {/* ── SECTION 4: EVENTS PLACEHOLDER ── */}
          {!loadingReps && (zip || !showModal) && (
            <div style={{ marginTop: 8 }}>
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 18, fontWeight: 700,
                color: C.gold, marginBottom: 12,
                letterSpacing: "0.04em",
              }}>
                LOCAL EVENTS
              </div>
              <div style={{
                border: `1px dashed ${C.gold}`,
                borderRadius: 4, padding: "20px 18px",
              }}>
                <p style={{
                  fontFamily: "'Figtree',sans-serif",
                  fontSize: 13, color: C.parchmentDim,
                  fontStyle: "italic", margin: 0,
                }}>
                  No events found for your area yet. Check back soon.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
