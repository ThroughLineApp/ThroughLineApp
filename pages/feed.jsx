import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAuth } from "../lib/auth";

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
  @keyframes tlTravel {
    0%   { left: 0; opacity: 1; }
    80%  { left: calc(100% - 10px); opacity: 1; }
    82%  { left: calc(100% - 10px); opacity: 0; }
    84%  { left: 0; opacity: 0; }
    100% { left: 0; opacity: 1; }
  }
  .story-card:hover { border-color: rgba(201,168,76,0.3) !important; transform: translateY(-1px); }
  .story-card { transition: all 0.2s ease; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }
`;

const MOCK_STORIES = [
  {
    id: 1,
    politician: "Mitch McConnell",
    slug: "mitch-mcconnell",
    party: "R",
    state: "KY",
    bioguide_id: "M000355",
    donor: "PhRMA PAC",
    industry: "Pharmaceutical",
    industryColor: "#c94c78",
    amount: "$1.2M",
    donationDate: "Mar 14, 2024",
    bill: "Medicare Drug Price Negotiation Act",
    vote: "NO",
    voteDate: "Jun 11, 2024",
    daysBetween: 89,
    headline: "Sen. McConnell voted NO on drug pricing — 89 days after $1.2M from pharma PACs.",
    impact: "Blocked Medicare from negotiating lower drug prices for 64 million seniors.",
    dimension: "healthcare",
    dimensionColor: "#c94c78",
    das: 84,
  },
  {
    id: 2,
    politician: "Ted Cruz",
    slug: "ted-cruz",
    party: "R",
    state: "TX",
    bioguide_id: "C001098",
    donor: "American Petroleum Institute PAC",
    industry: "Oil & Gas",
    industryColor: "#4ca87c",
    amount: "$900K",
    donationDate: "Jan 4, 2024",
    bill: "Clean Energy Transition Act",
    vote: "NO",
    voteDate: "Apr 2, 2024",
    daysBetween: 88,
    headline: "Sen. Cruz voted NO on clean energy — 88 days after $900K from oil & gas.",
    impact: "Eliminated $42 billion in clean energy tax credits and delayed offshore wind development.",
    dimension: "climate",
    dimensionColor: "#4ca87c",
    das: 77,
  },
  {
    id: 3,
    politician: "Bernie Sanders",
    slug: "bernie-sanders",
    party: "D",
    state: "VT",
    bioguide_id: "S000033",
    donor: "Small donors (avg $27)",
    industry: "Grassroots",
    industryColor: "#4ca87c",
    amount: "$47M",
    donationDate: "Ongoing",
    bill: "Minimum Wage Increase Act",
    vote: "YES",
    voteDate: "Feb 7, 2024",
    daysBetween: 12,
    headline: "Sen. Sanders voted YES on minimum wage — consistent with his grassroots donor base.",
    impact: "Would have raised the federal minimum wage to $17 an hour over four years.",
    dimension: "economic",
    dimensionColor: "#c9a84c",
    das: 12,
  },
  {
    id: 4,
    politician: "Amy Klobuchar",
    slug: "amy-klobuchar",
    party: "D",
    state: "MN",
    bioguide_id: "K000367",
    donor: "Tech Industry PACs",
    industry: "Technology",
    industryColor: "#4c8ec9",
    amount: "$480K",
    donationDate: "Oct 3, 2023",
    bill: "American Innovation and Choice Online Act",
    vote: "YES",
    voteDate: "Dec 3, 2023",
    daysBetween: 61,
    headline: "Sen. Klobuchar voted YES on weakened antitrust bill — 61 days after $480K from Big Tech.",
    impact: "Passed a version of the bill with key enforcement provisions stripped out.",
    dimension: "tech",
    dimensionColor: "#4c8ec9",
    das: 48,
  },
  {
    id: 5,
    politician: "Marco Rubio",
    slug: "marco-rubio",
    party: "R",
    state: "FL",
    bioguide_id: "R000595",
    donor: "Defense Industry PACs",
    industry: "Defense",
    industryColor: "#8e4cc9",
    amount: "$540K",
    donationDate: "Feb 8, 2024",
    bill: "National Defense Authorization Act",
    vote: "YES",
    voteDate: "Mar 23, 2024",
    daysBetween: 44,
    headline: "Sen. Rubio voted YES on expanded military spending — 44 days after $540K from defense contractors.",
    impact: "Authorized $886 billion in defense spending, including major contracts for Rubio's top donors.",
    dimension: "foreign",
    dimensionColor: "#8e4cc9",
    das: 61,
  },
  {
    id: 6,
    politician: "Elizabeth Warren",
    slug: "elizabeth-warren",
    party: "D",
    state: "MA",
    bioguide_id: "W000817",
    donor: "Small donors (avg $31)",
    industry: "Grassroots",
    industryColor: "#4ca87c",
    amount: "$28M",
    donationDate: "Ongoing",
    bill: "Wall Street Accountability Act",
    vote: "YES",
    voteDate: "Mar 5, 2024",
    daysBetween: 19,
    headline: "Sen. Warren voted YES on Wall Street accountability — no PAC money, no conflict.",
    impact: "Strengthened consumer protections against predatory lending and bank overdraft fees.",
    dimension: "economic",
    dimensionColor: "#c9a84c",
    das: 22,
  },
];

const DIMENSION_LABELS = {
  healthcare: "Healthcare", climate: "Climate & Energy", economic: "Economic Policy",
  tech: "Tech & Privacy", foreign: "Foreign Policy", guns: "Gun Policy",
  immigration: "Immigration", education: "Education", freedom: "Personal Freedom",
  housing: "Housing & Urban", voting: "Electoral Rights", criminal: "Criminal Justice",
};

const FILTERS = ["All", "Healthcare", "Climate & Energy", "Economic Policy", "Tech & Privacy", "Foreign Policy"];

function ThroughlineLine({ vote }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "12px 0" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, flexShrink: 0 }} />
      <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.2)", position: "relative", overflow: "hidden", margin: "0 2px" }}>
        <div style={{ position: "absolute", top: -4, width: 9, height: 9, borderRadius: "50%", background: C.gold, animation: "tlTravel 2.8s ease-in-out infinite" }} />
      </div>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: vote === "YES" ? C.green : C.red, flexShrink: 0 }} />
    </div>
  );
}

function StoryCard({ story, index }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const partyColor = story.party === "D" ? C.blue : story.party === "R" ? C.red : C.purple;
  const voteColor = story.vote === "YES" ? C.green : C.red;
  const photoUrl = `https://bioguide.congress.gov/bioguide/photo/${story.bioguide_id[0]}/${story.bioguide_id}.jpg`;
  const initials = story.politician.split(" ").map(w => w[0]).slice(0, 2).join("");
  const dasColor = story.das <= 33 ? C.green : story.das <= 66 ? C.gold : C.red;

  return (
    <div className="story-card"
      style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 4, overflow: "hidden", animation: `fadeSlideIn 0.4s ease forwards ${index * 0.08}s`, opacity: 0 }}
    >
      {/* Color strip */}
      <div style={{ height: 3, background: story.dimensionColor }} />

      <div style={{ padding: "16px 18px" }}>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <div onClick={() => router.push(`/politician/${story.slug}`)}
              style={{ width: 40, height: 40, borderRadius: "50%", background: partyColor + "22", color: partyColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 13, flexShrink: 0, overflow: "hidden", border: `1.5px solid ${partyColor}40`, cursor: "pointer" }}
            >
              <img src={photoUrl} alt={story.politician} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} onError={e => { e.target.style.display = "none"; }} />
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 700, fontSize: 14, color: C.parchment, cursor: "pointer" }} onClick={() => router.push(`/politician/${story.slug}`)}>{story.politician}</div>
              <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 11, color: C.parchmentDim }}>{story.party} · {story.state}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, letterSpacing: "0.15em", padding: "3px 8px", borderRadius: 2, background: story.dimensionColor + "18", color: story.dimensionColor, border: `1px solid ${story.dimensionColor}30` }}>
              {DIMENSION_LABELS[story.dimension] || story.dimension}
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 8, letterSpacing: "0.1em", color: C.parchmentDim, textTransform: "uppercase" }}>DAS</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 16, color: dasColor, lineHeight: 1 }}>{story.das}</div>
            </div>
          </div>
        </div>

        {/* Headline */}
        <p style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 15, color: C.parchment, lineHeight: 1.65, marginBottom: 14 }}>
          {story.headline}
        </p>

        {/* Throughline visualization */}
        <div style={{ background: C.bgDeep, borderRadius: 4, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <div>
              <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, color: C.parchmentDim, marginBottom: 2 }}>Donation received</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, color: C.gold }}>{story.amount} from {story.industry}</div>
              <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, color: C.parchmentDim }}>{story.donationDate}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, color: C.parchmentDim, marginBottom: 2 }}>Vote cast</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 16, color: voteColor }}>VOTED {story.vote}</div>
              <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, color: C.parchmentDim }}>{story.voteDate}</div>
            </div>
          </div>
          <ThroughlineLine vote={story.vote} />
          <div style={{ textAlign: "center", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 12, color: C.gold, letterSpacing: "0.1em" }}>
            {story.daysBetween} DAYS LATER
          </div>
        </div>

        {/* Expandable impact */}
        {expanded && (
          <div style={{ marginBottom: 12, padding: "10px 14px", background: C.bgDeep, borderRadius: 4, borderLeft: `3px solid ${story.dimensionColor}`, animation: "fadeSlideIn 0.2s ease forwards" }}>
            <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, color: C.parchmentDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>What this vote did</div>
            <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 13, color: C.parchment, lineHeight: 1.65 }}>{story.impact}</div>
            <div style={{ marginTop: 10, fontFamily: "'Figtree',sans-serif", fontSize: 11, color: C.parchmentDim }}>Bill: <span style={{ color: C.parchment }}>{story.bill}</span></div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${C.goldBorderDim}` }}>
          <button onClick={() => setExpanded(e => !e)}
            style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 600, fontSize: 12, color: expanded ? C.gold : C.parchmentDim, background: "transparent", border: `1px solid ${expanded ? C.goldBorder : "rgba(255,255,255,0.1)"}`, borderRadius: 4, padding: "6px 12px", cursor: "pointer", transition: "all 0.15s" }}
          >{expanded ? "▲ Less" : "▼ See the impact"}</button>
          <button onClick={() => router.push(`/politician/${story.slug}`)}
            style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", color: "#0a0b0d", background: C.gold, border: "none", borderRadius: 4, padding: "7px 16px", cursor: "pointer" }}
          >VIEW RECEIPT →</button>
        </div>

      </div>
    </div>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = activeFilter === "All"
    ? MOCK_STORIES
    : MOCK_STORIES.filter(s => DIMENSION_LABELS[s.dimension] === activeFilter);

  // If logged in, prioritize followed politicians
  const sorted = user && profile?.followed_politicians?.length
    ? [...filtered].sort((a, b) => {
        const aFollowed = profile.followed_politicians.includes(a.slug);
        const bFollowed = profile.followed_politicians.includes(b.slug);
        if (aFollowed && !bFollowed) return -1;
        if (!aFollowed && bFollowed) return 1;
        return 0;
      })
    : filtered;

  return (
    <>
      <Head>
        <title>Your Feed · Throughline</title>
        <meta name="description" content="Stories from the politicians you follow — donations, votes, and the throughlines between them." />
      </Head>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ minHeight: "100vh", background: C.bg, color: C.parchment }}>

        {/* NAV */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${C.goldBorderDim}`, position: "sticky", top: 0, background: C.bg, zIndex: 100 }}>
          <button onClick={() => router.push("/")} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: "0.12em", color: C.gold, background: "none", border: "none", cursor: "pointer" }}>THROUGHLINE</button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {user ? (
              <>
                <button onClick={() => router.push("/profile")} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", color: C.gold, background: "transparent", border: `2px solid ${C.goldBorder}`, borderRadius: 2, padding: "6px 14px", cursor: "pointer" }}>MY PROFILE</button>
                <button onClick={() => router.push("/quiz")} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", color: C.parchment, background: "transparent", border: `2px solid rgba(255,255,255,0.2)`, borderRadius: 2, padding: "6px 14px", cursor: "pointer" }}>TAKE THE QUIZ</button>
                <button onClick={signOut} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", color: C.parchmentDim, background: "transparent", border: `2px solid rgba(255,255,255,0.15)`, borderRadius: 2, padding: "6px 14px", cursor: "pointer" }}>SIGN OUT</button>
              </>
            ) : (
              <>
                <button onClick={() => router.push("/")} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", color: C.parchmentDim, background: "transparent", border: `2px solid rgba(255,255,255,0.15)`, borderRadius: 2, padding: "6px 14px", cursor: "pointer" }}>SIGN IN</button>
                <button onClick={() => router.push("/quiz")} style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", color: "#0a0b0d", background: C.gold, border: "none", borderRadius: 2, padding: "6px 14px", cursor: "pointer" }}>TAKE THE QUIZ</button>
              </>
            )}
          </div>
        </nav>

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}>

          {/* Header */}
          <div style={{ marginBottom: 32, animation: "fadeSlideIn 0.5s ease forwards" }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, letterSpacing: "0.35em", color: C.gold, marginBottom: 10 }}>
              {user ? "YOUR FEED" : "LATEST THROUGHLINES"}
            </div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: "clamp(22px,4.5vw,32px)", color: C.parchment, lineHeight: 1.2, marginBottom: 10 }}>
              {user
                ? "Every vote has a price.\nHere's your receipt."
                : "Follow the money. See every vote."}
            </h1>
            <p style={{ fontFamily: "'Figtree',sans-serif", fontSize: 13, color: C.parchmentDim, lineHeight: 1.7 }}>
              {user && profile?.followed_politicians?.length
                ? `Stories from the ${profile.followed_politicians.length} politician${profile.followed_politicians.length > 1 ? "s" : ""} you follow — ranked by your values.`
                : "Every time a donation lands and a vote follows, we draw the line. No spin. Just the receipt."}
            </p>
          </div>

          {/* Personalization prompt if not logged in */}
          {!user && (
            <div style={{ marginBottom: 28, padding: "16px 20px", background: C.bgCard, border: `1px solid ${C.goldBorder}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 700, fontSize: 14, color: C.parchment, marginBottom: 4 }}>Make this feed yours.</div>
                <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 12, color: C.parchmentDim }}>Take the quiz to see stories ranked by your values. Follow politicians to get their updates first.</div>
              </div>
              <button onClick={() => router.push("/quiz")}
                style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 800, fontSize: 13, color: C.bg, background: C.gold, border: "none", borderRadius: 4, padding: "10px 22px", cursor: "pointer", flexShrink: 0 }}
              >Take the Quiz →</button>
            </div>
          )}

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 600, fontSize: 12, color: activeFilter === f ? C.bg : C.parchmentDim, background: activeFilter === f ? C.gold : "transparent", border: `1px solid ${activeFilter === f ? C.gold : "rgba(201,168,76,0.2)"}`, borderRadius: 20, padding: "5px 14px", cursor: "pointer", transition: "all 0.15s ease" }}
              >{f}</button>
            ))}
          </div>

          {/* Story count */}
          <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 12, color: C.parchmentDim, marginBottom: 20 }}>
            {sorted.length} {sorted.length === 1 ? "story" : "stories"} · Mock data — real FEC data coming soon
          </div>

          {/* Story cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {sorted.map((story, i) => (
              <StoryCard key={story.id} story={story} index={i} />
            ))}
          </div>

          {/* Bottom CTA */}
          <div style={{ marginTop: 48, padding: 24, background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 4, textAlign: "center" }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.12em", color: C.gold, marginBottom: 8 }}>MORE STORIES COMING</div>
            <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 13, color: C.parchmentDim, lineHeight: 1.7, marginBottom: 18 }}>
              We're processing FEC data for all 538 members of Congress. When it's live, your feed will update in real time — every donation, every vote, every throughline.
            </div>
            <button onClick={() => router.push("/")}
              style={{ fontFamily: "'Figtree',sans-serif", fontWeight: 700, fontSize: 13, color: C.bg, background: C.gold, border: "none", borderRadius: 4, padding: "11px 28px", cursor: "pointer" }}
            >Browse All Politicians →</button>
          </div>

        </div>
      </div>
    </>
  );
}
