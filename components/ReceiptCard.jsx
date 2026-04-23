import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  formatAmountFull,
  DIMENSION_LABELS,
  partyColor,
} from "../lib/feedUtils";
import supabase from "../lib/supabase";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: "#0A0B0D",
  surface: "#111318",
  surface2: "#181C22",
  gold: "#C9A84C",
  text: "#F0ECE4",
  text2: "#9A9488",
  red: "#E05C4B",
  green: "#4CAF7D",
  blue: "#5B9CF6",
  border: "rgba(255,255,255,0.08)",
};

// ── Module-level user scores cache (shared across all card instances) ─────────
// undefined = not fetched yet | null = fetched, no user / no scores
let _dimScoresCache = undefined;

// ── Helpers ───────────────────────────────────────────────────────────────────
function bioguideUrl(id) {
  if (!id) return null;
  return `https://bioguide.congress.gov/bioguide/photo/${id.charAt(0).toUpperCase()}/${id}.jpg`;
}

function dasColorLocal(score) {
  if (score === null || score === undefined) return T.text2;
  if (score <= 33) return T.green;
  if (score <= 66) return T.gold;
  return T.red;
}

// Section 7 alignment logic
function getAlignment(voteIsYes, userScore) {
  if (userScore === null || userScore === undefined) return "neutral";
  if (voteIsYes && userScore > 60) return "aligned";
  if (voteIsYes && userScore < 40) return "conflict";
  if (!voteIsYes && userScore < 40) return "aligned";
  if (!voteIsYes && userScore > 60) return "conflict";
  return "neutral";
}

// Derive Clearbit domain from PAC name
function pacToDomain(name) {
  if (!name) return null;
  const clean = name
    .replace(/\b(PAC|Inc\.?|Corp\.?|LLC|Ltd\.?|Committee|Association|Fund|Political|Action|Int'?l|International|Allied)\b/gi, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  return clean ? `${clean}.com` : null;
}

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const palette = [T.red, T.green, T.blue, T.gold, "#9B8FF5", "#2DD4BF", "#C98E4C"];
  return palette[Math.abs(h) % palette.length];
}

function getInitials(name) {
  return (name || "?").split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// Build dimension scores map from profiles individual score_* columns
function buildDimScores(row) {
  if (!row) return null;
  const map = {};
  const dims = ["economic","healthcare","climate","criminal","immigration","foreign","education","freedom","guns","housing","tech","voting"];
  dims.forEach(d => { if (row[`score_${d}`] != null) map[d] = row[`score_${d}`]; });
  return Object.keys(map).length > 0 ? map : null;
}

// Chip dimension priority order (card's dimension will be prepended)
const CHIP_PRIORITY = ["economic","healthcare","climate","immigration","guns","foreign","criminal","education"];

const DIM_EMOJI = {
  economic: "💰", healthcare: "💊", climate: "🌍", immigration: "🏛️",
  guns: "🔫", foreign: "🌐", criminal: "⚖️", education: "🎓",
  freedom: "🗽", housing: "🏠", tech: "💻", voting: "🗳️",
};

// ── Placeholder articles per dimension ────────────────────────────────────────
const ARTICLES = {
  economic: [
    { emoji: "💰", source: "OPENSECRETS", headline: "Finance industry PACs spent record $3.7B on federal elections in 2024" },
    { emoji: "📊", source: "WALL STREET JOURNAL", headline: "Deregulation votes follow a clear pattern of donor influence" },
    { emoji: "🏛️", source: "POLITICO", headline: "Tax cut beneficiaries rank among top campaign contributors" },
  ],
  healthcare: [
    { emoji: "💊", source: "STAT NEWS", headline: "Pharma PACs target key lawmakers before drug pricing vote" },
    { emoji: "📰", source: "KAISER HEALTH NEWS", headline: "ACA repeal votes correlate with insurance industry donations" },
    { emoji: "🏛️", source: "POLITICO", headline: "Hospital lobby spending on Congress reaches all-time high" },
  ],
  climate: [
    { emoji: "🌍", source: "INSIDE CLIMATE NEWS", headline: "Oil & gas PACs flood Congress ahead of energy bill vote" },
    { emoji: "📊", source: "OPENSECRETS", headline: "Fossil fuel contributions predict pipeline approval votes" },
    { emoji: "📰", source: "THE GUARDIAN", headline: "Climate votes diverge sharply by donor industry" },
  ],
  immigration: [
    { emoji: "🏛️", source: "POLITICO", headline: "Private prison lobby backs detention expansion votes" },
    { emoji: "📰", source: "PROPUBLICA", headline: "Border security funding tied to defense contractor donations" },
    { emoji: "📊", source: "OPENSECRETS", headline: "Immigration enforcement PACs double spending in election year" },
  ],
  guns: [
    { emoji: "🔫", source: "THE TRACE", headline: "NRA grades correlate with gun industry PAC donations" },
    { emoji: "📊", source: "OPENSECRETS", headline: "Gun lobby spending spikes after mass shootings" },
    { emoji: "🏛️", source: "POLITICO", headline: "Background check bill vote follows predictable donor pattern" },
  ],
  foreign: [
    { emoji: "🌐", source: "FOREIGN POLICY", headline: "Defense contractor PACs fund pro-spending votes" },
    { emoji: "📊", source: "OPENSECRETS", headline: "Arms deal approvals track closely with defense donations" },
    { emoji: "🏛️", source: "POLITICO", headline: "Foreign aid votes reveal donor-aligned patterns" },
  ],
  criminal: [
    { emoji: "⚖️", source: "MARSHALL PROJECT", headline: "Prison industry PACs target criminal justice reformers" },
    { emoji: "📊", source: "OPENSECRETS", headline: "Police union donations predict qualified immunity votes" },
    { emoji: "📰", source: "THE INTERCEPT", headline: "Cash bail industry funds lawmakers blocking reform" },
  ],
  education: [
    { emoji: "🎓", source: "CHALKBEAT", headline: "Charter school PACs fund voucher program supporters" },
    { emoji: "📊", source: "OPENSECRETS", headline: "Student loan servicers back anti-forgiveness votes" },
    { emoji: "📰", source: "POLITICO", headline: "Education industry PAC spending doubles in two years" },
  ],
  freedom: [
    { emoji: "🗽", source: "ACLU", headline: "Surveillance votes track telecom industry contributions" },
    { emoji: "📊", source: "OPENSECRETS", headline: "Tech PACs fund privacy bill opponents" },
    { emoji: "📰", source: "THE INTERCEPT", headline: "Civil liberties votes follow a clear money trail" },
  ],
  housing: [
    { emoji: "🏠", source: "MARKETPLACE", headline: "Real estate PACs fund rent control opposition" },
    { emoji: "📊", source: "OPENSECRETS", headline: "Zoning reform votes correlate with developer donations" },
    { emoji: "📰", source: "CITY LAB", headline: "HUD funding votes track construction industry giving" },
  ],
  tech: [
    { emoji: "💻", source: "WIRED", headline: "Big tech PACs fund antitrust bill opponents" },
    { emoji: "📊", source: "OPENSECRETS", headline: "Data privacy votes follow Silicon Valley donation patterns" },
    { emoji: "🏛️", source: "POLITICO", headline: "Tech regulation correlates with PAC spending by platform" },
  ],
  voting: [
    { emoji: "🗳️", source: "BRENNAN CENTER", headline: "Voter restriction bills backed by specific PAC networks" },
    { emoji: "📊", source: "OPENSECRETS", headline: "Election security funding votes track donor interests" },
    { emoji: "📰", source: "ROLLING STONE", headline: "Redistricting fights funded by partisan PAC machine" },
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
// ReceiptCard — main export
// Props from feed: event (object), onSave, onShare, onCallScript (accepted but
// handled internally per redesign spec)
// ═════════════════════════════════════════════════════════════════════════════
export default function ReceiptCard({ event, isMyRep = false }) {
  const router = useRouter();
  const [activeIssue, setActiveIssue] = useState(null);
  const [showDasModal, setShowDasModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [donors, setDonors] = useState([]);
  const [userDimScores, setUserDimScores] = useState(
    _dimScoresCache !== undefined ? _dimScoresCache : null
  );
  const [followingIssue, setFollowingIssue] = useState(false);
  const [compareComing, setCompareComing] = useState(false);

  // Fetch user quiz scores once — module-level cache prevents re-fetching
  useEffect(() => {
    if (_dimScoresCache !== undefined) {
      setUserDimScores(_dimScoresCache);
      return;
    }
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { _dimScoresCache = null; return; }
        const { data } = await supabase
          .from("profiles")
          .select("score_economic,score_healthcare,score_climate,score_criminal,score_immigration,score_foreign,score_education,score_freedom,score_guns,score_housing,score_tech,score_voting")
          .eq("id", user.id)
          .single();
        _dimScoresCache = buildDimScores(data);
        setUserDimScores(_dimScoresCache);
      } catch {
        _dimScoresCache = null;
      }
    })();
  }, []);

  // Fetch top donors when DAS modal opens (lazy)
  useEffect(() => {
    if (!showDasModal || !event?.politician_id || donors.length > 0) return;
    fetch(`/api/politician-donors?politician_id=${event.politician_id}&limit=4`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.donors)) setDonors(d.donors); })
      .catch(() => {});
  }, [showDasModal]);

  if (!event) return null;

  const {
    id,
    politician_id,
    politician_name,
    politician_slug,
    bioguide_id,
    party,
    state,
    donor_alignment_score,
    donation_amount,
    donor_industry,
    donation_date,
    vote_date,
    days_between,
    how_voted,
    bill_name,
    bill_name_enriched,
    bill_link,
    vote_impact,
    dimension,
    corruption_contribution,
    source_url,
    wikipedia_photo_url,
  } = event;

  const voteIsYes = how_voted === "Yes" || how_voted === "Yea";
  const voteColor = voteIsYes ? T.green : T.red;
  const voteLabel = voteIsYes ? "VOTED YES" : "VOTED NO";
  const displayBillName = bill_name_enriched || bill_name;
  const firstName = (politician_name || "").split(" ")[0];

  const donDays = days_between ?? (
    donation_date && vote_date
      ? Math.round((new Date(vote_date) - new Date(donation_date)) / 86400000)
      : null
  );
  const donDateStr = donation_date
    ? new Date(donation_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const voteDateStr = vote_date
    ? new Date(vote_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  // 4 chip dimensions: card's dimension first, fill from priority list
  const chipDims = [
    dimension,
    ...CHIP_PRIORITY.filter(d => d !== dimension),
  ].filter(Boolean).slice(0, 4);
  while (chipDims.length < 4) {
    chipDims.push(CHIP_PRIORITY[chipDims.length - 1] || "economic");
  }

  const handleCardClick = () => {
    if (politician_slug) router.push(`/politician/${politician_slug}`);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/receipt/${id}`;
    if (navigator.share) {
      navigator.share({ title: politician_name, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  };

  const handleSave = (e) => {
    e.stopPropagation();
    setSaved(true);
    try {
      const list = JSON.parse(localStorage.getItem("tl_saved") || "[]");
      if (id && !list.includes(id)) {
        list.push(id);
        localStorage.setItem("tl_saved", JSON.stringify(list));
      }
    } catch {}
  };

  // ── Layer 2: Issue Detail View ──────────────────────────────────────────────
  if (activeIssue) {
    const alignment = getAlignment(voteIsYes, userDimScores?.[activeIssue]);
    const alignColor = alignment === "aligned" ? T.green : alignment === "conflict" ? T.red : T.text2;
    const dimLabel = DIMENSION_LABELS[activeIssue] || activeIssue;
    const articles = ARTICLES[activeIssue] || ARTICLES.economic;
    const alignVerb =
      alignment === "aligned" ? "align with" :
      alignment === "conflict" ? "conflict with" :
      "are unrelated to";
    const osUrl = `https://www.opensecrets.org/members-of-congress/summary?cid=${bioguide_id}`;

    return (
      <div style={{
        background: T.surface,
        border: `0.5px solid ${T.border}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 16,
      }}>
        <div
          onClick={() => setActiveIssue(null)}
          style={{ padding: "14px 16px 0", fontFamily: "Arial", fontSize: 12, color: T.text2, cursor: "pointer" }}
        >
          ← Back to {firstName}
        </div>

        <div style={{ padding: "10px 16px 4px", fontFamily: "Arial Black, Arial", fontSize: 20, color: T.text }}>
          {dimLabel}
        </div>

        <div style={{ padding: "0 16px 12px", fontFamily: "Arial", fontSize: 12, color: alignColor }}>
          {firstName}&apos;s votes {alignVerb} your positions on this issue
        </div>

        <div style={{
          margin: "0 16px 16px",
          background: T.surface2,
          borderLeft: `3px solid ${alignColor}`,
          borderRadius: "0 6px 6px 0",
          padding: 12,
          fontFamily: "Arial",
          fontSize: 12,
          color: T.text2,
          lineHeight: 1.5,
        }}>
          {firstName} voted {voteIsYes ? "with" : "against"} {donor_industry || "donor"} interests
          {" "}while receiving {formatAmountFull(donation_amount)} from {donor_industry || "PAC"} donors.
        </div>

        <div style={{
          padding: "0 16px 8px",
          fontFamily: "Arial",
          fontSize: 9,
          color: T.text2,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>
          Related coverage
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 16px 16px" }}>
          {articles.map((a, i) => (
            <div
              key={i}
              onClick={() => window.open(osUrl, "_blank")}
              style={{
                height: 80,
                background: T.surface2,
                borderRadius: 8,
                border: "0.5px solid rgba(255,255,255,0.06)",
                display: "flex",
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              <div style={{
                width: 80,
                flexShrink: 0,
                background: "#1C2030",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}>
                {a.emoji}
              </div>
              <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>
                <div style={{ fontFamily: "Arial", fontSize: 10, color: T.text2, textTransform: "uppercase", marginBottom: 4 }}>
                  {a.source}
                </div>
                <div style={{ fontFamily: "Arial", fontSize: 13, color: T.text, lineHeight: 1.35 }}>
                  {a.headline}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ fontFamily: "Arial", fontSize: 11, color: T.text2, marginBottom: 8 }}>
            Follow this issue to track votes as they happen
          </div>
          <button
            onClick={() => handleFollowIssue(activeIssue)}
            style={{
              width: "100%",
              background: "rgba(201,168,76,0.1)",
              border: "0.5px solid rgba(201,168,76,0.3)",
              borderRadius: 8,
              padding: 10,
              fontFamily: "Arial Black, Arial",
              fontSize: 13,
              color: followingIssue ? T.green : T.gold,
              cursor: "pointer",
            }}
          >
            {followingIssue ? "✓ Following" : `+ Follow ${dimLabel}`}
          </button>
        </div>
      </div>
    );
  }

  const handleFollowIssue = async (dim) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFollowingIssue(false);
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("followed_dimensions")
      .eq("id", user.id)
      .single();
    const current = prof?.followed_dimensions || [];
    if (current.includes(dim)) { setFollowingIssue(true); return; }
    const updated = [...current, dim];
    await supabase.from("profiles").update({ followed_dimensions: updated }).eq("id", user.id);
    setFollowingIssue(true);
  };

  // ── Layer 1: Main Card ────────────────────────────────────────────────────
  // Outer wrapper is NOT overflow:hidden so the DAS modal overlay is not clipped
  return (
    <div style={{ position: "relative", marginBottom: 16 }}>

      {/* Card shell — overflow:hidden for hero image border-radius clipping */}
      <div
        style={{
          background: T.surface,
          border: `0.5px solid ${T.border}`,
          borderRadius: 12,
          overflow: "hidden",
          cursor: "pointer",
        }}
        onClick={handleCardClick}
      >
        {/* ── Hero ── */}
        <HeroSection
          photoUrl={wikipedia_photo_url || bioguideUrl(bioguide_id)}
          politician_name={politician_name}
          party={party}
          state={state}
          donor_alignment_score={donor_alignment_score}
          isMyRep={isMyRep}
          onDasClick={(e) => { e.stopPropagation(); setShowDasModal(true); }}
        />

        {/* ── Body ── */}
        <div style={{ padding: "14px 16px" }}>

          {/* Donation amount */}
          <div style={{
            fontFamily: "Arial Black, Arial",
            fontSize: 38,
            color: T.gold,
            lineHeight: 1,
            marginBottom: 2,
          }}>
            {formatAmountFull(donation_amount)}
          </div>
          <div style={{ fontFamily: "Arial", fontSize: 12, color: T.text2, marginBottom: 12 }}>
            from {donor_industry || "PAC"} industry PACs
          </div>

          {/* Timeline row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <DatePill label={donDateStr || "—"} />
            <div style={{ flex: 1, height: 2, background: T.gold, position: "relative" }}>
              <div style={{
                position: "absolute",
                right: -4,
                top: -3,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: T.red,
              }} />
            </div>
            {donDays !== null && (
              <div style={{ fontFamily: "Arial", fontSize: 11, color: T.text2, whiteSpace: "nowrap" }}>
                {donDays}d gap
              </div>
            )}
            <DatePill label={voteDateStr || "—"} />
          </div>

          {/* Vote pill + bill name */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{
              background: voteColor,
              color: T.bg,
              fontFamily: "Arial Black, Arial",
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              {voteLabel}
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                const url = bill_link
                  || `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(displayBillName || "")}`;
                window.open(url, "_blank");
              }}
              style={{
                fontFamily: "Arial",
                fontSize: 12,
                color: T.text2,
                flex: 1,
                cursor: "pointer",
                lineHeight: 1.3,
              }}
            >
              {displayBillName || bill_name || "related legislation"} ↗
            </div>
          </div>

          {/* Impact block */}
          {vote_impact && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: "Arial",
                fontSize: 13,
                color: T.text2,
                lineHeight: 1.55,
                padding: "10px 12px",
                marginBottom: 14,
                background: T.surface2,
                borderLeft: `3px solid ${T.gold}`,
                borderRadius: "0 6px 6px 0",
              }}
            >
              {vote_impact}
              {source_url && (
                <sup
                  onClick={(e) => { e.stopPropagation(); window.open(source_url, "_blank"); }}
                  style={{ fontFamily: "Arial", fontSize: 9, color: T.gold, cursor: "pointer", marginLeft: 3 }}
                >
                  [FEC]
                </sup>
              )}
            </div>
          )}

          {/* Issue chips grid */}
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontFamily: "Arial",
              fontSize: 9,
              color: T.text2,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}>
              Your alignment on key issues
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
              {chipDims.map((dim) => {
                const userScore = userDimScores?.[dim];
                // Full alignment logic only for the card's primary dimension
                const alignment = dim === dimension
                  ? getAlignment(voteIsYes, userScore)
                  : "neutral";
                const label = DIMENSION_LABELS[dim] || dim;
                const emoji = DIM_EMOJI[dim] || "📊";
                const chipColor =
                  alignment === "aligned" ? T.green :
                  alignment === "conflict" ? T.red : T.text2;
                const chipBg =
                  alignment === "aligned" ? "rgba(76,175,125,0.12)" :
                  alignment === "conflict" ? "rgba(224,92,75,0.12)" : T.surface2;
                const chipBorder =
                  alignment === "aligned" ? "rgba(76,175,125,0.25)" :
                  alignment === "conflict" ? "rgba(224,92,75,0.25)" :
                  "rgba(255,255,255,0.06)";
                const alignLabel =
                  alignment === "aligned" ? "Aligned" :
                  alignment === "conflict" ? "Conflict" : "Neutral";
                const barPct = userScore ?? 50;

                return (
                  <div
                    key={dim}
                    onClick={() => setActiveIssue(dim)}
                    style={{
                      background: chipBg,
                      border: `0.5px solid ${chipBorder}`,
                      borderRadius: 8,
                      padding: "9px 11px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      fontFamily: "Arial",
                      fontSize: 12,
                      fontWeight: "bold",
                      color: chipColor,
                      marginBottom: 2,
                    }}>
                      {emoji} {label}
                    </div>
                    <div style={{
                      fontFamily: "Arial",
                      fontSize: 10,
                      fontWeight: "bold",
                      color: chipColor,
                      marginBottom: 4,
                    }}>
                      {alignLabel}
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                      <div style={{ height: 3, width: `${barPct}%`, background: chipColor, borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer: share + save icons, right-aligned, no labels, no borders */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              borderTop: "0.5px solid rgba(255,255,255,0.06)",
              paddingTop: 10,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/receipt/${id}`); }}
              style={{
                background: "transparent",
                border: "0.5px solid rgba(201,168,76,0.3)",
                borderRadius: 6,
                padding: "5px 12px",
                fontFamily: "Arial Black, Arial",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "#C9A84C",
                cursor: "pointer",
              }}
            >
              VIEW RECEIPT →
            </button>
            <button
              onClick={handleShare}
              style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <ShareIcon size={14} color="rgba(154,148,136,0.35)" />
            </button>
            <button
              onClick={handleSave}
              style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <BookmarkIcon size={14} color={saved ? T.gold : "rgba(154,148,136,0.35)"} filled={saved} />
            </button>
          </div>

        </div>
      </div>

      {/* ── Layer 3: DAS Modal — outside overflow:hidden so it's not clipped ── */}
      {showDasModal && (
        <DasModal
          politician_name={politician_name}
          bioguide_id={bioguide_id}
          donor_alignment_score={donor_alignment_score}
          donation_amount={donation_amount}
          donor_industry={donor_industry}
          donors={donors}
          corruption_contribution={corruption_contribution}
          compareComing={compareComing}
          onClose={() => setShowDasModal(false)}
          onCompare={() => {
            setCompareComing(true);
            setTimeout(() => setCompareComing(false), 2000);
          }}
        />
      )}
    </div>
  );
}

// ── HeroSection ───────────────────────────────────────────────────────────────
function HeroSection({ photoUrl, politician_name, party, state, donor_alignment_score, isMyRep, onDasClick }) {
  const [imgError, setImgError] = useState(false);
  const ini = getInitials(politician_name);
  const pColor = partyColor(party);
  const displayScore = donor_alignment_score ?? "—";
  const scoreColor = dasColorLocal(donor_alignment_score);

  return (
    <div style={{ width: "100%", height: 260, position: "relative", overflow: "hidden" }}>
      {!imgError && photoUrl ? (
        <img
          src={photoUrl}
          alt={politician_name}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{
          width: "100%",
          height: "100%",
          background: T.surface2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial Black, Arial",
          fontSize: 72,
          color: "rgba(201,168,76,0.3)",
        }}>
          {ini}
        </div>
      )}

      {/* Gradient overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to top, rgba(10,11,13,0.85) 0%, rgba(10,11,13,0.3) 40%, transparent 100%)",
      }} />

      {/* Name + party · state */}
      <div style={{ position: "absolute", bottom: 12, left: 14 }}>
        <div style={{ fontFamily: "Arial Black, Arial", fontSize: 22, color: T.text, lineHeight: 1.1 }}>
          {politician_name}
        </div>
        <div style={{ fontFamily: "Arial", fontSize: 12, color: T.text2, marginTop: 2 }}>
          <span style={{ color: pColor }}>{party}</span>
          {state ? ` · ${state}` : ""}
        </div>
        {isMyRep && (
          <div style={{
            display:       "inline-block",
            marginTop:     5,
            background:    "rgba(201,168,76,0.2)",
            border:        "1px solid rgba(201,168,76,0.5)",
            borderRadius:  20,
            padding:       "2px 9px",
            fontFamily:    "Arial Black",
            fontSize:      9,
            letterSpacing: "0.12em",
            color:         T.gold,
          }}>
            YOUR REP
          </div>
        )}
      </div>

      {/* DAS badge */}
      {donor_alignment_score !== null && donor_alignment_score !== undefined && (
        <div
          onClick={onDasClick}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(10,11,13,0.8)",
            border: "0.5px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ fontFamily: "Arial Black, Arial", fontSize: 20, color: scoreColor, lineHeight: 1 }}>
            {displayScore}
          </div>
          <div style={{ fontFamily: "Arial", fontSize: 9, color: T.text2, letterSpacing: "0.08em", marginTop: 2 }}>
            DAS
          </div>
        </div>
      )}
    </div>
  );
}

// ── DatePill ──────────────────────────────────────────────────────────────────
function DatePill({ label }) {
  return (
    <div style={{
      fontFamily: "Arial",
      fontSize: 11,
      color: T.text2,
      background: T.surface2,
      borderRadius: 4,
      padding: "3px 7px",
      whiteSpace: "nowrap",
    }}>
      {label}
    </div>
  );
}

// ── DasModal ──────────────────────────────────────────────────────────────────
function DasModal({
  politician_name, bioguide_id, donor_alignment_score, donation_amount,
  donor_industry, donors, corruption_contribution,
  compareComing, onClose, onCompare,
}) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = bioguideUrl(bioguide_id);
  const firstName = (politician_name || "").split(" ")[0];
  const ini = getInitials(politician_name);
  const displayScore = donor_alignment_score ?? "—";
  const scoreColor = dasColorLocal(donor_alignment_score);
  const barPct = donor_alignment_score ?? 0;

  // Top industries from donor records — pac_donors uses `dimension` column
  const topIndustries = donors.length > 0
    ? [...new Set(donors.map(d => d.dimension).filter(Boolean))].slice(0, 3)
    : [donor_industry].filter(Boolean);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(10,11,13,0.97)",
        borderRadius: 12,
        zIndex: 10,
        overflowY: "auto",
        padding: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16, position: "relative" }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          background: T.surface2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {!imgError && photoUrl ? (
            <img
              src={photoUrl}
              alt={politician_name}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div style={{ fontFamily: "Arial Black, Arial", fontSize: 20, color: "rgba(201,168,76,0.5)" }}>
              {ini}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "Arial",
            fontSize: 9,
            color: T.text2,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}>
            Donor Alignment Score
          </div>
          <div style={{ fontFamily: "Arial Black, Arial", fontSize: 16, color: T.text, lineHeight: 1.2 }}>
            Here is how {firstName} earned their score
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            color: T.text2,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Score block */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <div style={{ fontFamily: "Arial Black, Arial", fontSize: 52, color: scoreColor, lineHeight: 1 }}>
            {displayScore}
          </div>
          <div style={{ fontFamily: "Arial", fontSize: 12, color: T.text2 }}>out of 100</div>
        </div>
        <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, marginBottom: 6 }}>
          <div style={{ height: 8, width: `${barPct}%`, background: scoreColor, borderRadius: 4, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ fontFamily: "Arial", fontSize: 11, color: T.text2 }}>
          They voted with donor interests {donor_alignment_score ?? "—"}% of the time
        </div>
      </div>

      {/* Story text */}
      <div style={{ fontFamily: "Arial", fontSize: 14, color: T.text2, lineHeight: 1.65, marginBottom: 16 }}>
        We matched every donation {firstName} received against every vote they cast. Their biggest donors are{" "}
        {topIndustries.length > 0
          ? topIndustries.map((ind, i) => (
              <span key={i}>
                {i > 0 ? (i === topIndustries.length - 1 ? " and " : ", ") : ""}
                <strong style={{ color: T.gold }}>{ind}</strong>
              </span>
            ))
          : <strong style={{ color: T.gold }}>finance</strong>
        }.{" "}
        Each time they voted the way those donors wanted, their score went up.
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        <StatBox value={corruption_contribution || "—"} label="votes matched donors" color={T.red} />
        <StatBox value="—" label="votes against donors" color={T.green} />
        <StatBox value={formatAmountFull(donation_amount)} label="total PAC money" color={T.gold} />
      </div>

      {/* Donor logos grid */}
      {donors.length > 0 && (
        <>
          <div style={{
            fontFamily: "Arial",
            fontSize: 9,
            color: T.text2,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}>
            Biggest donors
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {donors.slice(0, 4).map((d, i) => (
              <DonorCard key={i} donor={d} bioguide_id={bioguide_id} />
            ))}
          </div>
        </>
      )}

      {/* Compare button */}
      <button
        onClick={onCompare}
        style={{
          width: "100%",
          background: T.surface2,
          border: `0.5px solid ${T.border}`,
          borderRadius: 8,
          padding: 11,
          fontFamily: "Arial",
          fontSize: 13,
          color: compareComing ? T.gold : T.text2,
          cursor: "pointer",
        }}
      >
        {compareComing ? "Coming soon" : "⇄ Compare to other politicians"}
      </button>
    </div>
  );
}

// ── StatBox ───────────────────────────────────────────────────────────────────
function StatBox({ value, label, color }) {
  return (
    <div style={{ background: T.surface2, borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
      <div style={{ fontFamily: "Arial Black, Arial", fontSize: 18, color, lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontFamily: "Arial", fontSize: 9, color: T.text2, lineHeight: 1.3 }}>
        {label}
      </div>
    </div>
  );
}

// ── DonorCard ─────────────────────────────────────────────────────────────────
// pac_donors columns: pac_name, total_amount, dimension
function DonorCard({ donor, bioguide_id }) {
  const [logoError, setLogoError] = useState(false);
  const name = donor.pac_name || "PAC";
  const amount = formatAmountFull(donor.total_amount);
  const domain = pacToDomain(name);
  const ini = getInitials(name);
  const bgColor = hashColor(name);
  const osUrl = `https://www.opensecrets.org/members-of-congress/summary?cid=${bioguide_id}`;

  return (
    <div
      onClick={() => window.open(osUrl, "_blank")}
      style={{
        background: T.surface2,
        borderRadius: 8,
        padding: "10px 12px",
        display: "flex",
        gap: 10,
        border: "0.5px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        alignItems: "center",
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        background: "white",
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {!logoError && domain ? (
          <img
            src={`https://logo.clearbit.com/${domain}`}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onError={() => setLogoError(true)}
          />
        ) : (
          <div style={{
            width: "100%",
            height: "100%",
            background: bgColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Arial Black, Arial",
            fontSize: 11,
            color: "white",
          }}>
            {ini}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Arial",
          fontSize: 11,
          color: T.text,
          fontWeight: "bold",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {name}
        </div>
        <div style={{ fontFamily: "Arial Black, Arial", fontSize: 11, color: T.gold }}>
          {amount}
        </div>
      </div>
    </div>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
function ShareIcon({ size = 16, color = "#9A9488" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function BookmarkIcon({ size = 16, color = "#9A9488", filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}
