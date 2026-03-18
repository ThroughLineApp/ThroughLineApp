import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const C = {
  bg: "#0a0b0d",
  bgCard: "#11131a",
  gold: "#c9a84c",
  goldGlow: "rgba(201,168,76,0.18)",
  parchment: "#e8dfc8",
  parchmentDim: "#a89d88",
  border: "rgba(201,168,76,0.15)",
  borderHover: "rgba(201,168,76,0.4)",
  red: "#c94c4c",
};

export default function Custom404() {
  const router = useRouter();
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    const { data } = await supabase
      .from("politicians")
      .select("name, party, state, chamber, slug, donor_alignment_score")
      .ilike("name", `%${query.trim()}%`)
      .limit(6);

    setResults(data ?? []);
    setLoading(false);
  };

  const partyColor = (party) =>
    party === "D" ? "#4c78c9" : party === "R" ? C.red : "#8e4cc9";

  return (
    <>
      <Head>
        <title>Not Found | Throughline</title>
      </Head>

      <div style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.parchment,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        fontFamily: "sans-serif",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "fixed", top: "30%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500, height: 300,
          background: `radial-gradient(ellipse, ${C.goldGlow} 0%, transparent 70%)`,
          pointerEvents: "none", zIndex: 0,
        }} />

        <div style={{
          position: "relative", zIndex: 1,
          maxWidth: 520, width: "100%",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          {/* Wordmark */}
          <div
            onClick={() => router.push("/")}
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 13, letterSpacing: "0.3em",
              color: C.gold, marginBottom: 48, cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >THROUGHLINE</div>

          {/* Receipt icon */}
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 80,
            color: C.gold, opacity: 0.15,
            lineHeight: 1, marginBottom: 8,
          }}>404</div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(24px, 6vw, 36px)",
            fontStyle: "italic",
            color: C.parchment,
            textAlign: "center",
            lineHeight: 1.2,
            margin: "0 0 12px",
          }}>
            This politician isn't in<br />our database yet.
          </h1>

          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14, color: C.parchmentDim,
            textAlign: "center", lineHeight: 1.6,
            margin: "0 0 40px", maxWidth: 380,
          }}>
            We track all 538 current members of Congress. Try searching by name,
            or submit someone to our Worth Watching list.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            style={{ width: "100%", display: "flex", gap: 8, marginBottom: 8 }}
          >
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search a politician's name…"
              style={{
                flex: 1,
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                color: C.parchment,
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                padding: "12px 16px",
                outline: "none",
              }}
              onFocus={e => (e.target.style.borderColor = C.gold)}
              onBlur={e => (e.target.style.borderColor = C.border)}
            />
            <button
              type="submit"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700, fontSize: 14, letterSpacing: "0.15em",
                color: C.bg, background: C.gold,
                border: "none", borderRadius: 2,
                padding: "12px 20px", cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {loading ? "…" : "SEARCH"}
            </button>
          </form>

          {/* Search results */}
          {searched && (
            <div style={{ width: "100%", marginBottom: 32 }}>
              {results.length === 0 ? (
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13, color: C.parchmentDim,
                  textAlign: "center", padding: "16px 0",
                }}>No results found for "{query}"</p>
              ) : (
                <div style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 2, overflow: "hidden",
                }}>
                  {results.map((p, i) => (
                    <div
                      key={p.slug}
                      onClick={() => router.push(`/politician/${p.slug}`)}
                      style={{
                        display: "flex", alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        background: C.bgCard,
                        borderBottom: i < results.length - 1 ? `1px solid ${C.border}` : "none",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#161922")}
                      onMouseLeave={e => (e.currentTarget.style.background = C.bgCard)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* Party dot */}
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: partyColor(p.party), flexShrink: 0,
                        }} />
                        <div>
                          <div style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 700, fontSize: 15, color: C.parchment,
                          }}>{p.name}</div>
                          <div style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: 11, color: C.parchmentDim,
                          }}>
                            {p.party} · {p.state} · {p.chamber === "senate" ? "Senate" : "House"}
                          </div>
                        </div>
                      </div>

                      {/* DAS badge */}
                      {p.donor_alignment_score != null ? (
                        <div style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700, fontSize: 18,
                          color: p.donor_alignment_score < 34 ? "#4ca87c"
                               : p.donor_alignment_score < 67 ? C.gold
                               : C.red,
                        }}>{Math.round(p.donor_alignment_score)}</div>
                      ) : (
                        <div style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 10, color: C.parchmentDim,
                        }}>—</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div style={{
            width: "100%", height: 1,
            background: C.border, margin: "8px 0 32px",
          }} />

          {/* Worth Watching CTA */}
          <div style={{
            width: "100%",
            border: `1px solid ${C.border}`,
            borderRadius: 2, padding: "20px",
            marginBottom: 32,
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 13, letterSpacing: "0.2em",
              color: C.gold, marginBottom: 8, textTransform: "uppercase",
            }}>Don't see who you're looking for?</div>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13, color: C.parchmentDim,
              lineHeight: 1.6, margin: "0 0 16px",
            }}>
              Submit a local candidate, state legislator, or anyone else you think
              deserves a receipt. Community submissions help us prioritize who to
              track next.
            </p>
            <button
              onClick={() => router.push("/")}
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700, fontSize: 14, letterSpacing: "0.15em",
                color: C.bg, background: C.gold,
                border: "none", borderRadius: 2,
                padding: "10px 24px", cursor: "pointer",
              }}
            >SUBMIT TO WORTH WATCHING →</button>
          </div>

          {/* Back home */}
          <button
            onClick={() => router.push("/")}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13, color: C.parchmentDim,
              background: "none", border: "none",
              cursor: "pointer", textDecoration: "underline",
            }}
          >← Back to homepage</button>
        </div>

        {/* Fonts */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Playfair+Display:ital,wght@1,400;1,700&family=Inter:wght@400;500&display=swap');
          * { box-sizing: border-box; }
          body { margin: 0; }
        `}</style>
      </div>
    </>
  );
}
