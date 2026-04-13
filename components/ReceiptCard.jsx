import { useState } from "react";
import { formatAmountFull, DIMENSION_LABELS, DIMENSION_COLORS, partyColor, dasColor } from "../lib/feedUtils";

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
  border: "rgba(255,255,255,0.08)",
  goldBorder: "rgba(201,168,76,0.25)",
};

/**
 * ReceiptCard — reusable receipt card for feed and politician profile pages.
 *
 * Props:
 *   event       — throughline_event object (or mock with same shape)
 *   onSave      — called when user taps bookmark (triggers sign-up if needed)
 *   onShare     — called when user taps share (always free)
 *   onCallScript — called when user taps call (triggers sign-up)
 *   compact     — boolean, renders smaller version for profile tabs
 */
export default function ReceiptCard({ event, onSave, onShare, onCallScript, compact = false }) {
  const [saved, setSaved] = useState(false);
  const [shareFlash, setShareFlash] = useState(false);

  if (!event) return null;

  const {
    politician_name,
    politician_slug,
    party,
    state,
    donor_name,
    donor_industry,
    donation_amount,
    donation_date,
    bill_name,
    vote_date,
    how_voted,
    days_before_vote,
    vote_impact,
    dimension,
    donor_alignment_score,
    bill_link,
    corruption_contribution,
    bioguide_id,
  } = event;

  const dimColor = DIMENSION_COLORS[dimension] || T.gold;
  const dimLabel = DIMENSION_LABELS[dimension] || dimension;
  const voteIsYes = how_voted === "Yes" || how_voted === "Yea";
  const voteColor = voteIsYes ? T.green : T.red;
  const voteLabel = voteIsYes ? "VOTED YES" : "VOTED NO";

  const donDays = days_before_vote ?? (
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

  const handleSave = () => {
    setSaved(true);
    if (onSave) onSave(event);
  };

  const handleShare = () => {
    setShareFlash(true);
    setTimeout(() => setShareFlash(false), 1200);
    if (onShare) onShare(event);
  };

  return (
    <div style={{
      background: T.surface,
      border: `0.5px solid ${T.border}`,
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: compact ? 12 : 16,
      transition: "border-color 0.2s",
    }}>

      {/* Dimension stripe */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${dimColor}, ${dimColor}44)`,
      }} />

      <div style={{ padding: compact ? "16px" : "20px" }}>

        {/* Header row: politician + DAS */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Avatar */}
            <div style={{
              width: compact ? 36 : 44,
              height: compact ? 36 : 44,
              borderRadius: "50%",
              background: partyColor(party) + "22",
              border: `1.5px solid ${partyColor(party)}44`,
              flexShrink: 0,
              overflow: "hidden",
              position: "relative",
            }}>
              {bioguide_id ? (
                <img
                  src={`https://bioguide.congress.gov/bioguide/photo/${bioguide_id.charAt(0).toUpperCase()}/${bioguide_id}.jpg`}
                  alt={politician_name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                  onError={e => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div style={{
                display: bioguide_id ? "none" : "flex",
                position: "absolute", inset: 0,
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Arial Black, Arial",
                fontSize: compact ? 13 : 16,
                fontWeight: 900,
                color: partyColor(party),
              }}>
                {(politician_name || "?").split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
            </div>

            <div>
              <div style={{
                fontFamily: "Arial Black, Arial",
                fontWeight: 900,
                fontSize: compact ? 14 : 16,
                color: T.text,
                lineHeight: 1.2,
              }}>{politician_name || "Unknown"}</div>
              <div style={{
                fontFamily: "Arial",
                fontSize: 11,
                color: T.text2,
                marginTop: 2,
              }}>
                <span style={{ color: partyColor(party), fontWeight: 700 }}>{party}</span>
                {state ? ` · ${state}` : ""}
              </div>
            </div>
          </div>

          {/* DAS badge */}
          {donor_alignment_score !== null && donor_alignment_score !== undefined && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: T.surface2,
              border: `0.5px solid ${T.border}`,
              borderRadius: 8,
              padding: "6px 10px",
            }}>
              <div style={{
                fontFamily: "Arial Black, Arial",
                fontWeight: 900,
                fontSize: 18,
                color: dasColor(donor_alignment_score),
                lineHeight: 1,
              }}>{donor_alignment_score}</div>
              <div style={{
                fontFamily: "Arial",
                fontSize: 9,
                color: T.text2,
                letterSpacing: "0.08em",
                marginTop: 2,
              }}>DAS</div>
            </div>
          )}
        </div>

        {/* The receipt line — THE hero element */}
        <div style={{
          background: T.surface2,
          border: `0.5px solid ${T.border}`,
          borderRadius: 10,
          padding: compact ? "14px" : "18px",
          marginBottom: 14,
        }}>
          {/* Amount */}
          <div style={{
            fontFamily: "Arial Black, Arial",
            fontWeight: 900,
            fontSize: compact ? 32 : 42,
            color: T.gold,
            lineHeight: 1,
            marginBottom: 4,
          }}>{formatAmountFull(donation_amount)}</div>

          {/* Donor name */}
          <div style={{
            fontFamily: "Arial",
            fontSize: 12,
            color: T.text2,
            marginBottom: 10,
          }}>from {event.donor_display || donor_industry || "PAC donor"}</div>

          {/* Timeline connector */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}>
            <div style={{
              fontFamily: "Arial",
              fontSize: 11,
              color: T.text2,
              background: T.surface,
              border: `0.5px solid ${T.border}`,
              borderRadius: 4,
              padding: "3px 8px",
              whiteSpace: "nowrap",
            }}>{donDateStr || "—"}</div>

            <div style={{ flex: 1, position: "relative", height: 2 }}>
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${T.gold}66, ${T.gold})`, borderRadius: 1 }} />
              <div style={{
                position: "absolute",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: 6, height: 6,
                borderRadius: "50%",
                background: T.gold,
                boxShadow: `0 0 6px ${T.gold}`,
              }} />
            </div>

            {donDays !== null && (
              <div style={{
                fontFamily: "Arial Black, Arial",
                fontWeight: 900,
                fontSize: 11,
                color: T.text2,
                whiteSpace: "nowrap",
              }}>{donDays}d later</div>
            )}

            <div style={{
              fontFamily: "Arial",
              fontSize: 11,
              color: T.text2,
              background: T.surface,
              border: `0.5px solid ${T.border}`,
              borderRadius: 4,
              padding: "3px 8px",
              whiteSpace: "nowrap",
            }}>{voteDateStr || "—"}</div>
          </div>

          {/* Vote result */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              background: voteColor + "22",
              border: `1px solid ${voteColor}66`,
              borderRadius: 6,
              padding: "4px 12px",
              fontFamily: "Arial Black, Arial",
              fontWeight: 900,
              fontSize: compact ? 13 : 15,
              color: voteColor,
              letterSpacing: "0.04em",
            }}>{voteLabel}</div>

            <div style={{
              fontFamily: "Arial",
              fontSize: 12,
              color: T.text2,
              flex: 1,
              lineHeight: 1.3,
            }}>
              {bill_link ? (
                <a href={bill_link} target="_blank" rel="noopener noreferrer" style={{ color: T.text2, textDecoration: "underline", textDecorationColor: T.text2 + "44" }}>
                  {bill_name || "bill"}
                </a>
              ) : (bill_name || "on related legislation")}
            </div>
          </div>
        </div>

        {/* Vote impact */}
        {vote_impact && !compact && (
          <div style={{
            fontFamily: "Arial",
            fontSize: 13,
            color: T.text2,
            lineHeight: 1.55,
            marginBottom: 14,
            paddingLeft: 12,
            borderLeft: `2px solid ${dimColor}`,
          }}>{vote_impact}</div>
        )}

        {/* Tags row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 14,
        }}>
          {/* Dimension chip */}
          <div style={{
            background: dimColor + "18",
            border: `0.5px solid ${dimColor}44`,
            borderRadius: 20,
            padding: "3px 10px",
            fontFamily: "Arial",
            fontSize: 11,
            color: dimColor,
            fontWeight: 600,
          }}>{dimLabel}</div>

          {/* DAS contribution */}
          {corruption_contribution > 0 && (
            <div style={{
              background: T.red + "12",
              border: `0.5px solid ${T.red}33`,
              borderRadius: 20,
              padding: "3px 10px",
              fontFamily: "Arial",
              fontSize: 11,
              color: T.red,
            }}>+{corruption_contribution} DAS pts</div>
          )}

          {/* Source chip */}
          <div style={{
            background: T.surface2,
            border: `0.5px solid ${T.border}`,
            borderRadius: 20,
            padding: "3px 10px",
            fontFamily: "Arial",
            fontSize: 11,
            color: T.text2,
            marginLeft: "auto",
          }}>
            <a href="https://fec.gov" target="_blank" rel="noopener noreferrer" style={{ color: T.text2, textDecoration: "none" }}>
              FEC ↗
            </a>
          </div>
        </div>

        {/* Action row */}
        <div style={{
          display: "flex",
          gap: 8,
          borderTop: `0.5px solid ${T.border}`,
          paddingTop: 14,
        }}>
          {/* Share — always free */}
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              background: shareFlash ? T.gold + "22" : "transparent",
              border: `0.5px solid ${shareFlash ? T.gold : T.border}`,
              borderRadius: 8,
              padding: "9px 0",
              fontFamily: "Arial",
              fontSize: 12,
              color: shareFlash ? T.gold : T.text2,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <ShareIcon size={14} color={shareFlash ? T.gold : T.text2} />
            {shareFlash ? "Copied!" : "Share"}
          </button>

          {/* Save — triggers sign-up */}
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              background: saved ? T.gold + "18" : "transparent",
              border: `0.5px solid ${saved ? T.gold : T.border}`,
              borderRadius: 8,
              padding: "9px 0",
              fontFamily: "Arial",
              fontSize: 12,
              color: saved ? T.gold : T.text2,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <BookmarkIcon size={14} color={saved ? T.gold : T.text2} filled={saved} />
            {saved ? "Saved" : "Save"}
          </button>

          {/* Call script — triggers sign-up */}
          {!compact && (
            <button
              onClick={onCallScript ? () => onCallScript(event) : undefined}
              style={{
                flex: 1,
                background: T.gold,
                border: "none",
                borderRadius: 8,
                padding: "9px 0",
                fontFamily: "Arial Black, Arial",
                fontWeight: 900,
                fontSize: 12,
                color: "#0A0B0D",
                cursor: "pointer",
                letterSpacing: "0.03em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              📞 Call Script
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────
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
