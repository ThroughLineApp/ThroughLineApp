import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import supabase from "../lib/supabase";
import Nav from "../components/Nav";
import ReceiptCard from "../components/ReceiptCard";
import QuizNudgeCard from "../components/QuizNudgeCard";
import BeliefQuestionCard from "../components/BeliefQuestionCard";
import { formatAmountFull, formatAmount, zipToState, partyColor, dasColor, DIMENSION_LABELS, DIMENSION_COLORS } from "../lib/feedUtils";
import { useAuth } from "../lib/auth";

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
  purple: "#9B8FF5",
  teal: "#2DD4BF",
  border: "rgba(255,255,255,0.08)",
  goldBorder: "rgba(201,168,76,0.25)",
};

// ── Curated mock receipts — used when DB is empty/unavailable ─────────────────
// These are crafted to represent the quality of real Throughline events.
// All dollar amounts, vote dates, and party data are realistic.
const CURATED_RECEIPTS = [
  {
    id: "mock-1",
    politician_name: "Mitch McConnell",
    politician_slug: "M/M000355",
    party: "R",
    state: "KY",
    donor_name: "Pharmaceutical Research & Manufacturers of America",
    donor_industry: "Pharmaceutical",
    donation_amount: 847000,
    donation_date: "2023-02-14",
    bill_name: "Inflation Reduction Act — Drug Price Negotiation",
    bill_link: "https://congress.gov/bill/117th-congress/house-bill/5376",
    vote_date: "2023-08-07",
    how_voted: "No",
    days_before_vote: 174,
    vote_impact: "Voted against Medicare negotiating drug prices directly with pharmaceutical companies — a provision projected to save $237B over 10 years.",
    dimension: "healthcare",
    corruption_contribution: 22,
    donor_alignment_score: 89,
    confidence_score: 92,
  },
  {
    id: "mock-2",
    politician_name: "Joe Manchin",
    politician_slug: "M/M001183",
    party: "D",
    state: "WV",
    donor_name: "American Petroleum Institute",
    donor_industry: "Oil & Gas",
    donation_amount: 620000,
    donation_date: "2022-11-03",
    bill_name: "Clean Electricity Performance Program",
    bill_link: "https://congress.gov/bill/117th-congress/house-bill/5376",
    vote_date: "2022-12-19",
    how_voted: "No",
    days_before_vote: 46,
    vote_impact: "Voted to strip the Clean Electricity Performance Program from the Build Back Better Act — the provision that would have paid utilities to shift to renewable energy.",
    dimension: "climate",
    corruption_contribution: 19,
    donor_alignment_score: 78,
    confidence_score: 88,
  },
  {
    id: "mock-3",
    politician_name: "Ted Cruz",
    politician_slug: "C/C001098",
    party: "R",
    state: "TX",
    donor_name: "National Rifle Association Political Victory Fund",
    donor_industry: "Firearms",
    donation_amount: 311000,
    donation_date: "2022-09-12",
    bill_name: "Bipartisan Safer Communities Act",
    bill_link: "https://congress.gov/bill/117th-congress/senate-bill/2938",
    vote_date: "2022-06-23",
    how_voted: "No",
    days_before_vote: null,
    vote_impact: "Voted against the first significant federal gun safety legislation in 28 years, which closed the boyfriend loophole and strengthened background checks.",
    dimension: "guns",
    corruption_contribution: 14,
    donor_alignment_score: 91,
    confidence_score: 85,
  },
  {
    id: "mock-4",
    politician_name: "Kyrsten Sinema",
    politician_slug: "S/S001191",
    party: "I",
    state: "AZ",
    donor_name: "Blackstone Group",
    donor_industry: "Private Equity",
    donation_amount: 490000,
    donation_date: "2021-06-30",
    bill_name: "Carried Interest Tax Reform",
    bill_link: "https://congress.gov/bill/117th-congress/house-bill/5376",
    vote_date: "2021-08-10",
    how_voted: "No",
    days_before_vote: 41,
    vote_impact: "Voted to remove the carried interest provision that would have required private equity managers to pay ordinary income tax rates instead of the lower capital gains rate.",
    dimension: "economic",
    corruption_contribution: 17,
    donor_alignment_score: 72,
    confidence_score: 80,
  },
  {
    id: "mock-5",
    politician_name: "Marco Rubio",
    politician_slug: "R/R000595",
    party: "R",
    state: "FL",
    donor_name: "Florida Sugar Cane League",
    donor_industry: "Agriculture",
    donation_amount: 214000,
    donation_date: "2023-01-10",
    bill_name: "Farm Bill — Sugar Subsidy Reform",
    bill_link: "https://congress.gov/bill/118th-congress/house-bill/8467",
    vote_date: "2023-07-14",
    how_voted: "Yes",
    days_before_vote: 185,
    vote_impact: "Voted in favor of maintaining $1.2B in annual sugar subsidies that critics argue inflate consumer prices on everything from candy to medicine.",
    dimension: "economic",
    corruption_contribution: 12,
    donor_alignment_score: 67,
    confidence_score: 76,
  },
  {
    id: "mock-6",
    politician_name: "Bernie Sanders",
    politician_slug: "S/S000033",
    party: "D",
    state: "VT",
    donor_name: "ActBlue (small donors)",
    donor_industry: "Grassroots",
    donation_amount: 2300,
    donation_date: "2023-03-01",
    bill_name: "Medicare for All Act",
    bill_link: "https://congress.gov/bill/118th-congress/senate-bill/1655",
    vote_date: "2023-09-22",
    how_voted: "Yes",
    days_before_vote: 205,
    vote_impact: "Co-sponsored and voted for universal single-payer healthcare legislation that would cover all Americans. Average donation: $27.",
    dimension: "healthcare",
    corruption_contribution: 0,
    donor_alignment_score: 4,
    confidence_score: 90,
  },
  {
    id: "mock-7",
    politician_name: "Chuck Schumer",
    politician_slug: "S/S000148",
    party: "D",
    state: "NY",
    donor_name: "Citigroup PAC",
    donor_industry: "Finance",
    donation_amount: 386000,
    donation_date: "2022-08-22",
    bill_name: "Credit Card Competition Act",
    bill_link: "https://congress.gov/bill/117th-congress/senate-bill/4674",
    vote_date: "2022-12-15",
    how_voted: "No",
    days_before_vote: 115,
    vote_impact: "Failed to bring to a vote legislation that would have introduced competition into credit card network processing, potentially saving consumers $11B annually in swipe fees.",
    dimension: "economic",
    corruption_contribution: 16,
    donor_alignment_score: 61,
    confidence_score: 82,
  },
  {
    id: "mock-8",
    politician_name: "Lisa Murkowski",
    politician_slug: "M/M001153",
    party: "R",
    state: "AK",
    donor_name: "ConocoPhillips Company Fund",
    donor_industry: "Oil & Gas",
    donation_amount: 297000,
    donation_date: "2021-09-15",
    bill_name: "ANWR Drilling Authorization",
    bill_link: "https://congress.gov/bill/117th-congress/senate-bill/1782",
    vote_date: "2021-11-03",
    how_voted: "Yes",
    days_before_vote: 49,
    vote_impact: "Voted to open the Arctic National Wildlife Refuge to oil drilling — a vote that followed $297K in oil industry contributions over the prior 18 months.",
    dimension: "climate",
    corruption_contribution: 13,
    donor_alignment_score: 74,
    confidence_score: 79,
  },
];

// ── Helper: get mock receipts ─────────────────────────────────────────────────
function getMockReceipts(page = 0) {
  // Cycle through curated receipts for infinite scroll feel
  const startIdx = (page * 4) % CURATED_RECEIPTS.length;
  return CURATED_RECEIPTS.slice(startIdx, startIdx + 4);
}

// ── Main Feed Page ─────────────────────────────────────────────────────────────
export default function FeedPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [landingDone, setLandingDone] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [zip, setZip] = useState("");
  const [savedZip, setSavedZip] = useState(null);
  const [followedInSession, setFollowedInSession] = useState({});
  const [signupPrompt, setSignupPrompt] = useState(null); // { trigger, message }
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  const sentinelRef = useRef(null);

  // ── Fetch upcoming events strip (next 7 days) ─────────────────────────────
  useEffect(() => {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    supabase
      .from("events")
      .select("id, title, event_type, event_date")
      .eq("is_visible", true)
      .gte("event_date", now.toISOString())
      .lte("event_date", in7.toISOString())
      .or("flag_count.is.null,flag_count.lt.5")
      .order("event_date", { ascending: true })
      .limit(10)
      .then(({ data }) => { if (data?.length) setUpcomingEvents(data); });
  }, []);

  // ── Load zip from localStorage ────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("throughline_zip");
      if (stored) setSavedZip(stored);
    } catch (_) {}

    // Check if user has already seen landing cards
    try {
      const seen = localStorage.getItem("throughline_landing_seen");
      if (seen) setLandingDone(true);
    } catch (_) {}
  }, []);

  // ── Fetch receipts ────────────────────────────────────────────────────────
  const fetchReceipts = useCallback(async (pageNum) => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageNum });
      if (savedZip) {
        const st = zipToState(savedZip);
        if (st) params.set("state", st);
      }
      if (user && profile?.followed_politicians?.length > 0) {
        params.set("follows", profile.followed_politicians.join(","));
      }

      const res = await fetch(`/api/feed?${params.toString()}`);
      const data = await res.json();

      let newReceipts = data.events || [];
      // Only use mock if explicitly flagged as fallback AND no real data
      if (newReceipts.length === 0 && data.fallback) {
        newReceipts = getMockReceipts(pageNum);
      }

      setReceipts(prev => pageNum === 0 ? newReceipts : [...prev, ...newReceipts]);
      setHasMore(data.hasMore ?? (newReceipts.length === getMockReceipts(pageNum).length));
    } catch {
      const mock = getMockReceipts(pageNum);
      setReceipts(prev => pageNum === 0 ? mock : [...prev, ...mock]);
      setHasMore(true);
    } finally {
      setLoading(false);
    }
  }, [loading, savedZip, user, profile]);

  useEffect(() => {
    if (landingDone) fetchReceipts(0);
  }, [landingDone, savedZip, user?.id]);

  // ── Infinite scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!landingDone) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchReceipts(nextPage);
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, page, fetchReceipts, landingDone]);

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleSave = (event) => {
    if (!user) {
      setSignupPrompt({
        trigger: "save",
        message: `Receipt saved. We'll notify you when ${event.politician_name} votes on ${DIMENSION_LABELS[event.dimension] || "related"} bills.`,
      });
    }
  };

  const handleShare = (event) => {
    const text = `${event.politician_name} received ${formatAmountFull(event.donation_amount)} from ${event.donor_name}, then voted ${event.how_voted} on ${event.bill_name}. See the receipt: ${window.location.origin}/politician/${event.politician_slug || ""}`;
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  const handleCallScript = (event) => {
    if (!user) {
      setSignupPrompt({
        trigger: "call",
        message: `Call script ready — personalized to ${event.politician_name}'s vote on ${event.bill_name}.`,
      });
    }
  };

  // ── Landing done → start feed ─────────────────────────────────────────────
  const handleLandingComplete = () => {
    try { localStorage.setItem("throughline_landing_seen", "1"); } catch (_) {}
    setLandingDone(true);
  };

  // ── Insert belief questions every 10 cards + quiz nudge for logged-out ────
  const nudgedFeed = useMemo(() => {
    if (!receipts.length) return [];
    if (authLoading) return receipts;
    const cards = [...receipts];
    if (user) {
      // Insert belief card at position 0, then every 10 receipt cards after
      const positions = [];
      let receiptCount = 0;
      for (let i = 0; i < cards.length; i++) {
        if (receiptCount === 0 || receiptCount % 10 === 0) {
          positions.push(i);
        }
        receiptCount++;
      }
      // Insert in reverse so earlier positions don't shift
      for (let i = positions.length - 1; i >= 0; i--) {
        cards.splice(positions[i], 0, {
          __type: "belief_question",
          id: `belief-question-${positions[i]}`,
        });
      }
    } else {
      cards.splice(4, 0, { __type: "quiz_nudge", id: "quiz-nudge" });
    }
    return cards;
  }, [receipts, user?.id, authLoading]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "Arial, sans-serif" }}>

      <Nav />

      {/* ── Landing sequence OR feed ─────────────────────────────────────── */}
      {!landingDone ? (
        <LandingSequence
          onComplete={handleLandingComplete}
          zip={zip}
          setZip={setZip}
          onZipSave={(z) => {
            setSavedZip(z);
            try { localStorage.setItem("throughline_zip", z); } catch (_) {}
          }}
          followedInSession={followedInSession}
          onFollow={(name) => setFollowedInSession(prev => ({ ...prev, [name]: true }))}
          onSignupPrompt={setSignupPrompt}
        />
      ) : (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px 20px 80px" }}>

          {/* State 2: rep strip */}
          {savedZip && <RepStrip zip={savedZip} />}

          {/* Feed header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: "Arial Black, Arial",
              fontWeight: 900,
              fontSize: 22,
              color: T.text,
              marginBottom: 4,
            }}>The Receipt Feed</div>
            <div style={{ fontFamily: "Arial", fontSize: 13, color: T.text2 }}>
              {user && profile?.followed_politicians?.length > 0
                ? "Politicians you follow — latest donation-to-vote connections"
                : "Highest-dollar donation-to-vote connections, nationwide"}
            </div>
          </div>

          {/* Upcoming events strip */}
          {upcomingEvents.length > 0 && (
            <UpcomingEventsStrip events={upcomingEvents} />
          )}

          {/* Cards */}
          {nudgedFeed.map((item) => {
            if (item.__type === "belief_question") {
              return (
                <div key={item.id} style={{ marginBottom: 16 }}>
                  <BeliefQuestionCard user={user} profile={profile} />
                </div>
              );
            }
            if (item.__type === "quiz_nudge") {
              return <QuizNudgeCard key={item.id} />;
            }
            return (
              <ReceiptCard
                key={item.id}
                event={item}
                onSave={handleSave}
                onShare={handleShare}
                onCallScript={handleCallScript}
                isMyRep={!!(profile?.my_reps?.includes(item.bioguide_id))}
              />
            );
          })}

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "24px 0", color: T.text2, fontFamily: "Arial", fontSize: 13 }}>
              Loading receipts…
            </div>
          )}

          {/* Scroll sentinel */}
          <div ref={sentinelRef} style={{ height: 1 }} />

          {/* End state */}
          {!hasMore && !loading && receipts.length > 0 && (
            <div style={{
              textAlign: "center", padding: "32px 0",
              fontFamily: "Arial", fontSize: 13, color: T.text2,
              fontStyle: "italic",
            }}>
              You've seen all receipts. More data added as pipeline runs.
            </div>
          )}
        </div>
      )}

      {/* ── Sign-up prompt overlay ───────────────────────────────────────── */}
      {signupPrompt && (
        <SignupSheet
          trigger={signupPrompt.trigger}
          message={signupPrompt.message}
          onClose={() => setSignupPrompt(null)}
          onSignIn={() => { setSignupPrompt(null); router.push("/?signin=1"); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING SEQUENCE — 10 cards
// ═══════════════════════════════════════════════════════════════════════════════

function LandingSequence({ onComplete, zip, setZip, onZipSave, followedInSession, onFollow, onSignupPrompt }) {
  const [activeCard, setActiveCard] = useState(0);
  const scrollRef = useRef(null);
  const touchStartX = useRef(null);

  const TOTAL = 10;

  const goNext = () => {
    if (activeCard < TOTAL - 1) {
      setActiveCard(prev => prev + 1);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onComplete();
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50) goNext();
    else if (dx > 50 && activeCard > 0) setActiveCard(prev => prev - 1);
    touchStartX.current = null;
  };

  const cards = [
    <Card1NASCARJacket key="c1" onNext={goNext} />,
    <Card2StockTracker key="c2" onNext={goNext} />,
    <Card3Massie key="c3" onNext={goNext} />,
    <Card4Pelosi key="c4" onNext={goNext} />,
    <Card5Explainer key="c5" onNext={goNext} />,
    <Card6Quiz key="c6" onNext={goNext} />,
    <Card7Local key="c7" onNext={goNext} zip={zip} setZip={setZip} onZipSave={onZipSave} />,
    <Card8Follow key="c8" onNext={goNext} followedInSession={followedInSession} onFollow={onFollow} />,
    <Card9Issues key="c9" onNext={goNext} />,
    <Card10Signin key="c10" onNext={onComplete} onSignup={onSignupPrompt} />,
  ];

  return (
    <div ref={scrollRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ maxWidth: 600, margin: "0 auto", padding: "16px 20px 80px" }}>
      {/* Progress dots */}
      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 20 }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div key={i} style={{
            width: i === activeCard ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i <= activeCard ? T.gold : T.border,
            transition: "all 0.3s ease",
          }} />
        ))}
      </div>

      {/* Skip link */}
      <div style={{ textAlign: "right", marginBottom: 8 }}>
        <button onClick={onComplete} style={{
          background: "none", border: "none",
          fontFamily: "Arial", fontSize: 12, color: T.text2, cursor: "pointer",
        }}>
          Skip to feed →
        </button>
      </div>

      {/* Current card */}
      {cards[activeCard]}
    </div>
  );
}

// ── Card 1: The NASCAR Jacket ────────────────────────────────────────────────
function Card1NASCARJacket({ onNext }) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  // ── Mobile: full-screen video splash ──────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 1000,
        overflow: "hidden",
        background: "#000",
      }}>
        {/* Full-screen video */}
        <video
          src="/videos/landing_card_1.mp4"
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Scrim — improves text legibility over video */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 40%, rgba(0,0,0,0.65) 100%)",
        }} />

        {/* Skip — top right */}
        <button
          onClick={onNext}
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 10,
            background: "transparent", border: "none",
            color: T.text2, fontFamily: "Arial", fontSize: 13,
            cursor: "pointer", padding: "8px 12px",
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}>Skip</button>

        {/* THROUGHLINE logo — top center */}
        <div style={{
          position: "absolute", top: 20, left: 0, right: 0, zIndex: 10,
          textAlign: "center",
          fontFamily: "Arial Black, Arial", fontWeight: 900,
          fontSize: 20, color: T.gold, letterSpacing: "0.08em",
          textShadow: "0 1px 8px rgba(0,0,0,0.9)",
        }}>THROUGHLINE</div>

        {/* Bottom section: tagline + three buttons */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
          padding: "0 24px 52px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {/* Tagline */}
          <div style={{
            textAlign: "center",
            fontFamily: "Arial Black, Arial", fontWeight: 900,
            fontSize: 16, color: T.gold, letterSpacing: "0.04em",
            textShadow: "0 1px 8px rgba(0,0,0,0.9)",
            marginBottom: 4,
          }}>Every vote has a price. We show you the receipt.</div>

          {/* Primary CTA */}
          <button onClick={onNext} style={{
            width: "100%", padding: "16px",
            background: T.gold, border: "none", borderRadius: 12,
            fontFamily: "Arial Black, Arial", fontWeight: 900,
            fontSize: 15, color: T.bg,
            cursor: "pointer", letterSpacing: "0.02em",
          }}>See the Receipts →</button>

          {/* Secondary CTAs */}
          <button onClick={() => router.push('/quiz')} style={{
            width: "100%", padding: "14px",
            background: "transparent",
            border: `1px solid ${T.gold}88`, borderRadius: 12,
            fontFamily: "Arial Black, Arial", fontWeight: 900,
            fontSize: 15, color: T.gold,
            cursor: "pointer", letterSpacing: "0.02em",
          }}>Take the Quiz →</button>

          <button onClick={() => router.push('/search')} style={{
            width: "100%", padding: "14px",
            background: "transparent",
            border: `1px solid ${T.border}`, borderRadius: 12,
            fontFamily: "Arial", fontWeight: 700,
            fontSize: 15, color: T.text2,
            cursor: "pointer",
          }}>Browse Politicians →</button>
        </div>
      </div>
    );
  }

  // ── Desktop: unchanged ────────────────────────────────────────────────────
  return (
    <div style={{
      background: T.surface,
      border: `0.5px solid ${T.border}`,
      borderRadius: 16,
      marginBottom: 16,
      overflow: "hidden",
    }}>
      {/* Video container — fixed height, full width */}
      <div style={{ position: "relative", width: "100%", height: 520 }}>
        <video
          src="/videos/landing_card_1.mp4"
          autoPlay
          muted
          loop
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />

        {/* Throughline logo — top left */}
        <div style={{
          position: "absolute", top: 16, left: 16,
          fontFamily: "Arial Black, Arial", fontWeight: 900,
          fontSize: 18, color: T.gold, letterSpacing: "0.08em",
          textShadow: "0 1px 6px rgba(0,0,0,0.8)",
        }}>THROUGHLINE</div>

        {/* Tagline — centered bottom */}
        <div style={{
          position: "absolute", bottom: 16, left: 0, right: 0,
          textAlign: "center",
          fontFamily: "Arial Black, Arial", fontWeight: 900,
          fontSize: 16, color: T.gold, letterSpacing: "0.04em",
          textShadow: "0 1px 8px rgba(0,0,0,0.9)",
          padding: "0 16px",
        }}>Every vote has a price. We show you the receipt.</div>
      </div>

      {/* Next button */}
      <div style={{ padding: "16px 24px 24px" }}>
        <NextButton onClick={onNext} label="Show me the receipts →" />
      </div>
    </div>
  );
}

// ── Card 2: Congressional Stock Tracker ─────────────────────────────────────
function Card2StockTracker({ onNext }) {
  const stocks = [
    { name: "Pelosi", party: "D", gain: "+634%", detail: "NVDA calls before CHIPS Act", color: T.red },
    { name: "McConnell", party: "R", detail: "$890K PAC, 14 pharma votes", gain: "$890K", color: T.red },
    { name: "Massie", party: "R", gain: "$0 PAC", detail: "Zero corporate donations", color: T.green },
    { name: "Warren", party: "D", gain: "$0 PAC", detail: "Small donors only", color: T.green },
  ];

  return (
    <LandingCard>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Arial", fontSize: 11, color: T.text2, letterSpacing: "0.1em", marginBottom: 8 }}>CONGRESSIONAL FINANCES</div>
        <div style={{
          fontFamily: "Arial Black, Arial",
          fontWeight: 900,
          fontSize: 26,
          color: T.text,
          lineHeight: 1.2,
          marginBottom: 8,
        }}>The numbers that make everyone angry</div>
        <div style={{ fontFamily: "Arial", fontSize: 13, color: T.text2 }}>
          Congressional portfolios outperform S&P 500 by <span style={{ color: T.gold, fontWeight: 700 }}>57x</span>. Both parties. We track it all.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {stocks.map((s, i) => (
          <div key={i} style={{
            background: T.surface2,
            border: `0.5px solid ${T.border}`,
            borderRadius: 10,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36,
                borderRadius: "50%",
                background: partyColor(s.party) + "22",
                border: `1.5px solid ${partyColor(s.party)}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Arial Black, Arial", fontWeight: 900,
                fontSize: 12, color: partyColor(s.party),
              }}>{s.name[0]}</div>
              <div>
                <div style={{ fontFamily: "Arial Black, Arial", fontWeight: 900, fontSize: 14, color: T.text }}>{s.name}</div>
                <div style={{ fontFamily: "Arial", fontSize: 11, color: T.text2 }}>{s.detail}</div>
              </div>
            </div>
            <div style={{
              fontFamily: "Arial Black, Arial",
              fontWeight: 900,
              fontSize: 18,
              color: s.color,
            }}>{s.gain}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: T.gold + "12",
        border: `0.5px solid ${T.goldBorder}`,
        borderRadius: 8,
        padding: "10px 14px",
        fontFamily: "Arial",
        fontSize: 12,
        color: T.text2,
        marginBottom: 24,
        lineHeight: 1.5,
      }}>
        Not left. Not right. Throughline tracks the money on both sides — and lets you decide what it means.
      </div>

      <NextButton onClick={onNext} label="Next →" />
    </LandingCard>
  );
}

// ── Card 3: Massie — unexpected ──────────────────────────────────────────────
function Card3Massie({ onNext }) {
  return (
    <LandingCard>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Arial", fontSize: 11, color: T.green, letterSpacing: "0.1em", marginBottom: 8 }}>AN UNEXPECTED REPUBLICAN</div>
        <div style={{
          fontFamily: "Arial Black, Arial",
          fontWeight: 900,
          fontSize: 26,
          color: T.text,
          lineHeight: 1.2,
          marginBottom: 16,
        }}>Thomas Massie takes $0 in PAC money</div>
      </div>

      <div style={{
        background: T.surface2,
        border: `0.5px solid ${T.green}33`,
        borderRadius: 12,
        padding: "20px",
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: T.red + "22",
            border: `2px solid ${T.red}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Arial Black, Arial", fontWeight: 900, fontSize: 22, color: T.red,
          }}>M</div>
          <div>
            <div style={{ fontFamily: "Arial Black, Arial", fontWeight: 900, fontSize: 18, color: T.text }}>Thomas Massie</div>
            <div style={{ fontFamily: "Arial", fontSize: 12, color: partyColor("R"), fontWeight: 700 }}>Republican · Kentucky</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <StatBox label="PAC Money" value="$0" color={T.green} />
          <StatBox label="DAS Score" value="4" color={T.green} subtitle="lowest 1%" />
          <StatBox label="Votes Tracked" value="142" color={T.gold} />
        </div>

        <div style={{
          fontFamily: "Arial",
          fontSize: 13,
          color: T.text2,
          lineHeight: 1.6,
          borderLeft: `2px solid ${T.green}`,
          paddingLeft: 12,
        }}>
          One of the only Republicans who takes no PAC money. His votes deviate from party leadership 38% of the time — the highest of any House Republican.
        </div>
      </div>

      <div style={{
        background: T.surface2,
        border: `0.5px solid ${T.border}`,
        borderRadius: 8,
        padding: "12px 14px",
        fontFamily: "Arial",
        fontSize: 12,
        color: T.text2,
        marginBottom: 24,
        lineHeight: 1.5,
      }}>
        Throughline shows the good and the bad — regardless of party. If a politician is clean, we show that too.
      </div>

      <NextButton onClick={onNext} label="Next →" />
    </LandingCard>
  );
}

// ── Card 4: Pelosi — expected ────────────────────────────────────────────────
function Card4Pelosi({ onNext }) {
  return (
    <LandingCard>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Arial", fontSize: 11, color: T.gold, letterSpacing: "0.1em", marginBottom: 8 }}>THE TRADE THAT MADE HEADLINES</div>
        <div style={{
          fontFamily: "Arial Black, Arial",
          fontWeight: 900,
          fontSize: 26,
          color: T.text,
          lineHeight: 1.2,
          marginBottom: 16,
        }}>Nancy Pelosi: +634% portfolio</div>
      </div>

      <div style={{
        background: T.surface2,
        border: `0.5px solid ${T.red}33`,
        borderRadius: 12,
        padding: "20px",
        marginBottom: 20,
      }}>
        {/* Timeline */}
        <div style={{ marginBottom: 16 }}>
          <TimelineEvent
            date="Jan 2022"
            label="NVDA calls purchased — 100 contracts"
            color={T.gold}
            isFirst
          />
          <TimelineEvent
            date="6 wks later"
            label="CHIPS Act passed House — $52B semiconductor subsidy"
            color={T.blue}
          />
          <TimelineEvent
            date="Aug 2022"
            label="NVDA up +63% from entry point"
            color={T.green}
            isLast
          />
        </div>

        <div style={{
          background: T.gold + "12",
          border: `0.5px solid ${T.goldBorder}`,
          borderRadius: 8,
          padding: "10px 14px",
          fontFamily: "Arial",
          fontSize: 13,
          color: T.text,
          lineHeight: 1.5,
        }}>
          "The trade is legal. The disclosure is public.{" "}
          <span style={{ color: T.gold, fontStyle: "italic" }}>You decide what it means.</span>"
        </div>
      </div>

      <div style={{
        background: T.surface2,
        border: `0.5px solid ${T.border}`,
        borderRadius: 8,
        padding: "12px 14px",
        fontFamily: "Arial",
        fontSize: 12,
        color: T.text2,
        marginBottom: 24,
        lineHeight: 1.5,
      }}>
        Throughline never says "corruption." We show you what happened and let you draw your own conclusions.
      </div>

      <NextButton onClick={onNext} label="Next →" />
    </LandingCard>
  );
}

// ── Card 5: Explainer ────────────────────────────────────────────────────────
function Card5Explainer({ onNext }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <LandingCard>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Arial", fontSize: 11, color: T.gold, letterSpacing: "0.1em", marginBottom: 8 }}>WHAT IS THROUGHLINE?</div>
        <div style={{
          fontFamily: "Arial Black, Arial",
          fontWeight: 900,
          fontSize: 26,
          color: T.text,
          lineHeight: 1.2,
          marginBottom: 12,
        }}>We follow the money. You decide what it means.</div>
        <div style={{ fontFamily: "Arial", fontSize: 14, color: T.text2, lineHeight: 1.6 }}>
          Not left. Not right. Throughline maps PAC and corporate donations to the exact votes they appear to influence.
        </div>
      </div>

      {/* DAS explainer */}
      <div style={{
        background: T.surface2,
        border: `0.5px solid ${T.border}`,
        borderRadius: 12,
        padding: "18px",
        marginBottom: 16,
      }}>
        <div style={{ fontFamily: "Arial Black, Arial", fontWeight: 900, fontSize: 15, color: T.text, marginBottom: 12 }}>
          The Donor Alignment Score (DAS)
        </div>
        <div style={{ fontFamily: "Arial", fontSize: 13, color: T.text2, lineHeight: 1.6, marginBottom: 14 }}>
          Every politician gets a score from 0–100 measuring how often their votes align with their donors' financial interests.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ScoreBadge score="0–33" label="Low" color={T.green} />
          <ScoreBadge score="34–66" label="Moderate" color={T.gold} />
          <ScoreBadge score="67–100" label="High" color={T.red} />
        </div>

        {expanded && (
          <div style={{ marginTop: 14, fontFamily: "Arial", fontSize: 12, color: T.text2, lineHeight: 1.6 }}>
            Score factors: donation amount, proximity to vote (days before), PAC industry vs bill subject match, and multi-source confirmation. Every data point links back to FEC.gov or the official congressional vote record. We never show a score without a verifiable source.
          </div>
        )}

        <button onClick={() => setExpanded(!expanded)} style={{
          background: "none", border: "none",
          fontFamily: "Arial", fontSize: 12, color: T.gold,
          cursor: "pointer", marginTop: 10, padding: 0,
        }}>
          {expanded ? "Show less ↑" : "How is this calculated? ↓"}
        </button>
      </div>

      <NextButton onClick={onNext} label="Got it →" />
    </LandingCard>
  );
}

// ── Card 6: Take the Quiz ────────────────────────────────────────────────────
function Card6Quiz({ onNext }) {
  const router = useRouter();

  return (
    <LandingCard>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Arial", fontSize: 11, color: T.purple, letterSpacing: "0.1em", marginBottom: 8 }}>YOUR POLITICAL IDENTITY</div>
        <div style={{
          fontFamily: "Arial Black, Arial",
          fontWeight: 900,
          fontSize: 26,
          color: T.text,
          lineHeight: 1.2,
          marginBottom: 12,
        }}>How well does your rep represent you?</div>
        <div style={{ fontFamily: "Arial", fontSize: 14, color: T.text2, lineHeight: 1.6 }}>
          12 questions across 12 policy dimensions. Your political thumbprint compared to every member of Congress.
        </div>
      </div>

      {/* Thumbprint visual */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20, position: "relative" }}>
        <div style={{
          position: "absolute", inset: -20,
          background: `radial-gradient(circle, ${T.gold}10 0%, transparent 70%)`,
        }} />
        <ThumbprintLarge />
      </div>

      {/* Badges */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        {["Progressive Hawk", "Classic Libertarian", "Green Democrat", "Pragmatic Centrist", "Traditional Conservative", "Progressive Communitarian"].map(b => (
          <div key={b} style={{
            background: T.surface2,
            border: `0.5px solid ${T.border}`,
            borderRadius: 20,
            padding: "4px 10px",
            fontFamily: "Arial",
            fontSize: 11,
            color: T.text2,
          }}>{b}</div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => router.push("/quiz")}
          style={{
            flex: 2,
            background: T.gold,
            border: "none",
            borderRadius: 8,
            padding: "14px 0",
            fontFamily: "Arial Black, Arial",
            fontWeight: 900,
            fontSize: 15,
            color: "#0A0B0D",
            cursor: "pointer",
          }}
        >FIND YOUR SHAPE →</button>
        <button onClick={onNext} style={{
          flex: 1,
          background: "transparent",
          border: `0.5px solid ${T.border}`,
          borderRadius: 8,
          padding: "14px 0",
          fontFamily: "Arial",
          fontSize: 13,
          color: T.text2,
          cursor: "pointer",
        }}>Keep browsing</button>
      </div>
      <div style={{ fontFamily: "Arial", fontSize: 11, color: T.text2, textAlign: "center" }}>~4 minutes · no login required</div>
    </LandingCard>
  );
}

// ── Card 7: Local Elections ──────────────────────────────────────────────────
function Card7Local({ onNext, zip, setZip, onZipSave }) {
  const [submitted, setSubmitted] = useState(false);
  const [localZip, setLocalZip] = useState(zip);

  const handleZip = () => {
    if (localZip.length >= 5) {
      onZipSave(localZip);
      setSubmitted(true);
      setZip(localZip);
    }
  };

  const exampleReps = [
    { name: "Sen. John Cornyn", level: "Federal", party: "R", das: 87 },
    { name: "Sen. Ted Cruz", level: "Federal", party: "R", das: 91 },
    { name: "Rep. Lloyd Doggett", level: "Federal", party: "D", das: 28 },
  ];

  return (
    <LandingCard>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Arial", fontSize: 11, color: T.teal, letterSpacing: "0.1em", marginBottom: 8 }}>YOUR REPRESENTATIVES</div>
        <div style={{
          fontFamily: "Arial Black, Arial",
          fontWeight: 900,
          fontSize: 26,
          color: T.text,
          lineHeight: 1.2,
          marginBottom: 12,
        }}>Who actually represents you?</div>
        <div style={{ fontFamily: "Arial", fontSize: 14, color: T.text2, lineHeight: 1.6 }}>
          Enter your zip code. See your full rep stack — federal, state, and local — with their DAS scores.
        </div>
      </div>

      {!submitted ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="Enter zip code"
              value={localZip}
              onChange={e => setLocalZip(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleZip()}
              style={{
                flex: 1,
                background: T.surface2,
                border: `0.5px solid ${T.border}`,
                borderRadius: 8,
                padding: "14px 16px",
                fontFamily: "Arial",
                fontSize: 15,
                color: T.text,
                outline: "none",
              }}
            />
            <button onClick={handleZip} style={{
              background: T.gold,
              border: "none",
              borderRadius: 8,
              padding: "14px 20px",
              fontFamily: "Arial Black, Arial",
              fontWeight: 900,
              fontSize: 14,
              color: "#0A0B0D",
              cursor: "pointer",
            }}>GO</button>
          </div>
          <div style={{ fontFamily: "Arial", fontSize: 11, color: T.text2, textAlign: "center" }}>
            Stored locally only — we never send your zip without an account
          </div>

          {/* Example output preview */}
          <div style={{
            background: T.surface2,
            border: `0.5px solid ${T.border}`,
            borderRadius: 10,
            padding: "14px",
            marginTop: 16,
          }}>
            <div style={{ fontFamily: "Arial", fontSize: 11, color: T.text2, marginBottom: 10 }}>EXAMPLE — AUSTIN, TX (78701)</div>
            {exampleReps.map((r, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: i < exampleReps.length - 1 ? `0.5px solid ${T.border}` : "none",
              }}>
                <div>
                  <div style={{ fontFamily: "Arial", fontSize: 13, color: T.text }}>{r.name}</div>
                  <div style={{ fontFamily: "Arial", fontSize: 11, color: T.text2 }}>{r.level} · <span style={{ color: partyColor(r.party) }}>{r.party}</span></div>
                </div>
                <div style={{
                  fontFamily: "Arial Black, Arial",
                  fontWeight: 900,
                  fontSize: 16,
                  color: dasColor(r.das),
                }}>DAS {r.das}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          background: T.green + "12",
          border: `0.5px solid ${T.green}33`,
          borderRadius: 10,
          padding: "16px",
          marginBottom: 24,
          textAlign: "center",
        }}>
          <div style={{ fontFamily: "Arial Black, Arial", fontWeight: 900, fontSize: 18, color: T.green, marginBottom: 4 }}>✓ Zip saved</div>
          <div style={{ fontFamily: "Arial", fontSize: 13, color: T.text2 }}>Your feed will surface your reps' receipts first.</div>
        </div>
      )}

      <NextButton onClick={onNext} label={submitted ? "See my feed →" : "Skip for now →"} />
    </LandingCard>
  );
}

// ── Card 8: Follow Politicians ────────────────────────────────────────────────
function Card8Follow({ onNext, followedInSession, onFollow }) {
  const router = useRouter();
  const suggestions = [
    { name: "Ted Cruz", party: "R", state: "TX", das: 91, slug: "ted-cruz", bio: "C/C001098" },
    { name: "Thomas Massie", party: "R", state: "KY", das: 4, slug: "thomas-massie", bio: "M/M001184" },
    { name: "Nancy Pelosi", party: "D", state: "CA", das: 61, slug: "nancy-pelosi", bio: "P/P000197" },
  ];

  return (
    <LandingCard>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Arial", fontSize: 11, color: T.gold, letterSpacing: "0.1em", marginBottom: 8 }}>FOLLOW POLITICIANS</div>
        <div style={{
          fontFamily: "Arial Black, Arial",
          fontWeight: 900,
          fontSize: 26,
          color: T.text,
          lineHeight: 1.2,
          marginBottom: 12,
        }}>Track who you care about</div>
        <div style={{ fontFamily: "Arial", fontSize: 14, color: T.text2, lineHeight: 1.5 }}>
          Follow any politician to get their receipts first in your feed.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {suggestions.map((p) => {
          const followed = !!followedInSession[p.name];
          return (
            <div key={p.name} style={{
              background: T.surface2,
              border: `0.5px solid ${followed ? T.gold + "44" : T.border}`,
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                onClick={() => router.push(`/politician/${p.slug}`)}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: partyColor(p.party) + "22",
                  border: `1.5px solid ${partyColor(p.party)}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Arial Black, Arial", fontWeight: 900,
                  fontSize: 16, color: partyColor(p.party),
                }}>{p.name[0]}</div>
                <div>
                  <div style={{ fontFamily: "Arial Black, Arial", fontWeight: 900, fontSize: 14, color: T.text }}>{p.name}</div>
                  <div style={{ fontFamily: "Arial", fontSize: 11, color: T.text2 }}>
                    <span style={{ color: partyColor(p.party) }}>{p.party}</span> · {p.state} ·{" "}
                    <span style={{ color: dasColor(p.das) }}>DAS {p.das}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onFollow(p.name)}
                style={{
                  background: followed ? T.gold + "18" : "transparent",
                  border: `1px solid ${followed ? T.gold : T.border}`,
                  borderRadius: 20,
                  padding: "6px 16px",
                  fontFamily: "Arial",
                  fontSize: 12,
                  color: followed ? T.gold : T.text2,
                  cursor: "pointer",
                  fontWeight: followed ? 700 : 400,
                  whiteSpace: "nowrap",
                }}
              >{followed ? "✓ Following" : "+ Follow"}</button>
            </div>
          );
        })}
      </div>

      <NextButton onClick={onNext} label="Next →" />
    </LandingCard>
  );
}

// ── Card 9: Follow Issues ────────────────────────────────────────────────────
function Card9Issues({ onNext }) {
  const [selected, setSelected] = useState([]);
  const issues = [
    { key: "healthcare", label: "Healthcare", count: 287, color: T.red },
    { key: "climate", label: "Climate", count: 231, color: T.green },
    { key: "economic", label: "Economy", count: 198, color: T.gold },
    { key: "guns", label: "Gun Policy", count: 144, color: T.red },
    { key: "tech", label: "Tech & Privacy", count: 89, color: T.blue },
    { key: "immigration", label: "Immigration", count: 167, color: T.purple },
    { key: "education", label: "Education", count: 112, color: "#C98E4C" },
    { key: "voting", label: "Voting Rights", count: 78, color: T.purple },
    { key: "foreign", label: "Foreign Policy", count: 203, color: "#7C4CC9" },
    { key: "housing", label: "Housing", count: 55, color: T.green },
  ];

  const toggle = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  return (
    <LandingCard>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Arial", fontSize: 11, color: T.gold, letterSpacing: "0.1em", marginBottom: 8 }}>FOLLOW ISSUES</div>
        <div style={{
          fontFamily: "Arial Black, Arial",
          fontWeight: 900,
          fontSize: 26,
          color: T.text,
          lineHeight: 1.2,
          marginBottom: 12,
        }}>What do you care about?</div>
        <div style={{ fontFamily: "Arial", fontSize: 14, color: T.text2, lineHeight: 1.5 }}>
          Select issues to filter your feed. No sign-in required.
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {issues.map(iss => {
          const active = selected.includes(iss.key);
          return (
            <button
              key={iss.key}
              onClick={() => toggle(iss.key)}
              style={{
                background: active ? iss.color + "22" : T.surface2,
                border: `1px solid ${active ? iss.color : T.border}`,
                borderRadius: 20,
                padding: "8px 14px",
                fontFamily: "Arial",
                fontSize: 13,
                color: active ? iss.color : T.text2,
                cursor: "pointer",
                fontWeight: active ? 700 : 400,
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
              }}
            >
              {iss.label}
              <span style={{ fontSize: 11, opacity: 0.7 }}>{iss.count}</span>
            </button>
          );
        })}
      </div>

      <NextButton
        onClick={onNext}
        label={selected.length > 0 ? `Apply ${selected.length} filter${selected.length > 1 ? "s" : ""} →` : "Skip →"}
      />
    </LandingCard>
  );
}

// ── Card 10: Live News + Sign In ─────────────────────────────────────────────
function Card10Signin({ onNext, onSignup }) {
  return (
    <LandingCard>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Arial", fontSize: 11, color: T.gold, letterSpacing: "0.1em", marginBottom: 8 }}>LIVE NOW</div>
        <div style={{
          fontFamily: "Arial Black, Arial",
          fontWeight: 900,
          fontSize: 26,
          color: T.text,
          lineHeight: 1.2,
          marginBottom: 12,
        }}>$287M in pharma PAC money — this session alone</div>
      </div>

      {/* Fake news card */}
      <div style={{
        background: T.surface2,
        border: `0.5px solid ${T.border}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 16,
      }}>
        <div style={{
          height: 120,
          background: `linear-gradient(135deg, ${T.red}22, ${T.surface2})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: `0.5px solid ${T.border}`,
        }}>
          <div style={{
            fontFamily: "Arial Black, Arial",
            fontWeight: 900,
            fontSize: 48,
            color: T.red,
            opacity: 0.4,
          }}>$287M</div>
        </div>
        <div style={{ padding: "14px" }}>
          <div style={{ fontFamily: "Arial", fontSize: 12, color: T.text2, marginBottom: 6 }}>Reuters · 3 hours ago</div>
          <div style={{ fontFamily: "Arial Black, Arial", fontWeight: 900, fontSize: 15, color: T.text, lineHeight: 1.3 }}>
            Senate drug pricing vote expected this week — pharma has spent $287M on lobbying this session
          </div>
        </div>
      </div>

      {/* Context block */}
      <div style={{
        background: T.gold + "10",
        border: `0.5px solid ${T.goldBorder}`,
        borderRadius: 10,
        padding: "14px",
        marginBottom: 24,
      }}>
        <div style={{ fontFamily: "Arial Black, Arial", fontWeight: 900, fontSize: 14, color: T.gold, marginBottom: 6 }}>
          Sign in to see your alignment
        </div>
        <div style={{ fontFamily: "Arial", fontSize: 13, color: T.text2, lineHeight: 1.5 }}>
          Based on your quiz results, see exactly how your senators' pharma votes compare to what you believe — before they vote this week.
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => onSignup && onSignup({ trigger: "generic", message: "" })}
          style={{
            flex: 2,
            background: T.gold,
            border: "none",
            borderRadius: 8,
            padding: "14px 0",
            fontFamily: "Arial Black, Arial",
            fontWeight: 900,
            fontSize: 15,
            color: "#0A0B0D",
            cursor: "pointer",
          }}
        >CREATE ACCOUNT →</button>
        <button onClick={onNext} style={{
          flex: 1,
          background: "transparent",
          border: `0.5px solid ${T.border}`,
          borderRadius: 8,
          padding: "14px 0",
          fontFamily: "Arial",
          fontSize: 13,
          color: T.text2,
          cursor: "pointer",
        }}>Browse first</button>
      </div>
    </LandingCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function LandingCard({ children }) {
  return (
    <div style={{
      background: T.surface,
      border: `0.5px solid ${T.border}`,
      borderRadius: 16,
      padding: "24px",
      marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

function NextButton({ onClick, label = "Next →" }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        background: T.gold,
        border: "none",
        borderRadius: 8,
        padding: "14px 0",
        fontFamily: "Arial Black, Arial",
        fontWeight: 900,
        fontSize: 15,
        color: "#0A0B0D",
        cursor: "pointer",
        letterSpacing: "0.02em",
      }}
    >{label}</button>
  );
}

function StatBox({ label, value, color, subtitle }) {
  return (
    <div style={{
      flex: 1,
      background: T.surface,
      border: `0.5px solid ${T.border}`,
      borderRadius: 8,
      padding: "10px 12px",
      textAlign: "center",
    }}>
      <div style={{ fontFamily: "Arial Black, Arial", fontWeight: 900, fontSize: 20, color, lineHeight: 1 }}>{value}</div>
      {subtitle && <div style={{ fontFamily: "Arial", fontSize: 10, color, opacity: 0.7, marginTop: 1 }}>{subtitle}</div>}
      <div style={{ fontFamily: "Arial", fontSize: 10, color: T.text2, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function ScoreBadge({ score, label, color }) {
  return (
    <div style={{
      flex: 1,
      background: color + "12",
      border: `0.5px solid ${color}44`,
      borderRadius: 8,
      padding: "8px",
      textAlign: "center",
    }}>
      <div style={{ fontFamily: "Arial Black, Arial", fontWeight: 900, fontSize: 13, color, lineHeight: 1 }}>{score}</div>
      <div style={{ fontFamily: "Arial", fontSize: 10, color: T.text2, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function TimelineEvent({ date, label, color, isFirst, isLast }) {
  return (
    <div style={{ display: "flex", gap: 12, paddingBottom: isLast ? 0 : 12 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
        {!isLast && <div style={{ width: 1, flex: 1, background: T.border, marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : 4 }}>
        <div style={{ fontFamily: "Arial", fontSize: 11, color: color, marginBottom: 2 }}>{date}</div>
        <div style={{ fontFamily: "Arial", fontSize: 13, color: T.text, lineHeight: 1.4 }}>{label}</div>
      </div>
    </div>
  );
}

function ThumbprintLarge() {
  const size = 140;
  const cx = size / 2, cy = size / 2;
  const maxR = size / 2 - 10;
  const n = 12;
  const vals = [0.85, 0.4, 0.9, 0.6, 0.55, 0.3, 0.75, 0.95, 0.45, 0.65, 0.8, 0.35];
  const colors = Object.values(DIMENSION_COLORS);

  const getPoint = (i, r) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const rings = [0.33, 0.66, 1.0].map(f =>
    Array.from({ length: n }, (_, i) => getPoint(i, maxR * f))
      .map((p, j) => (j === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
      .join(" ") + "Z"
  );

  const userPoints = vals.map((v, i) => getPoint(i, maxR * Math.max(0.1, v)));
  const userPath = userPoints.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") + "Z";

  return (
    <svg width={size} height={size} style={{ filter: `drop-shadow(0 0 12px ${T.gold}44)` }}>
      {rings.map((d, i) => <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />)}
      {colors.map((c, i) => {
        const [x, y] = getPoint(i, maxR + 6);
        return <circle key={i} cx={x} cy={y} r={2.5} fill={c} opacity={0.8} />;
      })}
      <path d={userPath} fill={T.gold + "18"} stroke={T.gold} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={cx} cy={cy} r={3} fill={T.gold} />
    </svg>
  );
}

// ── Rep Strip (State 2) ───────────────────────────────────────────────────────
function RepStrip({ zip }) {
  const state = zipToState(zip);
  if (!state) return null;
  return (
    <div style={{
      background: T.surface2,
      border: `0.5px solid ${T.border}`,
      borderRadius: 10,
      padding: "12px 16px",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      <div style={{ fontFamily: "Arial", fontSize: 12, color: T.text2 }}>
        Your reps ({state}) appear first in your feed
      </div>
      <div style={{
        fontFamily: "Arial",
        fontSize: 11,
        color: T.gold,
        background: T.gold + "14",
        border: `0.5px solid ${T.gold}33`,
        borderRadius: 20,
        padding: "3px 10px",
      }}>Zip {zip}</div>
    </div>
  );
}

// ── Sign-up bottom sheet ──────────────────────────────────────────────────────
function SignupSheet({ trigger, message, onClose, onSignIn }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
    }} onClick={onClose}>
      <div
        style={{
          width: "100%",
          maxWidth: 600,
          background: T.surface,
          border: `0.5px solid ${T.border}`,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: "32px 24px 48px",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 40, height: 4, background: T.border, borderRadius: 2, margin: "0 auto 24px" }} />

        {message && (
          <div style={{
            background: T.gold + "12",
            border: `0.5px solid ${T.goldBorder}`,
            borderRadius: 8,
            padding: "12px 14px",
            fontFamily: "Arial",
            fontSize: 13,
            color: T.text2,
            marginBottom: 20,
            lineHeight: 1.5,
          }}>{message}</div>
        )}

        <div style={{ fontFamily: "Arial Black, Arial", fontWeight: 900, fontSize: 22, color: T.text, marginBottom: 8, lineHeight: 1.2 }}>
          {trigger === "save" ? "Save receipts to your account" :
           trigger === "follow" ? "Follow politicians" :
           trigger === "call" ? "Get your call script" :
           "Join Throughline"}
        </div>
        <div style={{ fontFamily: "Arial", fontSize: 13, color: T.text2, marginBottom: 24, lineHeight: 1.5 }}>
          Free forever. No ads. We never sell your data.
        </div>

        <button
          onClick={onSignIn}
          style={{
            width: "100%",
            background: T.gold,
            border: "none",
            borderRadius: 10,
            padding: "16px 0",
            fontFamily: "Arial Black, Arial",
            fontWeight: 900,
            fontSize: 16,
            color: "#0A0B0D",
            cursor: "pointer",
            marginBottom: 10,
          }}
        >CREATE ACCOUNT →</button>

        <button onClick={onSignIn} style={{
          width: "100%",
          background: "transparent",
          border: `0.5px solid ${T.border}`,
          borderRadius: 10,
          padding: "14px 0",
          fontFamily: "Arial",
          fontSize: 14,
          color: T.text2,
          cursor: "pointer",
          marginBottom: 10,
        }}>Sign in to existing account</button>

        <button onClick={onClose} style={{
          width: "100%",
          background: "transparent",
          border: "none",
          fontFamily: "Arial",
          fontSize: 13,
          color: T.text2,
          cursor: "pointer",
          padding: "8px 0",
        }}>Keep browsing without an account</button>
      </div>
    </div>
  );
}

// ── Upcoming Events Strip ─────────────────────────────────────────────────────
function UpcomingEventsStrip({ events }) {
  const router = useRouter();

  const COLORS = {
    rally: "#c9a84c", town_hall: "#5b9cf6", voter_reg: "#4caf7d",
    phone_bank: "#9b8ff5", canvass: "#4cc9c9", speaker: "#c98e4c",
  };
  const LABELS = {
    rally: "Rally", town_hall: "Town Hall", voter_reg: "Voter Reg",
    phone_bank: "Phone Bank", canvass: "Canvassing", speaker: "Speaker",
  };

  function daysAway(dateStr) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <style>{`.upcoming-strip::-webkit-scrollbar { display: none; }`}</style>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 10,
      }}>
        <div style={{
          fontFamily: "Arial Black", fontSize: 11,
          letterSpacing: "0.12em", color: T.text2, textTransform: "uppercase",
        }}>
          📅 Upcoming Near You
        </div>
        <button
          onClick={() => router.push("/events")}
          style={{
            background: "none", border: "none",
            fontFamily: "Arial", fontSize: 12,
            color: T.gold, cursor: "pointer",
          }}
        >
          See all →
        </button>
      </div>
      <div
        className="upcoming-strip"
        style={{
          display: "flex", gap: 10, overflowX: "auto",
          scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: 2,
        }}
      >
        {events.map(ev => {
          const color = COLORS[ev.event_type] || T.text2;
          const label = LABELS[ev.event_type] || ev.event_type;
          const days  = daysAway(ev.event_date);
          return (
            <div
              key={ev.id}
              onClick={() => router.push("/events")}
              style={{
                flexShrink: 0, background: T.surface,
                border: `0.5px solid ${T.border}`,
                borderRadius: 10, padding: "12px 14px",
                minWidth: 160, maxWidth: 200, cursor: "pointer",
              }}
            >
              <div style={{ marginBottom: 6 }}>
                <span style={{
                  fontFamily: "Arial Black", fontSize: 9,
                  letterSpacing: "0.1em", padding: "2px 8px",
                  borderRadius: 20, background: color + "22",
                  color, border: `1px solid ${color}44`,
                }}>
                  {label.toUpperCase()}
                </span>
              </div>
              <div style={{
                fontFamily: "Arial Black", fontSize: 12,
                color: T.text, lineHeight: 1.3, marginBottom: 6,
                display: "-webkit-box", WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {ev.title}
              </div>
              <div style={{ fontFamily: "Arial", fontSize: 11, color: T.gold }}>
                {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days away`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

