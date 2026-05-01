/**
 * pages/alerts.jsx
 * ----------------
 * Personalized feed of throughline events — PAC donations cross-referenced
 * with roll-call votes for politicians the user follows.
 *
 * NOTE: requires profiles.alerts_last_seen_at (timestamptz).
 * If missing, run in Supabase SQL Editor:
 *   ALTER TABLE profiles ADD COLUMN alerts_last_seen_at timestamptz;
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Nav from "../components/Nav";
import supabase from "../lib/supabase";
import { useAuth } from "../lib/auth";

// ── Constants ─────────────────────────────────────────────────────────────────

const DIM_COLORS = {
  economic:    "#c9a84c",
  healthcare:  "#c94c78",
  climate:     "#4ca87c",
  criminal:    "#c94c4c",
  immigration: "#4c78c9",
  foreign:     "#7c4cc9",
  education:   "#c98e4c",
  freedom:     "#4cc9c9",
  guns:        "#c94c4c",
  housing:     "#78c94c",
  tech:        "#4c8ec9",
  voting:      "#c94c9e",
};

const DIM_LABELS = {
  economic:    "ECONOMIC POLICY",
  healthcare:  "HEALTHCARE",
  climate:     "CLIMATE",
  criminal:    "CRIMINAL JUSTICE",
  immigration: "IMMIGRATION",
  foreign:     "FOREIGN POLICY",
  education:   "EDUCATION",
  freedom:     "CIVIL LIBERTIES",
  guns:        "GUN POLICY",
  housing:     "HOUSING",
  tech:        "TECH & PRIVACY",
  voting:      "VOTING RIGHTS",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(amount) {
  if (!amount && amount !== 0) return "$0";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `$${Math.round(amount / 1_000)}K`;
  return `$${Number(amount).toLocaleString()}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  // Append noon UTC to prevent timezone-shift off-by-one
  const d = new Date(dateStr.length === 10 ? dateStr + "T12:00:00Z" : dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function partyColor(party) {
  if (party === "D") return "#4c78c9";
  if (party === "R") return "#c94c4c";
  return "#8e4cc9";
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(/\s+/).map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
}

function getPacDomain(pacName) {
  if (!pacName) return null;
  return pacName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "") + ".com";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PacLogo({ pacName, size = 36 }) {
  const [failed, setFailed] = useState(false);
  const domain   = getPacDomain(pacName);
  const initials = getInitials(pacName);

  if (failed || !domain) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "#1e2130",
        border: "1.5px solid rgba(201,168,76,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11, color: "#c9a84c",
        flexShrink: 0, letterSpacing: "0.03em",
      }}>
        {initials || "?"}
      </div>
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      onError={() => setFailed(true)}
      style={{
        width: size, height: size, borderRadius: "50%",
        border: "1.5px solid rgba(201,168,76,0.15)",
        objectFit: "contain", background: "#fff",
        flexShrink: 0,
      }}
      alt={pacName || ""}
    />
  );
}

function PolPhoto({ bioguideId, name, party, size = 44 }) {
  const [failed, setFailed] = useState(false);

  if (failed || !bioguideId) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: partyColor(party),
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 14, color: "#fff",
        flexShrink: 0,
      }}>
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={`https://theunitedstates.io/images/congress/225x275/${bioguideId}.jpg`}
      onError={() => setFailed(true)}
      style={{
        width: size, height: size, borderRadius: "50%",
        objectFit: "cover", objectPosition: "center top",
        flexShrink: 0,
      }}
      alt={name || ""}
    />
  );
}

function AlertCard({ event, isUnread, followedIssues, onNavigate }) {
  const dim      = event.dimension || "";
  const dimColor = DIM_COLORS[dim] || "#c9a84c";
  const dimLabel = DIM_LABELS[dim] || dim.toUpperCase();
  const isYea    = event.how_voted === "Yea";
  const voteColor = isYea ? "#4ca87c" : "#c94c4c";
  const voteWord  = isYea ? "YES" : "NO";
  const daysAbs   = Math.abs(event.days_between || 0);
  const hasBeliefConflict = Array.isArray(followedIssues) && followedIssues.includes(dim);
  const hasReceipt = (event.corruption_contribution || 0) > 0;
  const isHouse    = event.chamber === "House";

  return (
    <div
      onClick={() => onNavigate(`/politician/${event.slug}?tab=throughline`)}
      style={{
        background: isUnread ? "#13151f" : "#0f1117",
        borderLeft: `3px solid ${isUnread ? "#c9a84c" : "rgba(201,168,76,0.3)"}`,
        borderRadius: "0 6px 6px 0",
        padding: "14px 14px 12px 14px",
        cursor: "pointer",
      }}
    >
      {/* ROW 1 — Meta strip */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {isUnread && (
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#c9a84c", flexShrink: 0,
            }} />
          )}
          <span style={{
            background: dimColor, color: "#fff",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 10, padding: "3px 8px", borderRadius: 2,
            letterSpacing: "0.05em",
          }}>{dimLabel}</span>
          {hasReceipt && (
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 9, color: "#c9a84c",
              background: "rgba(201,168,76,0.12)",
              padding: "2px 6px", borderRadius: 2,
              letterSpacing: "0.05em",
            }}>RECEIPT</span>
          )}
          {hasBeliefConflict && (
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 9, color: dimColor,
              background: `${dimColor}22`,
              padding: "2px 6px", borderRadius: 2,
              letterSpacing: "0.05em",
            }}>BELIEF</span>
          )}
        </div>
        <span style={{
          fontFamily: "Figtree, sans-serif",
          fontSize: 11, color: "#a89d88",
          flexShrink: 0, marginLeft: 8,
        }}>{formatDate(event.vote_date)}</span>
      </div>

      {/* ROW 2 — Politician identity + PAC logo */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PolPhoto
            bioguideId={event.bioguide_id}
            name={event.name}
            party={event.party}
            size={44}
          />
          <div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 18, color: "#e8dfc8", lineHeight: 1.1,
            }}>{event.name}</div>
            <div style={{
              fontFamily: "Figtree, sans-serif",
              fontSize: 11, color: "#a89d88", marginTop: 2,
            }}>
              {[event.party, event.chamber, event.state].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
        <PacLogo pacName={event.donor_name} size={36} />
      </div>

      {/* ROW 3 — Headline */}
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontStyle: "italic",
        fontSize: 15, color: "#e8dfc8",
        lineHeight: 1.4, marginBottom: 8,
      }}>
        <strong style={{ fontStyle: "normal" }}>{event.name}</strong> voted{" "}
        <span style={{ color: voteColor, fontStyle: "normal", fontWeight: 700 }}>
          {voteWord}
        </span>{" "}
        on <em>{event.bill_name}</em> — {daysAbs} day{daysAbs !== 1 ? "s" : ""} after
        a {formatAmount(event.donation_amount)} donation from{" "}
        <strong style={{ fontStyle: "normal" }}>{event.donor_name}</strong>
      </div>

      {/* ROW 4 — Belief conflict line */}
      {hasBeliefConflict && (
        <div style={{
          fontFamily: "Figtree, sans-serif",
          fontSize: 12, color: dimColor, marginBottom: 8,
        }}>
          ⚡ This conflicts with your position on {DIM_LABELS[dim] || dim}
        </div>
      )}

      {/* ROW 5 — PAC name with FEC link */}
      <div style={{
        fontFamily: "Figtree, sans-serif",
        fontSize: 11, color: "#a89d88", marginBottom: 10,
      }}>
        Funded by:{" "}
        <a
          href={`https://www.fec.gov/data/committee/?name=${encodeURIComponent(event.donor_name || "")}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ color: "#c9a84c", textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
        >
          {event.donor_name}
        </a>
      </div>

      {/* ROW 6 — Action strip */}
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderTop: "1px solid rgba(201,168,76,0.08)",
          paddingTop: 10,
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => onNavigate(`/politician/${event.slug}?tab=receipt`)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#c9a84c",
            fontFamily: "Figtree, sans-serif", fontSize: 11, padding: 0,
          }}
        >View receipt →</button>

        <a
          href={`https://www.c-span.org/search/?searchtype=Videos&query=${encodeURIComponent(event.bill_name || "")}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#a89d88", textDecoration: "none", fontFamily: "Figtree, sans-serif", fontSize: 11 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#e8dfc8")}
          onMouseLeave={e => (e.currentTarget.style.color = "#a89d88")}
        >C-SPAN footage</a>

        <a
          href={isHouse
            ? "https://clerk.house.gov/evs/"
            : "https://www.senate.gov/legislative/votes_new.htm"}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#a89d88", textDecoration: "none", fontFamily: "Figtree, sans-serif", fontSize: 11 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#e8dfc8")}
          onMouseLeave={e => (e.currentTarget.style.color = "#a89d88")}
        >Yea/Nay breakdown →</a>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, requireAuth } = useAuth();

  const [events,         setEvents]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeFilter,   setActiveFilter]   = useState("all");
  const [alertsLastSeen, setAlertsLastSeen] = useState(null);

  const followedPols   = profile?.followed_politicians || [];
  const followedIssues = profile?.followed_issues      || [];
  const hasFollowedPols = followedPols.length > 0;

  // ── Fetch events ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    fetchAlerts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, followedPols.join(",")]);

  // ── Mark alerts as seen (1 s delay so isUnread comparison runs first) ─────
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(async () => {
      await supabase
        .from("profiles")
        .update({ alerts_last_seen_at: new Date().toISOString() })
        .eq("id", user.id);
    }, 1000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function fetchAlerts() {
    setLoading(true);

    // Capture last-seen before the 1-s timer updates it
    const lastSeen = profile?.alerts_last_seen_at || null;
    setAlertsLastSeen(lastSeen);

    try {
      // ── Query 1: fetch events (no join — avoids PostgREST FK issues) ───────
      let eventsQuery = supabase
        .from("throughline_events")
        .select("id, politician_id, donor_name, donor_industry, donation_amount, donation_date, bill_name, bill_id, bill_link, vote_date, days_between, how_voted, dimension, corruption_contribution")
        .order("vote_date", { ascending: false });

      if (user && hasFollowedPols) {
        eventsQuery = eventsQuery.in("politician_id", followedPols).limit(50);
      } else {
        eventsQuery = eventsQuery.limit(20);
      }

      const { data: eventsData, error: eventsError } = await eventsQuery;
      if (eventsError) throw eventsError;

      const rows = eventsData || [];

      // ── Query 2: fetch politicians for those event rows ───────────────────
      const polIds = [...new Set(rows.map(e => e.politician_id).filter(Boolean))];
      const polMap = {};
      if (polIds.length > 0) {
        const { data: polRows, error: polError } = await supabase
          .from("politicians")
          .select("id, name, party, chamber, state, bioguide_id, slug")
          .in("id", polIds);
        if (polError) throw polError;
        (polRows || []).forEach(p => { polMap[p.id] = p; });
      }

      // ── Merge ─────────────────────────────────────────────────────────────
      const flat = rows.map(e => {
        const pol = polMap[e.politician_id] || {};
        return {
          ...e,
          name:        pol.name        || null,
          party:       pol.party       || null,
          chamber:     pol.chamber     || null,
          state:       pol.state       || null,
          bioguide_id: pol.bioguide_id || null,
          slug:        pol.slug        || null,
        };
      });

      setEvents(flat);
    } catch (err) {
      console.error("fetchAlerts error:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  // ── Client-side filter ─────────────────────────────────────────────────────
  const filteredEvents = events.filter(e => {
    if (activeFilter === "all")       return true;
    if (activeFilter === "following") return user && followedPols.includes(e.politician_id);
    return e.dimension === activeFilter;
  });

  const isUnread = (event) => {
    if (!alertsLastSeen) return true;
    return new Date(event.vote_date) > new Date(alertsLastSeen);
  };

  const unreadCount = loading ? 0 : events.filter(isUnread).length;

  // Issue filter pills — only dimensions the user follows that have a label
  const issuePills = followedIssues.filter(i => DIM_LABELS[i]);

  const navigate = (href) => router.push(href);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Alerts — Throughline</title>
      </Head>

      <div style={{ background: "#0a0b0d", minHeight: "100vh" }}>
        <Nav />

        {/* ── Sticky page header ── */}
        <div style={{
          position: "sticky",
          top: 50,
          zIndex: 90,
          background: "#0a0b0d",
          borderBottom: "1px solid rgba(201,168,76,0.15)",
          height: 52,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
          maxWidth: 600,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 20, color: "#c9a84c", letterSpacing: "0.2em",
          }}>ALERTS</span>
          {unreadCount > 0 && (
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13, color: "#0a0b0d",
              background: "#c9a84c",
              borderRadius: 12, padding: "2px 10px",
              letterSpacing: "0.05em",
            }}>
              {unreadCount > 99 ? "99+" : unreadCount} NEW
            </span>
          )}
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px" }}>

          {/* Gold separator */}
          <div style={{ height: 1, background: "rgba(201,168,76,0.15)", marginBottom: 12 }} />

          {/* Filter pills */}
          <div style={{
            display: "flex", gap: 8,
            overflowX: "auto", paddingBottom: 12,
            scrollbarWidth: "none", msOverflowStyle: "none",
          }}>
            {["all", ...(hasFollowedPols ? ["following"] : []), ...issuePills].map(pill => {
              const isActive = activeFilter === pill;
              const label = pill === "all"       ? "All"
                : pill === "following" ? "Following"
                : DIM_LABELS[pill]    || pill;
              return (
                <button
                  key={pill}
                  onClick={() => setActiveFilter(pill)}
                  style={{
                    flexShrink: 0,
                    fontFamily: "Figtree, sans-serif", fontSize: 12,
                    padding: "5px 14px", borderRadius: 20,
                    border: `1px solid ${isActive ? "#c9a84c" : "rgba(201,168,76,0.4)"}`,
                    background: isActive ? "#c9a84c" : "transparent",
                    color: isActive ? "#0a0b0d" : "#c9a84c",
                    cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >{label}</button>
              );
            })}
          </div>

          {/* Logged-out banner */}
          {!user && !authLoading && (
            <div style={{
              background: "#13151f",
              border: "1px solid rgba(201,168,76,0.2)",
              borderRadius: 4, padding: "14px 16px", marginBottom: 16,
              fontFamily: "Figtree, sans-serif", fontSize: 13, color: "#e8dfc8",
              lineHeight: 1.5,
            }}>
              You&apos;re seeing recent activity across all politicians.
              Sign in to follow the ones you care about.{" "}
              <button
                onClick={() => requireAuth("Sign in to personalize your alerts.")}
                style={{
                  color: "#c9a84c", background: "none", border: "none",
                  cursor: "pointer", fontSize: 13, fontFamily: "Figtree, sans-serif", padding: 0,
                }}
              >Sign in →</button>
            </div>
          )}


          {/* Loading */}
          {(loading || authLoading) && (
            <div style={{
              textAlign: "center", padding: "60px 0",
              fontFamily: "Figtree, sans-serif", fontSize: 13, color: "#a89d88",
            }}>Loading…</div>
          )}

          {/* Empty states */}
          {!loading && !authLoading && filteredEvents.length === 0 && (
            !user ? (
              <div style={{ textAlign: "center", padding: "80px 16px" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🔔</div>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontStyle: "italic",
                  fontSize: 18, color: "#e8dfc8", marginBottom: 10,
                }}>
                  Sign in to follow politicians and get personalized alerts.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
                  <button
                    onClick={() => requireAuth()}
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 14, letterSpacing: "0.1em",
                      background: "#c9a84c", color: "#0a0b0d",
                      border: "none", borderRadius: 4,
                      padding: "10px 24px", cursor: "pointer",
                    }}
                  >SIGN IN</button>
                  <button
                    onClick={() => navigate("/quiz")}
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 14, letterSpacing: "0.1em",
                      background: "transparent", color: "#c9a84c",
                      border: "1px solid #c9a84c", borderRadius: 4,
                      padding: "10px 24px", cursor: "pointer",
                    }}
                  >TAKE THE QUIZ</button>
                </div>
              </div>
            ) : !hasFollowedPols ? (
              <div style={{
                textAlign: "center", padding: "60px 0",
                fontFamily: "Figtree, sans-serif", fontSize: 13, color: "#a89d88",
              }}>No recent activity found.</div>
            ) : (
              <div style={{
                textAlign: "center", padding: "60px 0",
                fontFamily: "Figtree, sans-serif", fontSize: 13, color: "#a89d88",
              }}>No alerts match this filter yet.</div>
            )
          )}

          {/* Cards feed */}
          {!loading && !authLoading && filteredEvents.length > 0 && (
            <div style={{ paddingBottom: 80 }}>
              {filteredEvents.map((event, idx) => (
                <div key={event.id || idx}>
                  <AlertCard
                    event={event}
                    isUnread={isUnread(event)}
                    followedIssues={followedIssues}
                    onNavigate={navigate}
                  />
                  {idx < filteredEvents.length - 1 && (
                    <div style={{
                      height: 1,
                      background: "rgba(201,168,76,0.08)",
                      margin: "12px 0",
                    }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
