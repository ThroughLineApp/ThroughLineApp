import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import supabase from "../lib/supabase";
import { useAuth } from "../lib/auth";

const C = {
  bg:            "#0a0b0d",
  bgCard:        "#11131a",
  bgDeep:        "#0d0f14",
  gold:          "#c9a84c",
  goldDim:       "#8a6e30",
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
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800&family=Playfair+Display:ital,wght@1,400;1,700&family=Inter:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0b0d; }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeSlideOut {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-18px); }
  }
  @keyframes pulseGold {
    0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); }
    50%       { box-shadow: 0 0 0 6px rgba(201,168,76,0.15); }
  }
  @keyframes thumbDraw {
    from { stroke-dashoffset: 1200; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes spinnerRing {
    to { transform: rotate(360deg); }
  }
  @keyframes barGrow {
    from { width: 0; }
    to   { width: var(--bar-w); }
  }
  .quiz-answer-btn:hover {
    border-color: rgba(201,168,76,0.6) !important;
    background: rgba(201,168,76,0.07) !important;
    transform: translateX(4px);
  }
  .quiz-answer-btn.selected {
    border-color: #c9a84c !important;
    background: rgba(201,168,76,0.12) !important;
  }
  .deeper-textarea:focus { outline: none; border-color: rgba(201,168,76,0.5) !important; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }
`;

const DIMENSION_ICONS = {
  economic:    "◈",
  healthcare:  "✦",
  climate:     "❋",
  criminal:    "⊕",
  immigration: "◎",
  foreign:     "⊞",
  education:   "◇",
  freedom:     "◉",
  guns:        "⊗",
  housing:     "⬡",
  tech:        "⊛",
  voting:      "◐",
};

const DIMENSION_COLORS = {
  economic:    "#c9a84c",
  healthcare:  "#c94c78",
  climate:     "#4ca87c",
  criminal:    "#c97c4c",
  immigration: "#4c78c9",
  foreign:     "#8e4cc9",
  education:   "#c98e4c",
  freedom:     "#4cc9c9",
  guns:        "#c94c4c",
  housing:     "#78c94c",
  tech:        "#4c8ec9",
  voting:      "#c94c9e",
};

// Each answer has: text, score (0-100 on this dimension), ideology tag
const QUESTIONS = [
  {
    id: "economic",
    dimension: "economic",
    label: "Economic Policy",
    context: "How we fund society — taxes, wages, and who benefits from growth.",
    scenario: "Your town's biggest factory just closed. 400 people lost their jobs overnight.",
    question: "What should happen next?",
    answers: [
      { text: "Let the market recover naturally — new businesses will come if government steps aside and cuts red tape.", score: 15, ideology: "libertarian" },
      { text: "The government should fund job retraining programs and provide temporary support for displaced workers.", score: 50, ideology: "centrist" },
      { text: "Tax corporations and the wealthy to build a real safety net — this is exactly what it's for.", score: 85, ideology: "progressive" },
      { text: "Local charities, churches, and community organizations are better equipped to help than any federal program.", score: 20, ideology: "conservative" },
      { text: "We need to rethink an economy that lets 400 people lose everything because one company closed.", score: 95, ideology: "democratic_socialist" },
    ],
  },
  {
    id: "healthcare",
    dimension: "healthcare",
    label: "Healthcare",
    context: "Who pays for medical care — and who gets left out.",
    scenario: "Your neighbor was just diagnosed with cancer. She works full time but her insurance won't cover the treatment she needs.",
    question: "What should happen?",
    answers: [
      { text: "The whole insurance industry is the problem — it needs to be replaced, not patched.", score: 95, ideology: "democratic_socialist" },
      { text: "She should shop for a better plan. Competition in the market drives down costs and improves options over time.", score: 15, ideology: "libertarian" },
      { text: "There should be a public option anyone can access — no one should fall through the cracks.", score: 60, ideology: "centrist" },
      { text: "Faith communities and nonprofits have always filled gaps like this — government isn't the answer.", score: 20, ideology: "conservative" },
      { text: "Healthcare shouldn't be tied to your job or your bank account. Everyone deserves the same coverage.", score: 85, ideology: "progressive" },
    ],
  },
  {
    id: "climate",
    dimension: "climate",
    label: "Climate & Energy",
    context: "Balancing jobs, energy costs, and the long-term health of the planet.",
    scenario: "A new coal plant is proposed for your county. It'll bring 200 jobs — but scientists say it'll worsen air quality and contribute to long-term climate damage.",
    question: "What do you think?",
    answers: [
      { text: "Climate policy is being weaponized to kill American jobs and energy independence. Build it.", score: 10, ideology: "nationalist" },
      { text: "The plant shouldn't be built — the long-term damage to the environment isn't worth any short-term gain.", score: 90, ideology: "green" },
      { text: "Invest in clean energy jobs to replace fossil fuel jobs over time — transition, don't abandon.", score: 70, ideology: "progressive" },
      { text: "Local communities should make this call, not federal regulators or outside activists.", score: 30, ideology: "constitutionalist" },
      { text: "We need both — approve the plant now but require it to meet strict environmental standards.", score: 50, ideology: "centrist" },
    ],
  },
  {
    id: "criminal",
    dimension: "criminal",
    label: "Criminal Justice",
    context: "How society responds when people break the law — and why they do.",
    scenario: "A young man in your city gets caught with drugs for the third time. He grew up in poverty with almost no opportunities.",
    question: "What should the system do?",
    answers: [
      { text: "The law has to mean something. Consistent consequences are the only way to deter future crime.", score: 15, ideology: "conservative" },
      { text: "He needs treatment and job training, not another prison sentence that makes things worse.", score: 75, ideology: "progressive" },
      { text: "Faith-based rehabilitation programs have a proven track record — better than anything the government runs.", score: 30, ideology: "conservative" },
      { text: "The system that produced his circumstances is the real problem — we need root-and-branch reform.", score: 95, ideology: "democratic_socialist" },
      { text: "Judges should have real discretion — mandatory minimums don't account for individual circumstances.", score: 55, ideology: "centrist" },
    ],
  },
  {
    id: "immigration",
    dimension: "immigration",
    label: "Immigration",
    context: "Who belongs here — and what we owe people who've built lives in America.",
    scenario: "A family from Central America has lived in your town for 12 years. They own a small business. Their kids go to local schools. They're undocumented.",
    question: "What happens now?",
    answers: [
      { text: "They should have a clear path to legal status — their contributions and community ties matter.", score: 65, ideology: "centrist" },
      { text: "The law is the law. No exceptions, or the rule of law becomes meaningless.", score: 10, ideology: "nationalist" },
      { text: "People who build lives here belong here. They should become citizens.", score: 90, ideology: "progressive" },
      { text: "We need to fix the broken legal immigration system that created this situation in the first place.", score: 50, ideology: "libertarian" },
      { text: "Immigration levels should be reduced to protect American workers and preserve community character.", score: 20, ideology: "conservative" },
    ],
  },
  {
    id: "foreign",
    dimension: "foreign",
    label: "Foreign Policy",
    context: "America's role in the world — when to act, when to stay out.",
    scenario: "Congress is debating whether to send $10 billion in aid and weapons to an ally that's under military attack.",
    question: "What do you think America should do?",
    answers: [
      { text: "Only act if American interests are directly threatened — otherwise stay out.", score: 30, ideology: "nationalist" },
      { text: "America's strength depends on standing by allies — abandoning them invites more aggression.", score: 70, ideology: "conservative" },
      { text: "We should help diplomatically, but keep American money and troops at home.", score: 45, ideology: "centrist" },
      { text: "International coalitions and the UN should handle it — not unilateral American action.", score: 65, ideology: "progressive" },
      { text: "War profiteers benefit from endless conflict. Stop funding it.", score: 90, ideology: "democratic_socialist" },
    ],
  },
  {
    id: "education",
    dimension: "education",
    label: "Education",
    context: "What we owe every child — and who's responsible for delivering it.",
    scenario: "Two kids live 10 miles apart. One goes to a well-funded suburban school. The other goes to a crumbling underfunded school in a poor district.",
    question: "What should be done?",
    answers: [
      { text: "Education is a right — fund it fully and equally so zip code never determines a child's future.", score: 90, ideology: "progressive" },
      { text: "School vouchers and choice let families escape failing schools — competition improves everything.", score: 25, ideology: "libertarian" },
      { text: "Federal funding should be equalized across districts — the current system is a moral failure.", score: 70, ideology: "centrist" },
      { text: "Teachers unions are protecting a broken system. Real reform starts with accountability, not more money.", score: 20, ideology: "conservative" },
      { text: "Education should be community-controlled — the federal government has made it worse, not better.", score: 35, ideology: "constitutionalist" },
    ],
  },
  {
    id: "freedom",
    dimension: "freedom",
    label: "Personal Freedom",
    context: "Where individual choices end and society's interests begin.",
    scenario: "Your state is debating whether to restrict something that many find controversial — but that only affects the person doing it.",
    question: "Where do you stand?",
    answers: [
      { text: "True freedom requires economic security. You can't be free if you're one crisis away from ruin.", score: 80, ideology: "democratic_socialist" },
      { text: "Government has no business in personal choices that don't harm others. Full stop.", score: 90, ideology: "libertarian" },
      { text: "Individual freedom is the foundation of America — protect it without exception.", score: 85, ideology: "constitutionalist" },
      { text: "Some moral guardrails exist for a reason. Society has a legitimate interest in what people do.", score: 30, ideology: "conservative" },
      { text: "Communities should set their own standards — not the federal government.", score: 45, ideology: "conservative" },
    ],
  },
  {
    id: "guns",
    dimension: "guns",
    label: "Gun Policy",
    context: "The Second Amendment, public safety, and where to draw the line.",
    scenario: "A mass shooting happens at a school two towns over. Twenty-two people are killed. Congress is called to act.",
    question: "What should they do?",
    answers: [
      { text: "Universal background checks and red flag laws are reasonable steps that don't ban anything.", score: 60, ideology: "centrist" },
      { text: "Mental health is the real issue — treat that root cause before restricting any constitutional rights.", score: 35, ideology: "conservative" },
      { text: "The Second Amendment is non-negotiable. Any restriction is a step toward government tyranny.", score: 10, ideology: "constitutionalist" },
      { text: "Military-style weapons have no place in civilian life. Ban them and buy them back.", score: 85, ideology: "progressive" },
      { text: "More trained, armed people in schools saves lives. The answer is protection, not restriction.", score: 20, ideology: "nationalist" },
    ],
  },
  {
    id: "housing",
    dimension: "housing",
    label: "Housing & Urban",
    context: "The crisis of affordable homes — and who's responsible for solving it.",
    scenario: "Rent in your city has doubled in five years. Teachers, nurses, and service workers are being pushed out. Homeless encampments are growing.",
    question: "What's the solution?",
    answers: [
      { text: "Zoning laws and regulations are strangling supply. Deregulate and build — the market will respond.", score: 30, ideology: "libertarian" },
      { text: "Homelessness and housing insecurity are symptoms of an economy that treats homes as investments, not homes.", score: 90, ideology: "democratic_socialist" },
      { text: "Tax incentives for developers who build affordable units — nudge the market rather than replace it.", score: 50, ideology: "centrist" },
      { text: "Private developers will never serve low-income people. We need robust public housing investment.", score: 80, ideology: "progressive" },
      { text: "Cities that have tried rent control have made things worse — let the market set prices.", score: 20, ideology: "conservative" },
    ],
  },
  {
    id: "tech",
    dimension: "tech",
    label: "Tech & Privacy",
    context: "Big Tech, personal data, and who really owns your digital life.",
    scenario: "You just found out a major app sold your location data, browsing history, and private messages to advertisers and political campaigns — without your knowledge.",
    question: "What should happen?",
    answers: [
      { text: "Data is a human right. No company should own or sell it without your explicit, ongoing consent.", score: 90, ideology: "progressive" },
      { text: "That's the deal with free services. Read the terms of service — no one forced you to use it.", score: 20, ideology: "libertarian" },
      { text: "Big Tech has too much unchecked power. Break them up and regulate them like public utilities.", score: 80, ideology: "democratic_socialist" },
      { text: "There should be clear, enforceable laws about what can be collected, sold, and for how long.", score: 65, ideology: "centrist" },
      { text: "Let the market decide — if people don't like it, they'll use different apps.", score: 15, ideology: "conservative" },
    ],
  },
  {
    id: "voting",
    dimension: "voting",
    label: "Electoral Rights",
    context: "Access to the ballot — and what a healthy democracy requires.",
    scenario: "Turnout in your city's last election was 28%. Young people, renters, and shift workers barely voted. Meanwhile, a handful of well-funded candidates dominated the airwaves.",
    question: "What do you do?",
    answers: [
      { text: "The two-party system suppresses real choice. Ranked-choice voting and third parties are the real fix.", score: 75, ideology: "progressive" },
      { text: "Low turnout reflects disengagement. Making voting easier won't fix a civic culture problem.", score: 25, ideology: "conservative" },
      { text: "Voter ID protects election integrity — we can expand access AND maintain security.", score: 40, ideology: "centrist" },
      { text: "Election Day should be a national holiday. Automatic registration at 18. Mail-in ballots for all.", score: 90, ideology: "democratic_socialist" },
      { text: "Campaign finance is the real problem — unlimited money in elections drowns out regular voters.", score: 80, ideology: "progressive" },
    ],
  },
];

// Shuffle answers for each question instance so order isn't predictable
function shuffleAnswers(questions) {
  return questions.map(q => ({
    ...q,
    answers: [...q.answers].sort(() => Math.random() - 0.5),
  }));
}

const SHUFFLED_QUESTIONS = shuffleAnswers(QUESTIONS);

// Compute polygon points for thumbprint SVG
function polygonPoints(scores, cx, cy, r) {
  const dims = Object.keys(DIMENSION_COLORS);
  return dims.map((dim, i) => {
    const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
    const score = scores[dim] ?? 50;
    const radius = (score / 100) * r;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });
}

function ThumbprintSVG({ scores, size = 260, animate = true }) {
  const cx = size / 2, cy = size / 2, r = size * 0.42;
  const dims = Object.keys(DIMENSION_COLORS);
  const pts = polygonPoints(scores, cx, cy, r);
  const polyStr = pts.map(p => p.join(",")).join(" ");

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {rings.map(ring => {
        const ringPts = dims.map((_, i) => {
          const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
          const rad = ring * r;
          return [cx + rad * Math.cos(angle), cy + rad * Math.sin(angle)];
        });
        return (
          <polygon key={ring} points={ringPts.map(p => p.join(",")).join(" ")}
            fill="none" stroke="rgba(201,168,76,0.08)" strokeWidth="1" />
        );
      })}
      {/* Axis lines */}
      {dims.map((_, i) => {
        const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)}
            y2={cy + r * Math.sin(angle)}
            stroke="rgba(201,168,76,0.1)" strokeWidth="1" />
        );
      })}
      {/* Filled thumbprint */}
      <polygon points={polyStr}
        fill="rgba(201,168,76,0.08)"
        stroke="#c9a84c"
        strokeWidth="2"
        strokeLinejoin="round"
        style={animate ? {
          strokeDasharray: 1200,
          strokeDashoffset: 1200,
          animation: "thumbDraw 1.8s ease forwards 0.3s",
        } : {}}
      />
      {/* Dimension dots */}
      {pts.map((pt, i) => (
        <circle key={i} cx={pt[0]} cy={pt[1]} r={4}
          fill={Object.values(DIMENSION_COLORS)[i]}
          opacity={0.9} />
      ))}
      {/* Axis labels */}
      {dims.map((dim, i) => {
        const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
        const labelR = r + 22;
        const x = cx + labelR * Math.cos(angle);
        const y = cy + labelR * Math.sin(angle);
        return (
          <text key={dim} x={x} y={y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="7" fontFamily="'Barlow Condensed', sans-serif"
            fontWeight="700" letterSpacing="0.08em"
            fill={DIMENSION_COLORS[dim]} opacity={0.8}
          >{DIMENSION_ICONS[dim]}</text>
        );
      })}
    </svg>
  );
}

function ProgressBar({ current, total }) {
  const pct = ((current) / total) * 100;
  return (
    <div style={{ width: "100%", height: 2, background: "rgba(201,168,76,0.1)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: C.gold, borderRadius: 2, transition: "width 0.5s ease" }} />
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(201,168,76,0.15)", borderTopColor: C.gold, animation: "spinnerRing 0.8s linear infinite", margin: "0 auto" }} />
  );
}

export default function QuizPage() {
  const router = useRouter();
  const { user, profile, supabase: authSupabase } = useAuth();

  const [phase, setPhase]               = useState("intro"); // intro | question | processing | results
  const [qIndex, setQIndex]             = useState(0);
  const [answers, setAnswers]           = useState({}); // { dimension: score }
  const [selectedAnswer, setSelected]   = useState(null);
  const [deeperOpen, setDeeperOpen]     = useState(false);
  const [writtenInputs, setWritten]     = useState({}); // { dimension: text }
  const [animOut, setAnimOut]           = useState(false);
  const [scores, setScores]             = useState(null);
  const [matches, setMatches]           = useState([]);
  const [aiRefinements, setAiRefinements] = useState({});
  const [processingMsg, setProcessingMsg] = useState("Analyzing your responses…");
  const [savedResultId, setSavedResultId] = useState(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  const q = SHUFFLED_QUESTIONS[qIndex];

  const handleSelectAnswer = (idx) => {
    setSelected(idx);
    setDeeperOpen(false);
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;
    const score = q.answers[selectedAnswer].score;
    setAnswers(prev => ({ ...prev, [q.dimension]: score }));
    setAnimOut(true);
    setTimeout(() => {
      setAnimOut(false);
      setSelected(null);
      setDeeperOpen(false);
      if (qIndex + 1 >= SHUFFLED_QUESTIONS.length) {
        setPhase("processing");
        runProcessing({ ...answers, [q.dimension]: score });
      } else {
        setQIndex(i => i + 1);
      }
    }, 320);
  };

  const runProcessing = async (rawScores) => {
    setProcessingMsg("Analyzing your responses…");

    // If there are written inputs, send them to AI for refinement
    const hasWritten = Object.values(writtenInputs).some(v => v?.trim());
    let refined = { ...rawScores };

    if (hasWritten) {
      setProcessingMsg("Reading your written responses…");
      try {
        const writtenSummary = Object.entries(writtenInputs)
          .filter(([, v]) => v?.trim())
          .map(([dim, text]) => `${dim}: "${text}"`)
          .join("\n");

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages: [{
              role: "user",
              content: `You are analyzing political quiz responses to refine ideology scores.

A user answered a 12-question political quiz. Their base scores (0-100, higher = more progressive) are:
${Object.entries(rawScores).map(([k, v]) => `${k}: ${v}`).join(", ")}

They also wrote these nuanced responses:
${writtenSummary}

Based on the written responses, suggest refined scores for ONLY the dimensions they wrote about.
Respond ONLY with a JSON object like: {"economic": 72, "healthcare": 45}
Do not include dimensions they didn't write about. No explanation, just JSON.`
            }],
          }),
        });
        const data = await res.json();
        const text = data.content?.[0]?.text || "{}";
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        refined = { ...rawScores, ...parsed };
        setAiRefinements(parsed);
      } catch (e) {
        console.error("AI refinement failed, using base scores", e);
      }
    }

    setProcessingMsg("Building your political thumbprint…");
    await new Promise(r => setTimeout(r, 800));

    setScores(refined);

    // Fetch politician matches
    setProcessingMsg("Finding your politician matches…");
    try {
      const { data: pols } = await supabase
        .from("politicians")
        .select("name, slug, party, state, chamber, bioguide_id, score_economic, score_healthcare, score_climate, score_criminal, score_immigration, score_foreign, score_education, score_freedom, score_guns, score_housing, score_tech, score_voting")
        .not("score_economic", "is", null)
        .limit(100);

      if (pols && pols.length > 0) {
        const dims = Object.keys(DIMENSION_COLORS);
        const withDist = pols.map(p => {
          const dist = Math.sqrt(dims.reduce((sum, d) => {
            const userScore = refined[d] ?? 50;
            const polScore = p[`score_${d}`] ?? 50;
            return sum + Math.pow(userScore - polScore, 2);
          }, 0));
          return { ...p, distance: dist };
        });
        withDist.sort((a, b) => a.distance - b.distance);
        setMatches(withDist.slice(0, 3));
      }
    } catch (e) {
      console.error("Politician match failed", e);
    }

    // Save to Supabase
    await saveResults(refined);

    setPhase("results");
  };

  const saveResults = async (finalScores) => {
    try {
      const row = {
        user_id: user?.id || null,
        session_id: crypto.randomUUID(),
        completed_at: new Date().toISOString(),
        tier: "basic",
        score_economic:    finalScores.economic    ?? 50,
        score_healthcare:  finalScores.healthcare  ?? 50,
        score_climate:     finalScores.climate     ?? 50,
        score_criminal:    finalScores.criminal    ?? 50,
        score_immigration: finalScores.immigration ?? 50,
        score_foreign:     finalScores.foreign     ?? 50,
        score_education:   finalScores.education   ?? 50,
        score_freedom:     finalScores.freedom     ?? 50,
        score_guns:        finalScores.guns        ?? 50,
        score_housing:     finalScores.housing     ?? 50,
        score_tech:        finalScores.tech        ?? 50,
        score_voting:      finalScores.voting      ?? 50,
        profile_summary:   buildSummary(finalScores),
      };

      const { data, error } = await supabase.from("quiz_results").insert(row).select().single();
      if (!error && data) {
        setSavedResultId(data.id);
        // Link to profile if logged in
        if (user?.id) {
          await supabase.from("profiles").update({ quiz_result_id: data.id }).eq("id", user.id);
        } else {
          setShowSavePrompt(true);
        }
      }
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const buildSummary = (s) => {
    const avg = Object.values(s).reduce((a, b) => a + b, 0) / Object.values(s).length;
    if (avg > 75) return "Progressive";
    if (avg > 60) return "Center-Left";
    if (avg > 45) return "Moderate";
    if (avg > 30) return "Center-Right";
    return "Conservative";
  };

  const partyColor = (party) => party === "D" ? C.blue : party === "R" ? C.red : C.purple;

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <>
        <Head><title>Your Political Thumbprint · Throughline</title></Head>
        <style>{GLOBAL_STYLES}</style>
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
          <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(201,168,76,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", maxWidth: 520 }}>
            <button onClick={() => router.push("/")} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.2em", color: C.gold, background: "none", border: "none", cursor: "pointer", marginBottom: 40 }}>← THROUGHLINE</button>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: "0.3em", color: C.gold, marginBottom: 16 }}>YOUR POLITICAL THUMBPRINT</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: "clamp(28px, 6vw, 44px)", color: C.parchment, lineHeight: 1.15, marginBottom: 20 }}>
              What do you actually believe —<br /><span style={{ color: C.gold }}>and who votes like you?</span>
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.parchmentDim, lineHeight: 1.75, marginBottom: 14 }}>
              12 questions. Real-world scenarios. No jargon.<br />
              We'll map your beliefs across 12 policy dimensions and show you which members of Congress actually represent your values — and which ones just say they do.
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.6, marginBottom: 36, opacity: 0.7 }}>
              No right or wrong answers. No ideology labels. Just your thumbprint.
            </p>

            {/* Preview thumbprint */}
            <div style={{ margin: "0 auto 36px", opacity: 0.4 }}>
              <ThumbprintSVG scores={Object.fromEntries(Object.keys(DIMENSION_COLORS).map(d => [d, 40 + Math.random() * 40]))} animate={false} size={200} />
            </div>

            <button onClick={() => setPhase("question")}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: "0.15em", color: C.bg, background: C.gold, border: "none", borderRadius: 2, padding: "16px 48px", cursor: "pointer", marginBottom: 16, animation: "pulseGold 2.5s ease-in-out infinite" }}
            >START THE QUIZ →</button>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim }}>Takes about 5 minutes · No account required</div>
          </div>
        </div>
      </>
    );
  }

  // ── PROCESSING ─────────────────────────────────────────────────────────────
  if (phase === "processing") {
    return (
      <>
        <style>{GLOBAL_STYLES}</style>
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 24, textAlign: "center" }}>
          <Spinner />
          <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 20, color: C.parchment }}>{processingMsg}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim }}>Building your political thumbprint…</div>
        </div>
      </>
    );
  }

  // ── RESULTS ────────────────────────────────────────────────────────────────
  if (phase === "results" && scores) {
    const dims = Object.keys(DIMENSION_COLORS);
    return (
      <>
        <Head><title>Your Political Thumbprint · Throughline</title></Head>
        <style>{GLOBAL_STYLES}</style>
        <div style={{ minHeight: "100vh", background: C.bg, color: C.parchment, fontFamily: "'Inter', sans-serif" }}>
          <div style={{ maxWidth: 580, margin: "0 auto", padding: "40px 24px 80px" }}>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeSlideIn 0.6s ease forwards" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: "0.3em", color: C.gold, marginBottom: 12 }}>YOUR POLITICAL THUMBPRINT</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: "clamp(24px, 5vw, 36px)", color: C.parchment, lineHeight: 1.2, marginBottom: 12 }}>
                No two are exactly alike.
              </h1>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.parchmentDim, lineHeight: 1.7 }}>
                This is how your beliefs map across 12 policy dimensions. Each axis is one issue — the further the point extends, the stronger your position.
              </p>
            </div>

            {/* Thumbprint */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, animation: "fadeSlideIn 0.6s ease forwards 0.2s", opacity: 0 }}>
              <ThumbprintSVG scores={scores} size={280} animate={true} />
            </div>

            {/* Dimension legend */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginBottom: 40, animation: "fadeSlideIn 0.6s ease forwards 0.4s", opacity: 0 }}>
              {dims.map(dim => {
                const score = scores[dim] ?? 50;
                const color = DIMENSION_COLORS[dim];
                const q = QUESTIONS.find(q => q.dimension === dim);
                const wasRefined = aiRefinements[dim] !== undefined;
                return (
                  <div key={dim} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(201,168,76,0.06)" }}>
                    <span style={{ color, fontSize: 14, flexShrink: 0 }}>{DIMENSION_ICONS[dim]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.06em", color: C.parchmentDim, textTransform: "uppercase" }}>{q?.label || dim}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 13, color, marginLeft: 6 }}>{Math.round(score)}</span>
                      </div>
                      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ "--bar-w": `${score}%`, height: "100%", width: `${score}%`, background: color, borderRadius: 2, animation: "barGrow 1s ease forwards 0.6s" }} />
                      </div>
                    </div>
                    {wasRefined && <span title="Refined by your written response" style={{ fontSize: 9, color: C.gold, flexShrink: 0 }}>✦</span>}
                  </div>
                );
              })}
            </div>

            {/* Politician matches */}
            {matches.length > 0 && (
              <div style={{ marginBottom: 40, animation: "fadeSlideIn 0.6s ease forwards 0.6s", opacity: 0 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: "0.25em", color: C.parchmentDim, textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                  YOUR CLOSEST MATCHES <div style={{ flex: 1, height: 1, background: "rgba(201,168,76,0.12)" }} />
                </div>
                {matches.map((pol, i) => {
                  const pc = partyColor(pol.party);
                  const initials = pol.name.split(" ").map(w => w[0]).slice(0, 2).join("");
                  const photoUrl = pol.bioguide_id ? `https://bioguide.congress.gov/bioguide/photo/${pol.bioguide_id[0]}/${pol.bioguide_id}.jpg` : null;
                  const matchPct = Math.max(0, Math.round(100 - (pol.distance / 12)));
                  return (
                    <div key={pol.slug} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, marginBottom: 8, cursor: "pointer" }}
                      onClick={() => router.push(`/politician/${pol.slug}`)}
                      onMouseEnter={e => e.currentTarget.style.borderColor = C.goldBorder}
                      onMouseLeave={e => e.currentTarget.style.borderColor = C.goldBorderDim}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: pc + "22", color: pc, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 14, flexShrink: 0, overflow: "hidden", border: `1.5px solid ${pc}44` }}>
                        {photoUrl ? <img src={photoUrl} alt={pol.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} onError={e => e.target.style.display = "none"} /> : initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.parchment }}>{pol.name}</div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim }}>{pol.party} · {pol.state} · {pol.chamber}</div>
                      </div>
                      <div style={{ textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: C.green }}>{matchPct}%</div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: C.parchmentDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>match</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* No matches yet */}
            {matches.length === 0 && (
              <div style={{ marginBottom: 40, padding: 20, background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, textAlign: "center", animation: "fadeSlideIn 0.6s ease forwards 0.6s", opacity: 0 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 16, color: C.parchment, marginBottom: 8 }}>Politician matches coming soon</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.6 }}>We're still loading FEC data for all 538 members. Once that's live, you'll see exactly which politicians vote in line with your values — and which ones don't.</div>
              </div>
            )}

            {/* Save prompt for non-logged-in users */}
            {showSavePrompt && !user && (
              <div style={{ marginBottom: 32, padding: 24, background: C.bgCard, border: `1px solid ${C.goldBorder}`, borderRadius: 2, textAlign: "center", animation: "fadeSlideIn 0.5s ease forwards" }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, letterSpacing: "0.3em", color: C.gold, marginBottom: 10 }}>SAVE YOUR THUMBPRINT</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 18, color: C.parchment, marginBottom: 8 }}>Don't lose your results.</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.6, marginBottom: 18 }}>Create a free account to save your political thumbprint, follow politicians that match your values, and get alerts when they vote.</div>
                <button onClick={() => router.push("/?signup=true")}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: "0.12em", color: C.bg, background: C.gold, border: "none", borderRadius: 2, padding: "13px 32px", cursor: "pointer" }}
                >CREATE FREE ACCOUNT →</button>
              </div>
            )}

            {/* CTA buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fadeSlideIn 0.6s ease forwards 0.8s", opacity: 0 }}>
              <button onClick={() => router.push("/")}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: "0.12em", color: C.bg, background: C.gold, border: "none", borderRadius: 2, padding: 14, cursor: "pointer" }}
              >EXPLORE POLITICIANS →</button>
              <button onClick={() => { setPhase("intro"); setQIndex(0); setAnswers({}); setSelected(null); setScores(null); setMatches([]); setWritten({}); }}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: C.parchmentDim, background: "transparent", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 2, padding: 12, cursor: "pointer" }}
              >RETAKE THE QUIZ</button>
            </div>

            {/* Deep dive teaser */}
            <div style={{ marginTop: 40, padding: 20, background: C.bgDeep, border: `1px solid ${C.goldBorderDim}`, borderRadius: 2, textAlign: "center" }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: "0.1em", color: C.gold, marginBottom: 6 }}>WANT A MORE ACCURATE PICTURE?</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, lineHeight: 1.6, marginBottom: 14 }}>Answer 12 more questions to refine your thumbprint across all dimensions. The deeper dive unlocks more precise politician matches.</div>
              <button style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: C.gold, background: "transparent", border: `1px solid ${C.goldBorder}`, borderRadius: 2, padding: "10px 24px", cursor: "pointer" }}
                onClick={() => alert("Deep dive coming soon — stay tuned.")}
              >REFINE MY RESULTS →</button>
            </div>

          </div>
        </div>
      </>
    );
  }

  // ── QUESTION ───────────────────────────────────────────────────────────────
  const dimColor = DIMENSION_COLORS[q.dimension];

  return (
    <>
      <Head><title>Quiz · Throughline</title></Head>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ minHeight: "100vh", background: C.bg, color: C.parchment, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "32px 24px 80px" }}>

          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <button onClick={() => router.push("/")} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.15em", color: C.parchmentDim, background: "none", border: "none", cursor: "pointer" }}>← THROUGHLINE</button>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: "0.1em", color: C.parchmentDim }}>{qIndex + 1} / {SHUFFLED_QUESTIONS.length}</div>
          </div>

          <ProgressBar current={qIndex} total={SHUFFLED_QUESTIONS.length} />

          {/* Question card */}
          <div style={{ marginTop: 32, animation: animOut ? "fadeSlideOut 0.3s ease forwards" : "fadeSlideIn 0.4s ease forwards" }}>

            {/* Dimension label */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 20, color: dimColor }}>{DIMENSION_ICONS[q.dimension]}</span>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: "0.25em", color: dimColor, textTransform: "uppercase" }}>{q.label}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.parchmentDim, marginTop: 1 }}>{q.context}</div>
              </div>
            </div>

            {/* Scenario */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.goldBorderDim}`, borderLeft: `3px solid ${dimColor}`, borderRadius: 2, padding: "16px 18px", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 15, color: C.parchment, lineHeight: 1.65, marginBottom: 10 }}>{q.scenario}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17, color: C.parchment }}>{q.question}</div>
            </div>

            {/* Answer options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {q.answers.map((ans, i) => (
                <button key={i}
                  className={`quiz-answer-btn${selectedAnswer === i ? " selected" : ""}`}
                  onClick={() => handleSelectAnswer(i)}
                  style={{ width: "100%", textAlign: "left", fontFamily: "'Inter', sans-serif", fontSize: 13, color: selectedAnswer === i ? C.parchment : C.parchmentDim, background: selectedAnswer === i ? "rgba(201,168,76,0.12)" : C.bgCard, border: `1.5px solid ${selectedAnswer === i ? C.gold : "rgba(201,168,76,0.12)"}`, borderRadius: 2, padding: "14px 16px", cursor: "pointer", lineHeight: 1.55, transition: "all 0.15s ease" }}
                >
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, color: selectedAnswer === i ? C.gold : C.parchmentDim, marginRight: 10, letterSpacing: "0.08em" }}>{String.fromCharCode(65 + i)}</span>
                  {ans.text}
                </button>
              ))}
            </div>

            {/* Deeper dive toggle */}
            {selectedAnswer !== null && (
              <div style={{ marginBottom: 20, animation: "fadeSlideIn 0.3s ease forwards" }}>
                <button onClick={() => setDeeperOpen(o => !o)}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.15em", color: C.gold, background: "transparent", border: `1px solid ${C.goldBorder}`, borderRadius: 2, padding: "8px 16px", cursor: "pointer" }}
                >{deeperOpen ? "▲ CLOSE" : "▼ ADD NUANCE"}</button>

                {deeperOpen && (
                  <div style={{ marginTop: 12, animation: "fadeSlideIn 0.3s ease forwards" }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.parchmentDim, marginBottom: 8, lineHeight: 1.6 }}>
                      Want to add context to your answer? Write anything — your reasoning, a personal experience, or a nuance that the options didn't capture. Our AI will factor this in.
                    </div>
                    <textarea
                      className="deeper-textarea"
                      placeholder="Tell us more about how you see this issue…"
                      value={writtenInputs[q.dimension] || ""}
                      onChange={e => setWritten(prev => ({ ...prev, [q.dimension]: e.target.value }))}
                      rows={3}
                      style={{ width: "100%", background: C.bgDeep, border: `1.5px solid ${C.goldBorderDim}`, borderRadius: 2, padding: "12px 14px", fontSize: 13, color: C.parchment, fontFamily: "'Inter', sans-serif", lineHeight: 1.6, resize: "vertical" }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Next button */}
            <button onClick={handleNext} disabled={selectedAnswer === null}
              style={{ width: "100%", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "0.15em", color: selectedAnswer !== null ? C.bg : C.parchmentDim, background: selectedAnswer !== null ? C.gold : "rgba(201,168,76,0.1)", border: "none", borderRadius: 2, padding: 15, cursor: selectedAnswer !== null ? "pointer" : "default", transition: "all 0.2s ease" }}
            >{qIndex + 1 === SHUFFLED_QUESTIONS.length ? "SEE MY RESULTS →" : "NEXT QUESTION →"}</button>

          </div>
        </div>
      </div>
    </>
  );
}
