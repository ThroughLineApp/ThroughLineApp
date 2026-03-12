import { useState, useEffect } from "react";

// ── Supabase client (lightweight fetch-based, no SDK needed) ──────────────────
const SUPABASE_URL = "https://busiguukyesnvgriktbu.supabase.co";
// ⚠️  Paste your anon/public key here (safe to expose in frontend)
const SUPABASE_ANON_KEY = "sb_publishable_ISiDLfrT9y1mXTAn0IA2YA_jrGAz9fy";

async function supabaseFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer ?? "return=minimal",
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  // 204 No Content → return null
  if (res.status === 204) return null;
  return res.json();
}

// ── Brand tokens ──────────────────────────────────────────────────────────────
const COLORS = {
  bg: "#0a0b0d",
  bgCard: "#11131a",
  bgCardHover: "#161922",
  gold: "#c9a84c",
  goldDim: "#8a6e30",
  goldGlow: "rgba(201,168,76,0.18)",
  parchment: "#e8dfc8",
  parchmentDim: "#a89d88",
  red: "#c94c4c",
  blue: "#4c78c9",
  purple: "#8e4cc9",
  green: "#4ca87c",
  border: "rgba(201,168,76,0.15)",
  borderHover: "rgba(201,168,76,0.4)",
};

// ── Quiz dimensions & questions ───────────────────────────────────────────────
const DIMENSIONS = [
  { id: "economic",    label: "Economic Policy",   color: "#c9a84c" },
  { id: "healthcare",  label: "Healthcare",         color: "#c94c78" },
  { id: "climate",     label: "Climate & Energy",   color: "#4ca87c" },
  { id: "criminal",    label: "Criminal Justice",   color: "#c94c4c" },
  { id: "immigration", label: "Immigration",        color: "#4c78c9" },
  { id: "foreign",     label: "Foreign Policy",     color: "#7c4cc9" },
  { id: "education",   label: "Education",          color: "#c98e4c" },
  { id: "freedom",     label: "Personal Freedom",   color: "#4cc9c9" },
  { id: "guns",        label: "Gun Policy",         color: "#c94c4c" },
  { id: "housing",     label: "Housing & Urban",    color: "#78c94c" },
  { id: "tech",        label: "Tech & Privacy",     color: "#4c8ec9" },
  { id: "voting",      label: "Electoral Rights",   color: "#c94c9e" },
];

const QUESTIONS = [
  {
    id: "q1",
    dimension: "economic",
    text: "When the economy struggles, the most effective response is…",
    subtext: "Think about speed, fairness, and who bears the cost.",
    options: [
      { label: "Government stimulus — inject money directly into the economy", value: 10 },
      { label: "Tax cuts for businesses — let the market find its footing", value: -10 },
      { label: "Targeted relief for lower-income workers first", value: 5 },
      { label: "Let it correct naturally — intervention causes dependency", value: -15 },
    ],
    slider: false,
  },
  {
    id: "q2",
    dimension: "healthcare",
    text: "Healthcare in America is fundamentally…",
    subtext: "Where should the responsibility live?",
    options: [
      { label: "A human right — everyone deserves coverage regardless of income", value: 15 },
      { label: "A market — competition drives better care at lower cost", value: -15 },
      { label: "A shared responsibility — public options alongside private plans", value: 5 },
      { label: "A local issue — states should design their own systems", value: -5 },
    ],
    slider: false,
  },
  {
    id: "q3",
    dimension: "climate",
    text: "How urgently should the US transition away from fossil fuels?",
    subtext: "Drag to set your position.",
    sliderLabel: ["Immediately, at any economic cost", "Gradually, protect jobs first"],
    slider: true,
  },
  {
    id: "q4",
    dimension: "criminal",
    text: "When someone commits a nonviolent drug offense, the system should prioritize…",
    subtext: "What matters most?",
    options: [
      { label: "Treatment and rehabilitation", value: 12 },
      { label: "Deterrence through prosecution", value: -12 },
      { label: "Community service and diversion programs", value: 8 },
      { label: "Consistent enforcement of the law", value: -6 },
    ],
    slider: false,
  },
  {
    id: "q5",
    dimension: "immigration",
    text: "The most important factor in immigration policy is…",
    subtext: "One answer — what matters most to you?",
    options: [
      { label: "Humanitarian protection for those fleeing danger", value: 12 },
      { label: "Economic contribution and skills the country needs", value: 2 },
      { label: "Strict border enforcement and legal pathways only", value: -12 },
      { label: "Community integration and cultural impact", value: 4 },
    ],
    slider: false,
  },
  {
    id: "q6",
    dimension: "foreign",
    text: "American power in the world is best exercised through…",
    subtext: "Drag to set your position.",
    sliderLabel: ["Diplomacy and alliances", "Military strength and deterrence"],
    slider: true,
  },
  {
    id: "q7",
    dimension: "education",
    text: "Public education funding should be…",
    subtext: null,
    options: [
      { label: "Federally equalized — every district gets the same per student", value: 12 },
      { label: "Locally controlled — communities fund their own schools", value: -8 },
      { label: "Competition-based — fund students, not systems (vouchers)", value: -12 },
      { label: "Increased nationally with local flexibility", value: 6 },
    ],
    slider: false,
  },
  {
    id: "q8",
    dimension: "freedom",
    text: "When personal choices affect only the individual, the government should…",
    subtext: "Think about drug use, lifestyle, and private behavior.",
    options: [
      { label: "Stay out of it entirely", value: 15 },
      { label: "Regulate to protect public health", value: -5 },
      { label: "Educate and support, but not mandate", value: 8 },
      { label: "Enforce community standards through law", value: -12 },
    ],
    slider: false,
  },
  {
    id: "q9",
    dimension: "guns",
    text: "The most effective way to reduce gun violence is…",
    subtext: null,
    options: [
      { label: "Universal background checks and licensing", value: 10 },
      { label: "Addressing mental health and poverty — not the guns", value: -4 },
      { label: "Assault weapons restrictions and buybacks", value: 14 },
      { label: "More law-abiding citizens carrying legally", value: -14 },
    ],
    slider: false,
  },
  {
    id: "q10",
    dimension: "housing",
    text: "To make cities more affordable, the government should…",
    subtext: "Drag to set your position.",
    sliderLabel: ["Build more public housing directly", "Deregulate zoning, let developers build"],
    slider: true,
  },
  {
    id: "q11",
    dimension: "tech",
    text: "Tech companies collecting and selling your data is…",
    subtext: null,
    options: [
      { label: "A serious threat — needs strict federal regulation", value: 12 },
      { label: "A trade-off users accept by using free services", value: -10 },
      { label: "Fine with proper transparency and opt-out rights", value: 2 },
      { label: "A state-level issue — no federal role needed", value: -6 },
    ],
    slider: false,
  },
  {
    id: "q12",
    dimension: "voting",
    text: "Making voting easier (extended hours, mail-in, same-day registration) is…",
    subtext: null,
    options: [
      { label: "Essential — higher turnout strengthens democracy", value: 14 },
      { label: "Fine, but security measures must come first", value: -4 },
      { label: "A federal issue — one national standard needed", value: 6 },
      { label: "A state right — each state sets its own rules", value: -10 },
    ],
    slider: false,
  },
];

// ── Identity profiles based on score patterns ─────────────────────────────────
function deriveProfile(scores) {
  const dims = Object.entries(scores);
  const avgScore = dims.length ? dims.reduce((s, [, v]) => s + v, 0) / dims.length : 0;
  const econ    = scores.economic    ?? 0;
  const freedom = scores.freedom     ?? 0;
  const foreign = scores.foreign     ?? 0;
  const climate = scores.climate     ?? 0;

  if (econ > 5  && freedom > 5)  return { name: "Progressive Libertarian",    sub: "Free minds, shared prosperity" };
  if (econ < -5 && freedom > 5)  return { name: "Classic Libertarian",         sub: "Individual freedom above all" };
  if (econ > 5  && freedom < -5) return { name: "Progressive Communitarian",   sub: "Collective strength, shared values" };
  if (econ < -5 && freedom < -5) return { name: "Traditional Conservative",    sub: "Order, markets, and community" };
  if (foreign < -5 && econ > 0)  return { name: "Progressive Hawk",            sub: "Strong abroad, fair at home" };
  if (climate > 5  && econ > 5)  return { name: "Green Democrat",              sub: "Climate justice as economic justice" };
  if (climate < -5 && econ < -5) return { name: "Fossil Federalist",           sub: "Energy independence, local control" };
  if (Math.abs(avgScore) < 3)    return { name: "Pragmatic Centrist",          sub: "Context over ideology" };
  return                                  { name: "Independent Thinker",        sub: "Your own map, your own compass" };
}

// ── Clamp helper ──────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── Thumbprint polygon ────────────────────────────────────────────────────────
function ThumbprintPolygon({ scores, size = 220, animated = true }) {
  const n = DIMENSIONS.length;
  const cx = size / 2, cy = size / 2;
  const maxR = size / 2 - 20;

  const getPoint = (i, r) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const rings = [0.25, 0.5, 0.75, 1.0].map(f =>
    DIMENSIONS.map((_, i) => getPoint(i, maxR * f))
      .map((p, j) => (j === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") + "Z"
  );

  const spokes = DIMENSIONS.map((_, i) => {
    const [x, y] = getPoint(i, maxR);
    return `M${cx},${cy} L${x},${y}`;
  });

  // Normalize scores: -20..20 → 0..1, clamped
  const userPoints = DIMENSIONS.map((d, i) => {
    const raw = scores[d.id] ?? 0;
    const normalized = clamp((raw + 20) / 40, 0.05, 1);
    return getPoint(i, maxR * normalized);
  });

  const userPath = userPoints.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") + "Z";

  const [visibleCount, setVisibleCount] = useState(animated ? 0 : n);
  useEffect(() => {
    if (!animated) { setVisibleCount(n); return; }
    let i = 0;
    const t = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= n) clearInterval(t);
    }, 80);
    return () => clearInterval(t);
  }, [animated, n]);

  const animPath =
    userPoints.slice(0, visibleCount)
      .map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ") +
    (visibleCount >= n ? "Z" : "");

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {rings.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={COLORS.border} strokeWidth={0.5} />
      ))}
      {spokes.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={COLORS.border} strokeWidth={0.5} />
      ))}
      {DIMENSIONS.map((dim, i) => {
        const [x, y] = getPoint(i, maxR + 8);
        return <circle key={i} cx={x} cy={y} r={3} fill={dim.color} opacity={0.7} />;
      })}
      <path d={userPath} fill={`${COLORS.gold}20`} stroke="none" />
      <path
        d={animPath}
        fill="none"
        stroke={COLORS.gold}
        strokeWidth={2}
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${COLORS.gold})` }}
      />
      <circle cx={cx} cy={cy} r={3} fill={COLORS.gold} />
    </svg>
  );
}

// ── Progress bar with traveling dot ──────────────────────────────────────────
function TravelingLine({ progress = 0 }) {
  return (
    <div style={{ position: "relative", width: "100%", height: 2 }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(90deg, transparent, ${COLORS.gold}33, transparent)`,
      }} />
      <div style={{
        position: "absolute",
        top: "50%", transform: "translateY(-50%)",
        left: `${clamp(progress * 100, 0, 100)}%`,
        width: 8, height: 8, borderRadius: "50%",
        background: COLORS.gold,
        boxShadow: `0 0 12px ${COLORS.gold}, 0 0 4px ${COLORS.gold}`,
        transition: "left 0.5s cubic-bezier(.4,0,.2,1)",
        marginLeft: -4,
      }} />
    </div>
  );
}

// ── Onboarding screen ─────────────────────────────────────────────────────────
function OnboardingScreen({ onStart }) {
  const dummyScores = { economic: 8, healthcare: -6, climate: 12, criminal: 4, immigration: -8, foreign: 6, education: 10, freedom: 14, guns: -4, housing: 8, tech: 6, voting: -10 };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px",
    }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 13, letterSpacing: "0.3em",
          color: COLORS.gold, marginBottom: 16,
        }}>THROUGHLINE</div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(32px, 8vw, 56px)",
          fontWeight: 700, fontStyle: "italic",
          color: COLORS.parchment,
          lineHeight: 1.1, margin: 0,
        }}>
          Your political identity<br />
          <span style={{ color: COLORS.gold }}>is not a line.</span>
        </h1>
      </div>

      <div style={{ position: "relative", marginBottom: 40 }}>
        <div style={{
          position: "absolute", inset: -30,
          background: `radial-gradient(circle, ${COLORS.goldGlow} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <ThumbprintPolygon scores={dummyScores} size={200} animated={false} />
      </div>

      <div style={{ maxWidth: 380, textAlign: "center", marginBottom: 48 }}>
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 13, color: COLORS.parchmentDim,
          lineHeight: 1.7, margin: 0,
        }}>
          Left vs. right is a one-dimensional spectrum. Real people don't live there.
          <br /><br />
          <span style={{ color: COLORS.parchment }}>12 questions. 12 dimensions.</span>{" "}
          The result is a shape unique to you — a political thumbprint that cuts across party lines and maps who you actually are.
        </p>
      </div>

      <button
        onClick={onStart}
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 18, letterSpacing: "0.2em",
          color: COLORS.bg,
          background: COLORS.gold,
          border: "none", borderRadius: 2,
          padding: "16px 48px",
          cursor: "pointer",
          boxShadow: `0 0 24px ${COLORS.goldGlow}`,
        }}
        onMouseEnter={e => (e.target.style.background = "#dbbe6a")}
        onMouseLeave={e => (e.target.style.background = COLORS.gold)}
      >
        FIND YOUR SHAPE
      </button>

      <p style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 11, color: COLORS.parchmentDim,
        marginTop: 20, letterSpacing: "0.05em",
      }}>
        ~4 minutes · no login required
      </p>
    </div>
  );
}

// ── Question card ─────────────────────────────────────────────────────────────
function QuestionCard({ question, qIndex, total, onAnswer, currentScores }) {
  const [selected, setSelected] = useState(null);
  const [sliderVal, setSliderVal] = useState(50);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setSelected(null);
    setSliderVal(50);
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 50);
    return () => clearTimeout(t);
  }, [question.id]);

  const handleOptionClick = (opt) => {
    if (selected !== null) return; // prevent double-fire
    setSelected(opt.value);
    setTimeout(() => onAnswer(question.dimension, opt.value), 380);
  };

  const handleSliderSubmit = () => {
    const val = ((sliderVal - 50) / 50) * 20;
    onAnswer(question.dimension, val);
  };

  const dim = DIMENSIONS.find(d => d.id === question.dimension);
  const sliderLabel =
    sliderVal < 20 ? "STRONGLY LEFT"
    : sliderVal < 40 ? "LEAN LEFT"
    : sliderVal < 60 ? "CENTER"
    : sliderVal < 80 ? "LEAN RIGHT"
    : "STRONGLY RIGHT";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "0 24px" }}>
      {/* Top bar */}
      <div style={{
        padding: "24px 0 16px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 11, letterSpacing: "0.3em",
          color: COLORS.gold, flexShrink: 0,
        }}>THROUGHLINE</div>
        <div style={{ flex: 1 }}>
          <TravelingLine progress={qIndex / total} />
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11, color: COLORS.parchmentDim, flexShrink: 0,
        }}>{qIndex + 1} / {total}</div>
      </div>

      {/* Dimension tag + mini thumbprint (side-by-side, no overlap) */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        marginTop: 16, marginBottom: 24,
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(8px)",
          transition: "all 0.4s ease",
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: dim?.color ?? COLORS.gold,
            boxShadow: `0 0 8px ${dim?.color ?? COLORS.gold}`,
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11, letterSpacing: "0.15em",
            color: COLORS.parchmentDim, textTransform: "uppercase",
          }}>{dim?.label}</span>
        </div>

        {/* Mini thumbprint — inline, no position:absolute */}
        <div style={{ opacity: 0.5, flexShrink: 0 }}>
          <ThumbprintPolygon scores={currentScores} size={64} animated={false} />
        </div>
      </div>

      {/* Question body */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", gap: 8, paddingBottom: 40,
      }}>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(20px, 5vw, 30px)",
          fontStyle: "italic",
          color: COLORS.parchment,
          lineHeight: 1.3, margin: 0,
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.45s ease 0.05s",
        }}>
          {question.text}
        </h2>

        {question.subtext && (
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 12, color: COLORS.parchmentDim,
            margin: "4px 0 0",
            opacity: revealed ? 1 : 0,
            transition: "all 0.45s ease 0.1s",
          }}>{question.subtext}</p>
        )}

        <div style={{ marginTop: 28 }}>
          {question.slider ? (
            <div style={{ opacity: revealed ? 1 : 0, transition: "all 0.45s ease 0.15s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: COLORS.parchmentDim, maxWidth: "42%", lineHeight: 1.4 }}>
                  {question.sliderLabel[0]}
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: COLORS.parchmentDim, maxWidth: "42%", textAlign: "right", lineHeight: 1.4 }}>
                  {question.sliderLabel[1]}
                </span>
              </div>
              <div style={{ position: "relative", padding: "20px 0" }}>
                <input
                  type="range" min={0} max={100} value={sliderVal}
                  onChange={e => setSliderVal(Number(e.target.value))}
                  style={{ width: "100%", accentColor: COLORS.gold, cursor: "pointer" }}
                />
                <div style={{
                  textAlign: "center",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 28, color: COLORS.gold,
                  marginTop: 8, letterSpacing: "0.05em",
                }}>
                  {sliderLabel}
                </div>
              </div>
              <button
                onClick={handleSliderSubmit}
                style={{
                  width: "100%",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 16, letterSpacing: "0.2em",
                  color: COLORS.bg, background: COLORS.gold,
                  border: "none", borderRadius: 2,
                  padding: "14px", cursor: "pointer", marginTop: 16,
                }}
              >
                SET MY POSITION →
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {question.options.map((opt, i) => {
                const isSelected = selected === opt.value;
                return (
                  <button
                    key={i}
                    onClick={() => handleOptionClick(opt)}
                    disabled={selected !== null}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 13,
                      color: isSelected ? COLORS.bg : COLORS.parchment,
                      background: isSelected ? COLORS.gold : COLORS.bgCard,
                      border: `1px solid ${isSelected ? COLORS.gold : COLORS.border}`,
                      borderRadius: 2,
                      padding: "14px 16px",
                      cursor: selected !== null ? "default" : "pointer",
                      lineHeight: 1.5,
                      transition: "all 0.2s",
                      opacity: revealed ? 1 : 0,
                      transform: revealed ? "translateX(0)" : "translateX(-8px)",
                      transitionDelay: `${0.1 + i * 0.06}s`,
                      boxShadow: isSelected ? `0 0 16px ${COLORS.goldGlow}` : "none",
                    }}
                    onMouseEnter={e => { if (!isSelected && selected === null) e.currentTarget.style.borderColor = COLORS.borderHover; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = COLORS.border; }}
                  >
                    <span style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 11, letterSpacing: "0.2em",
                      color: isSelected ? COLORS.bg : COLORS.gold,
                      marginRight: 8, opacity: 0.8,
                    }}>{String.fromCharCode(65 + i)}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Results screen ────────────────────────────────────────────────────────────
function ResultsScreen({ scores, onRetake }) {
  const profile = deriveProfile(scores);
  const [revealed, setRevealed] = useState(false);
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error

  // ── Reveal animation
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(t);
  }, []);

  // ── Save quiz results to Supabase
  useEffect(() => {
    const save = async () => {
      if (SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY") return; // skip if not configured
      setSaveStatus("saving");
      try {
        await supabaseFetch("/quiz_results", {
          method: "POST",
          prefer: "return=minimal",
          body: JSON.stringify({
            profile_name: profile.name,
            score_economic:    scores.economic    ?? 0,
            score_healthcare:  scores.healthcare  ?? 0,
            score_climate:     scores.climate     ?? 0,
            score_criminal:    scores.criminal    ?? 0,
            score_immigration: scores.immigration ?? 0,
            score_foreign:     scores.foreign     ?? 0,
            score_education:   scores.education   ?? 0,
            score_freedom:     scores.freedom     ?? 0,
            score_guns:        scores.guns        ?? 0,
            score_housing:     scores.housing     ?? 0,
            score_tech:        scores.tech        ?? 0,
            score_voting:      scores.voting      ?? 0,
            created_at:        new Date().toISOString(),
          }),
        });
        setSaveStatus("saved");
      } catch (e) {
        console.error("Save failed:", e);
        setSaveStatus("error");
      }
    };
    save();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch politician matches from Supabase
  // Strategy: pull politicians table ordered by dimension scores closest to user's scores.
  // We compute a simple Euclidean-ish match % client-side since politician_matches table
  // may not be populated yet. Falls back to the politician_matches table if it has rows.
  useEffect(() => {
    const fetchMatches = async () => {
      if (SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY") {
        // Demo data when Supabase not configured
        setMatches([
          { name: "Bernie Sanders",  party: "D", state: "VT", match_pct: 78 },
          { name: "Rand Paul",       party: "R", state: "KY", match_pct: 64 },
          { name: "Amy Klobuchar",   party: "D", state: "MN", match_pct: 61 },
        ]);
        setMatchesLoading(false);
        return;
      }

      try {
        // First try politician_matches table
        const matchRows = await supabaseFetch(
          "/politician_matches?select=match_pct,politicians(name,party,state)&order=match_pct.desc&limit=3"
        );
        if (matchRows && matchRows.length > 0) {
          setMatches(matchRows.map(r => ({
            name: r.politicians?.name ?? "Unknown",
            party: r.politicians?.party ?? "?",
            state: r.politicians?.state ?? "",
            match_pct: Math.round(r.match_pct),
          })));
        } else {
          // Fall back: pull all politicians with dimension scores and compute match client-side
          const pols = await supabaseFetch(
            "/politicians?select=name,party,state,score_economic,score_healthcare,score_climate,score_criminal,score_immigration,score_foreign,score_education,score_freedom,score_guns,score_housing,score_tech,score_voting&is_current=eq.true&not.score_economic.is.null&limit=200"
          );
          if (!pols || pols.length === 0) throw new Error("No politician data");

          const dimKeys = DIMENSIONS.map(d => d.id);
          const scored = pols.map(p => {
            let dist = 0;
            let count = 0;
            dimKeys.forEach(k => {
              const userVal = scores[k] ?? 0;
              const polVal  = p[`score_${k}`] ?? 0;
              dist += Math.pow(userVal - polVal, 2);
              count++;
            });
            const rmse = Math.sqrt(dist / count);
            // Max possible RMSE with score range ±20 → ~28; map to 0–100 similarity
            const match_pct = Math.round(Math.max(0, 100 - (rmse / 28) * 100));
            return { name: p.name, party: p.party, state: p.state, match_pct };
          });

          scored.sort((a, b) => b.match_pct - a.match_pct);
          setMatches(scored.slice(0, 3));
        }
        setMatchesLoading(false);
      } catch (e) {
        console.error("Match fetch failed:", e);
        setMatchesError("Couldn't load matches right now.");
        setMatchesLoading(false);
      }
    };
    fetchMatches();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const partyColor = (party) =>
    party === "D" ? COLORS.blue : party === "R" ? COLORS.red : COLORS.purple;

  const partyLabel = (party) =>
    party === "D" ? "DEM" : party === "R" ? "REP" : party ?? "IND";

  return (
    <div style={{
      minHeight: "100vh",
      padding: "40px 24px",
      display: "flex", flexDirection: "column",
      alignItems: "center",
    }}>
      {/* Brand */}
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 11, letterSpacing: "0.3em",
        color: COLORS.gold, marginBottom: 32,
        width: "100%",
      }}>THROUGHLINE</div>

      <p style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 11, letterSpacing: "0.2em",
        color: COLORS.parchmentDim, margin: "0 0 16px",
        textTransform: "uppercase",
        opacity: revealed ? 1 : 0,
        transition: "opacity 0.5s",
      }}>Your political thumbprint</p>

      {/* Polygon */}
      <div style={{
        position: "relative", marginBottom: 32,
        opacity: revealed ? 1 : 0,
        transition: "opacity 0.5s 0.2s",
      }}>
        <div style={{
          position: "absolute", inset: -40,
          background: `radial-gradient(circle, ${COLORS.goldGlow} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <ThumbprintPolygon scores={scores} size={240} animated={true} />
      </div>

      {/* Identity name */}
      <div style={{
        textAlign: "center", marginBottom: 32,
        opacity: revealed ? 1 : 0,
        transition: "opacity 0.6s 0.4s",
      }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(28px, 7vw, 44px)",
          letterSpacing: "0.05em",
          color: COLORS.parchment,
        }}>{profile.name}</div>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic",
          fontSize: 15, color: COLORS.gold,
          marginTop: 4,
        }}>{profile.sub}</div>
      </div>

      {/* Dimension bars */}
      <div style={{
        width: "100%", maxWidth: 480,
        display: "flex", flexDirection: "column", gap: 8,
        marginBottom: 40,
        opacity: revealed ? 1 : 0,
        transition: "opacity 0.6s 0.6s",
      }}>
        {DIMENSIONS.map(dim => {
          const raw = scores[dim.id] ?? 0;
          // Clamp: bars always show 5%–100% so they're visible even near zero
          const pct = clamp(((raw + 20) / 40) * 100, 5, 100);
          return (
            <div key={dim.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10, letterSpacing: "0.08em",
                color: COLORS.parchmentDim,
                width: 110, flexShrink: 0,
                textTransform: "uppercase",
              }}>{dim.label}</div>
              <div style={{
                flex: 1, height: 3,
                background: COLORS.bgCard,
                borderRadius: 2, overflow: "hidden",
              }}>
                <div style={{
                  width: `${pct}%`, height: "100%",
                  background: dim.color,
                  boxShadow: `0 0 6px ${dim.color}`,
                  transition: "width 1s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Politician matches */}
      <div style={{
        width: "100%", maxWidth: 480,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 2, padding: "20px",
        marginBottom: 32,
        opacity: revealed ? 1 : 0,
        transition: "opacity 0.6s 0.8s",
      }}>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11, letterSpacing: "0.2em",
          color: COLORS.gold, marginBottom: 16,
          textTransform: "uppercase",
        }}>Your closest political matches</div>

        {matchesLoading ? (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: COLORS.parchmentDim, padding: "12px 0" }}>
            Loading matches…
          </div>
        ) : matchesError ? (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: COLORS.red, padding: "12px 0" }}>
            {matchesError}
          </div>
        ) : (
          matches.map((m, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: i < matches.length - 1 ? `1px solid ${COLORS.border}` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: partyColor(m.party),
                  opacity: 0.5,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 9, letterSpacing: "0.1em",
                    color: COLORS.parchment,
                  }}>{partyLabel(m.party)}</span>
                </div>
                <div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: COLORS.parchment }}>
                    {m.name}
                  </div>
                  {m.state && (
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: COLORS.parchmentDim }}>
                      {m.state}
                    </div>
                  )}
                </div>
              </div>
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 22, color: COLORS.gold,
              }}>{m.match_pct}%</span>
            </div>
          ))
        )}

        {SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY" && (
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10, color: COLORS.parchmentDim,
            marginTop: 12, fontStyle: "italic",
          }}>Add your Supabase key to load real matches</p>
        )}
      </div>

      {/* Save indicator */}
      {saveStatus === "saved" && (
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11, color: COLORS.green,
          marginBottom: 16, letterSpacing: "0.1em",
        }}>✓ Results saved to your profile</div>
      )}

      {/* Actions */}
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap",
        justifyContent: "center",
        opacity: revealed ? 1 : 0,
        transition: "opacity 0.6s 1s",
        marginBottom: 40,
      }}>
        <button
          onClick={onRetake}
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 14, letterSpacing: "0.2em",
            color: COLORS.gold,
            background: "transparent",
            border: `1px solid ${COLORS.gold}`,
            borderRadius: 2,
            padding: "12px 28px",
            cursor: "pointer",
          }}
        >RETAKE QUIZ</button>
        <button
          onClick={() => {
            const text = `My political thumbprint: ${profile.name} — ${profile.sub}. Take the Throughline quiz to find yours.`;
            if (navigator.share) {
              navigator.share({ title: "My Throughline", text });
            } else {
              navigator.clipboard?.writeText(text);
              alert("Result copied to clipboard!");
            }
          }}
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 14, letterSpacing: "0.2em",
            color: COLORS.bg,
            background: COLORS.gold,
            border: "none", borderRadius: 2,
            padding: "12px 28px",
            cursor: "pointer",
          }}
        >SHARE MY SHAPE →</button>
      </div>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function ThroughLineQuiz() {
  const [screen, setScreen]   = useState("onboarding");
  const [qIndex, setQIndex]   = useState(0);
  const [scores, setScores]   = useState({});

  const handleAnswer = (dimension, value) => {
    const newScores = { ...scores, [dimension]: (scores[dimension] ?? 0) + value };
    setScores(newScores);
    if (qIndex + 1 >= QUESTIONS.length) {
      setScreen("results");
    } else {
      setQIndex(qIndex + 1);
    }
  };

  const handleRetake = () => {
    setScores({});
    setQIndex(0);
    setScreen("onboarding");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.bg,
      color: COLORS.parchment,
      fontFamily: "sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 400,
        background: `radial-gradient(ellipse, ${COLORS.goldGlow} 0%, transparent 70%)`,
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto" }}>
        {screen === "onboarding" && <OnboardingScreen onStart={() => setScreen("quiz")} />}
        {screen === "quiz" && (
          <QuestionCard
            question={QUESTIONS[qIndex]}
            qIndex={qIndex}
            total={QUESTIONS.length}
            onAnswer={handleAnswer}
            currentScores={scores}
          />
        )}
        {screen === "results" && <ResultsScreen scores={scores} onRetake={handleRetake} />}
      </div>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        input[type=range] {
          -webkit-appearance: none;
          width: 100%;
          height: 2px;
          background: ${COLORS.border};
          border-radius: 2px;
          outline: none;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: ${COLORS.gold};
          cursor: pointer;
          box-shadow: 0 0 12px ${COLORS.goldGlow};
        }
        button { transition: all 0.2s ease; }
        button:hover { opacity: 0.88; }
      `}</style>
    </div>
  );
}
