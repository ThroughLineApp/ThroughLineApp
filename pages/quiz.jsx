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
  @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Barlow+Condensed:wght@400;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0b0d; font-family: 'Figtree', sans-serif; }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeSlideOut {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-16px); }
  }
  @keyframes fadeSlideBack {
    from { opacity: 0; transform: translateY(-16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulseGold {
    0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); }
    50%       { box-shadow: 0 0 0 8px rgba(201,168,76,0.12); }
  }
  @keyframes thumbDraw {
    from { stroke-dashoffset: 1400; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes spinnerRing {
    to { transform: rotate(360deg); }
  }
  @keyframes popIn {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }

  .answer-btn { transition: all 0.15s ease; }
  .answer-btn:hover:not(:disabled) {
    border-color: rgba(201,168,76,0.5) !important;
    background: rgba(201,168,76,0.06) !important;
    transform: translateX(3px);
  }
  .answer-btn.selected {
    border-color: #c9a84c !important;
    background: rgba(201,168,76,0.1) !important;
  }
  .answer-btn.selected:hover { transform: translateX(0); }
  .write-own-btn:hover {
    border-color: rgba(201,168,76,0.4) !important;
    color: #c9a84c !important;
  }
  textarea:focus { outline: none; border-color: rgba(201,168,76,0.45) !important; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }
`;

const DIMENSION_ICONS = {
  economic:"◈", healthcare:"✦", climate:"❋", criminal:"⊕",
  immigration:"◎", foreign:"⊞", education:"◇", freedom:"◉",
  guns:"⊗", housing:"⬡", tech:"⊛", voting:"◐",
};

const DIMENSION_COLORS = {
  economic:"#c9a84c", healthcare:"#c94c78", climate:"#4ca87c",
  criminal:"#c97c4c", immigration:"#4c78c9", foreign:"#8e4cc9",
  education:"#c98e4c", freedom:"#4cc9c9", guns:"#c94c4c",
  housing:"#78c94c", tech:"#4c8ec9", voting:"#c94c9e",
};

const QUESTIONS = [
  {
    id:"economic", dimension:"economic", label:"Economic Policy",
    context:"How we fund society — taxes, wages, and who benefits from growth.",
    scenario:"Your town's biggest factory just closed. 400 people lost their jobs overnight.",
    question:"What should happen next?",
    answers:[
      { text:"Get government out of the way. Cut taxes, reduce regulations, and businesses will come back on their own.", score:12 },
      { text:"Retrain the workers and provide temporary support. The market will recover — people just need a bridge.", score:48 },
      { text:"This is what we pay taxes for. Fund retraining, extend benefits, make sure no family goes under.", score:68 },
      { text:"Tax the corporations that extracted wealth from this town for decades. Time to give something back.", score:88 },
      { text:"Washington won't fix this. Local churches, neighbors, and community organizations know these families.", score:22 },
    ],
  },
  {
    id:"healthcare", dimension:"healthcare", label:"Healthcare",
    context:"Who pays for medical care — and who gets left out.",
    scenario:"Your neighbor was just diagnosed with cancer. She works full time but her insurance won't cover the treatment she needs.",
    question:"What should happen?",
    answers:[
      { text:"Tragic — but the answer is more competition, not government takeover. Better markets create better options.", score:14 },
      { text:"There should be a public backup option. No one should fall through the cracks in the richest country on earth.", score:58 },
      { text:"Every person deserves the same care regardless of their job or bank account. That's not radical — it's basic.", score:82 },
      { text:"The entire insurance industry exists to deny claims. Abolish it and replace it with something that actually works.", score:96 },
      { text:"Communities take care of their own. Neighbors, faith groups, and local fundraising have always come through.", score:24 },
    ],
  },
  {
    id:"climate", dimension:"climate", label:"Climate & Energy",
    context:"Balancing jobs, energy costs, and the long-term health of the planet.",
    scenario:"A new coal plant is proposed for your county. It'll bring 200 jobs — but scientists say it'll worsen air quality and contribute to long-term climate damage.",
    question:"What do you think?",
    answers:[
      { text:"Build it. American workers need jobs and America needs energy independence. Climate activists don't live here.", score:8 },
      { text:"Approve it with strict environmental standards. We need both jobs and accountability.", score:42 },
      { text:"Invest in clean energy jobs instead — transition the workforce rather than lock in 30 more years of fossil fuels.", score:72 },
      { text:"Don't build it. No short-term jobs are worth the long-term damage to health, air, and the climate.", score:92 },
      { text:"This decision belongs to the people who live here — not federal agencies or outside environmental groups.", score:28 },
    ],
  },
  {
    id:"criminal", dimension:"criminal", label:"Criminal Justice",
    context:"How society responds when people break the law — and why they do.",
    scenario:"A young man in your city gets caught with drugs for the third time. He grew up in poverty with almost no real opportunities.",
    question:"What should the system do?",
    answers:[
      { text:"The law has to mean something. Consistent consequences are the only real deterrent.", score:14 },
      { text:"Judges need discretion. Mandatory minimums punish people, not circumstances — and the circumstances matter here.", score:46 },
      { text:"He needs treatment and a real job — not another prison sentence that makes everything worse.", score:74 },
      { text:"The system that created his circumstances is the real criminal. We need root-and-branch reform.", score:94 },
      { text:"Faith-based programs reach people that government programs never can. That's where real change happens.", score:28 },
    ],
  },
  {
    id:"immigration", dimension:"immigration", label:"Immigration",
    context:"Who belongs here — and what we owe people who've built lives in America.",
    scenario:"A family from Central America has lived in your town for 12 years. They own a small business. Their kids go to local schools. They're undocumented.",
    question:"What happens now?",
    answers:[
      { text:"The law is the law. No exceptions — or the rule of law becomes meaningless for everyone.", score:10 },
      { text:"12 years, a business, kids in school — they've earned a path to legal status.", score:62 },
      { text:"People who build lives here belong here. Full stop. They should be citizens.", score:88 },
      { text:"Fix the broken legal system that created this — make it possible to come here the right way.", score:48 },
      { text:"We need to reduce immigration levels to protect American workers and preserve community character.", score:18 },
    ],
  },
  {
    id:"foreign", dimension:"foreign", label:"Foreign Policy",
    context:"America's role in the world — when to act and when to stay out.",
    scenario:"Congress is debating whether to send $10 billion in aid and weapons to an ally that's under military attack.",
    question:"What should America do?",
    answers:[
      { text:"Only act if American lives or American soil are directly at risk. Otherwise — stay out.", score:28 },
      { text:"Standing by allies is what keeps the world from falling into chaos. Weakness invites more aggression.", score:72 },
      { text:"Help diplomatically and with humanitarian aid — but keep American weapons and troops at home.", score:48 },
      { text:"International coalitions exist for exactly this. Work through the UN, not unilateral American action.", score:64 },
      { text:"Defense contractors profit from endless war. Stop funding it. The military-industrial complex is the problem.", score:90 },
    ],
  },
  {
    id:"education", dimension:"education", label:"Education",
    context:"What we owe every child — and who's responsible for delivering it.",
    scenario:"Two kids live 10 miles apart. One goes to a well-funded suburban school with small classes. The other goes to a crumbling underfunded school with 35 kids per class.",
    question:"What should be done?",
    answers:[
      { text:"School choice and vouchers let families escape failing schools. Competition makes everything better.", score:22 },
      { text:"Federal funding should be equalized. A child's future shouldn't depend on their zip code.", score:68 },
      { text:"Education is a right — fund it fully and equally so every school has what it needs. Period.", score:88 },
      { text:"Teachers unions protect a broken system. Real reform starts with accountability, not just more money.", score:18 },
      { text:"Education works best when communities control it — the federal government has made schools worse, not better.", score:32 },
    ],
  },
  {
    id:"freedom", dimension:"freedom", label:"Personal Freedom",
    context:"Where individual choices end and society's interests begin.",
    scenario:"Your state is debating whether to restrict something that many people find controversial — but that only directly affects the person doing it.",
    question:"Where do you stand?",
    answers:[
      { text:"Government has no business in personal choices that don't harm others. That's the whole point of freedom.", score:88 },
      { text:"Individual liberty is America's foundation. Protect it completely — no exceptions, no compromise.", score:82 },
      { text:"Some moral guardrails exist for a reason. Society has a legitimate interest in what people do.", score:28 },
      { text:"Communities should set their own standards — not Washington. Local decisions for local values.", score:42 },
      { text:"True freedom requires economic security. You can't be free if you're one crisis from losing everything.", score:76 },
    ],
  },
  {
    id:"guns", dimension:"guns", label:"Gun Policy",
    context:"The Second Amendment, public safety, and where to draw the line.",
    scenario:"A mass shooting happens at a school two towns over. Twenty-two people are killed. Congress is called to act.",
    question:"What should they do?",
    answers:[
      { text:"The Second Amendment is non-negotiable. Any restriction is a step toward disarming law-abiding citizens.", score:8 },
      { text:"More trained, armed people on campus save lives. The answer is protection, not restriction.", score:18 },
      { text:"Background checks and red flag laws are reasonable steps that don't ban anything from responsible owners.", score:58 },
      { text:"Mental health is the real issue — treat the root cause instead of stripping constitutional rights.", score:32 },
      { text:"Military-style weapons have no place in civilian life. Ban them, buy them back, and enforce it.", score:88 },
    ],
  },
  {
    id:"housing", dimension:"housing", label:"Housing & Urban",
    context:"The crisis of affordable homes — and who's responsible for solving it.",
    scenario:"Rent in your city has doubled in five years. Teachers, nurses, and service workers are being pushed out. Homeless encampments are growing.",
    question:"What's the solution?",
    answers:[
      { text:"Zoning laws and regulations are strangling housing supply. Deregulate and build — the market will respond.", score:28 },
      { text:"Tax incentives for developers who build affordable units — nudge the market rather than replace it.", score:52 },
      { text:"The government needs to invest heavily in public housing. Private developers will never serve low-income people.", score:80 },
      { text:"Treating homes as investment vehicles is the root problem. The whole system needs to be rethought.", score:94 },
      { text:"Rent control has made things worse everywhere it's been tried. Free the market and prices will stabilize.", score:18 },
    ],
  },
  {
    id:"tech", dimension:"tech", label:"Tech & Privacy",
    context:"Big Tech, personal data, and who really owns your digital life.",
    scenario:"You just found out a major app has been selling your location, browsing history, and private messages to advertisers and political campaigns — without your knowledge.",
    question:"What should happen?",
    answers:[
      { text:"That's the deal with free services. Read the terms of service — no one forced you to use it.", score:16 },
      { text:"There should be clear, enforceable laws about what data can be collected, sold, and for how long.", score:62 },
      { text:"Big Tech has too much unchecked power. Break them up and regulate them like the utilities they've become.", score:82 },
      { text:"Your data belongs to you. No company should be able to own or sell it without your active ongoing consent.", score:92 },
      { text:"If people don't like it, they'll use different apps. Let market pressure fix this — not government mandates.", score:14 },
    ],
  },
  {
    id:"voting", dimension:"voting", label:"Electoral Rights",
    context:"Access to the ballot — and what a healthy democracy actually requires.",
    scenario:"Turnout in your city's last election was 28%. Young people, renters, and shift workers barely voted. Well-funded candidates dominated the airwaves.",
    question:"What do you do?",
    answers:[
      { text:"Low turnout reflects civic disengagement — making voting easier won't fix a culture that doesn't value it.", score:24 },
      { text:"Voter ID protects election integrity. We can expand access AND maintain the security people deserve.", score:38 },
      { text:"Automatic registration, mail-in ballots, and early voting remove real barriers for working people.", score:72 },
      { text:"Election Day should be a national holiday. Automatic registration at 18. This is basic in every other democracy.", score:88 },
      { text:"Unlimited money in elections is the real problem. Until we fix campaign finance, nothing else matters.", score:80 },
    ],
  },
];

function shuffleAnswers(qs) {
  return qs.map(q => ({ ...q, answers: [...q.answers].sort(() => Math.random() - 0.5) }));
}

const SHUFFLED = shuffleAnswers(QUESTIONS);
const MAX_SKIPS = 4;

function polygonPoints(scores, cx, cy, r) {
  const dims = Object.keys(DIMENSION_COLORS);
  return dims.map((dim, i) => {
    const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
    const rad = ((scores[dim] ?? 50) / 100) * r;
    return [cx + rad * Math.cos(angle), cy + rad * Math.sin(angle)];
  });
}

function ThumbprintSVG({ scores, size = 280, animate = true }) {
  const cx = size / 2, cy = size / 2, r = size * 0.40;
  const dims = Object.keys(DIMENSION_COLORS);
  const pts = polygonPoints(scores, cx, cy, r);
  const polyStr = pts.map(p => p.join(",")).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25,0.5,0.75,1.0].map(ring => {
        const rp = dims.map((_,i) => { const a=(Math.PI*2*i)/dims.length-Math.PI/2; return [cx+ring*r*Math.cos(a),cy+ring*r*Math.sin(a)]; });
        return <polygon key={ring} points={rp.map(p=>p.join(",")).join(" ")} fill="none" stroke="rgba(201,168,76,0.07)" strokeWidth="1"/>;
      })}
      {dims.map((_,i) => { const a=(Math.PI*2*i)/dims.length-Math.PI/2; return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="rgba(201,168,76,0.09)" strokeWidth="1"/>; })}
      <polygon points={polyStr} fill="rgba(201,168,76,0.07)" stroke="#c9a84c" strokeWidth="2.5" strokeLinejoin="round"
        style={animate ? { strokeDasharray:1400, strokeDashoffset:1400, animation:"thumbDraw 2s ease forwards 0.4s" } : {}} />
      {pts.map((pt,i) => <circle key={i} cx={pt[0]} cy={pt[1]} r={4.5} fill={Object.values(DIMENSION_COLORS)[i]} opacity={0.9}/>)}
      {dims.map((dim,i) => { const a=(Math.PI*2*i)/dims.length-Math.PI/2; const lr=r+24; return (
        <text key={dim} x={cx+lr*Math.cos(a)} y={cy+lr*Math.sin(a)} textAnchor="middle" dominantBaseline="middle"
          fontSize="8" fontFamily="'Barlow Condensed',sans-serif" fontWeight="700" fill={DIMENSION_COLORS[dim]} opacity={0.75}
        >{DIMENSION_ICONS[dim]}</text>
      );})}
    </svg>
  );
}

function ProgressBar({ current, total, skipped }) {
  return (
    <div>
      <div style={{ width:"100%", height:3, background:"rgba(201,168,76,0.08)", borderRadius:2, overflow:"hidden", marginBottom:6 }}>
        <div style={{ height:"100%", width:`${(current/total)*100}%`, background:C.gold, borderRadius:2, transition:"width 0.4s ease" }}/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontFamily:"'Figtree',sans-serif", fontSize:12, color:C.parchmentDim }}>{current} of {total} questions</span>
        {skipped > 0 && <span style={{ fontFamily:"'Figtree',sans-serif", fontSize:11, color:C.parchmentDim, opacity:0.6 }}>{skipped} skipped</span>}
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{ width:42, height:42, borderRadius:"50%", border:"3px solid rgba(201,168,76,0.12)", borderTopColor:C.gold, animation:"spinnerRing 0.85s linear infinite", margin:"0 auto" }}/>;
}

export default function QuizPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [phase, setPhase]           = useState("intro");
  const [animDir, setAnimDir]       = useState("forward");
  const [animating, setAnimating]   = useState(false);
  const [qIndex, setQIndex]         = useState(0);
  const [answers, setAnswers]       = useState({});
  const [written, setWritten]       = useState({});
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [writeOwn, setWriteOwn]     = useState(false);
  const [ownText, setOwnText]       = useState("");
  const [deeperOpen, setDeeperOpen] = useState(false);
  const [skipWarning, setSkipWarning] = useState(false);
  const [scores, setScores]         = useState(null);
  const [matches, setMatches]       = useState([]);
  const [processingMsg, setProcessingMsg] = useState("Analyzing your responses…");
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  const q = SHUFFLED[qIndex];
  const skippedCount = Object.values(answers).filter(v => v === "skipped").length;
  const canProceed = selectedIdx !== null || (writeOwn && ownText.trim().length > 0);

  const transition = (dir, fn) => {
    if (animating) return;
    setAnimDir(dir);
    setAnimating(true);
    setTimeout(() => { fn(); setAnimating(false); }, 280);
  };

  const handleSelect = (i) => { setSelectedIdx(i); setWriteOwn(false); setOwnText(""); setDeeperOpen(false); };
  const handleWriteOwn = () => { setSelectedIdx(null); setWriteOwn(true); setDeeperOpen(false); };

  const handleNext = () => {
    if (!canProceed) return;
    const score = writeOwn ? 50 : q.answers[selectedIdx].score;
    const writtenText = writeOwn ? ownText.trim() : (deeperOpen && written[q.dimension]?.trim() ? written[q.dimension].trim() : null);
    const newAnswers = { ...answers, [q.dimension]: score };
    const newWritten = writtenText ? { ...written, [q.dimension]: writtenText } : written;
    transition("forward", () => {
      setAnswers(newAnswers); setWritten(newWritten);
      setSelectedIdx(null); setWriteOwn(false); setOwnText(""); setDeeperOpen(false); setSkipWarning(false);
      if (qIndex + 1 >= SHUFFLED.length) { setPhase("processing"); runProcessing(newAnswers, newWritten); }
      else setQIndex(i => i + 1);
    });
  };

  const handleBack = () => {
    if (qIndex === 0) return;
    transition("back", () => {
      setQIndex(i => i - 1); setSelectedIdx(null); setWriteOwn(false); setOwnText(""); setDeeperOpen(false); setSkipWarning(false);
    });
  };

  const handleSkip = () => {
    if (skippedCount >= MAX_SKIPS) { setSkipWarning(true); return; }
    const newAnswers = { ...answers, [q.dimension]: "skipped" };
    transition("forward", () => {
      setAnswers(newAnswers); setSelectedIdx(null); setWriteOwn(false); setOwnText(""); setDeeperOpen(false); setSkipWarning(false);
      if (qIndex + 1 >= SHUFFLED.length) { setPhase("processing"); runProcessing(newAnswers, written); }
      else setQIndex(i => i + 1);
    });
  };

  const runProcessing = async (rawAnswers, writtenInputs) => {
    setProcessingMsg("Reading your answers…");
    const numeric = Object.fromEntries(Object.entries(rawAnswers).filter(([,v]) => v !== "skipped"));
    let refined = { ...numeric };

    if (Object.values(writtenInputs).some(v => v?.trim())) {
      setProcessingMsg("Analyzing your written responses…");
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            model:"claude-sonnet-4-20250514", max_tokens:600,
            messages:[{ role:"user", content:`Refine political ideology scores (0=conservative,100=progressive).
Base scores: ${Object.entries(numeric).map(([k,v])=>`${k}:${v}`).join(", ")}
Written responses: ${Object.entries(writtenInputs).filter(([,v])=>v?.trim()).map(([k,v])=>`${k}:"${v}"`).join("\n")}
Return ONLY JSON for dimensions that have written responses. Example: {"economic":72}
No markdown, no explanation.` }],
          }),
        });
        const data = await res.json();
        const parsed = JSON.parse((data.content?.[0]?.text || "{}").replace(/```json|```/g,"").trim());
        refined = { ...numeric, ...parsed };
      } catch(e) { console.error("AI error",e); }
    }

    setProcessingMsg("Building your political thumbprint…");
    await new Promise(r => setTimeout(r, 700));

    const fullScores = Object.fromEntries(Object.keys(DIMENSION_COLORS).map(d => [d, refined[d] ?? 50]));
    setScores(fullScores);

    setProcessingMsg("Finding your closest matches…");
    try {
      const { data: pols } = await supabase.from("politicians")
        .select("name,slug,party,state,chamber,bioguide_id,score_economic,score_healthcare,score_climate,score_criminal,score_immigration,score_foreign,score_education,score_freedom,score_guns,score_housing,score_tech,score_voting")
        .not("score_economic","is",null).limit(538);
      if (pols?.length) {
        const dims = Object.keys(DIMENSION_COLORS);
        const ranked = pols.map(p => ({
          ...p,
          distance: Math.sqrt(dims.reduce((sum,d) => {
            if (rawAnswers[d] === "skipped") return sum;
            return sum + Math.pow((refined[d]??50) - (p[`score_${d}`]??50), 2);
          }, 0))
        })).sort((a,b) => a.distance - b.distance);
        setMatches(ranked.slice(0,3));
      }
    } catch(e) { console.error("Match error",e); }

    try {
      const row = {
        user_id: user?.id || null,
        session_id: crypto.randomUUID(),
        completed_at: new Date().toISOString(),
        tier: "basic",
        ...Object.fromEntries(Object.keys(DIMENSION_COLORS).map(d => [`score_${d}`, fullScores[d]])),
        profile_summary: (() => {
          const avg = Object.values(fullScores).reduce((a,b)=>a+b,0)/12;
          if (avg>78) return "Progressive"; if (avg>62) return "Center-Left";
          if (avg>45) return "Moderate"; if (avg>30) return "Center-Right"; return "Conservative";
        })(),
      };
      const { data, error } = await supabase.from("quiz_results").insert(row).select().single();
      if (!error && data) {
        if (user?.id) await supabase.from("profiles").update({ quiz_result_id: data.id }).eq("id", user.id);
        else setShowSavePrompt(true);
      }
    } catch(e) { console.error("Save error",e); }

    setPhase("results");
  };

  const partyColor = p => p==="D" ? C.blue : p==="R" ? C.red : C.purple;
  const animStyle = animating
    ? { animation: `${animDir==="forward" ? "fadeSlideOut" : "fadeSlideIn"} 0.28s ease forwards` }
    : { animation: `${animDir==="back" ? "fadeSlideBack" : "fadeSlideIn"} 0.32s ease forwards` };

  // ─── INTRO ────────────────────────────────────────────────────────────────
  if (phase === "intro") return (
    <>
      <Head><title>Your Political Thumbprint · Throughline</title></Head>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", textAlign:"center" }}>
        <div style={{ position:"fixed", top:"28%", left:"50%", transform:"translateX(-50%)", width:600, height:400, background:"radial-gradient(ellipse,rgba(201,168,76,0.04) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ maxWidth:520, animation:"fadeSlideIn 0.6s ease forwards" }}>
          <button onClick={() => router.push("/")} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:12, letterSpacing:"0.2em", color:C.gold, background:"none", border:"none", cursor:"pointer", marginBottom:44 }}>← THROUGHLINE</button>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:"0.35em", color:C.gold, marginBottom:18 }}>YOUR POLITICAL THUMBPRINT</div>
          <h1 style={{ fontFamily:"'Figtree',sans-serif", fontWeight:800, fontSize:"clamp(26px,5.5vw,40px)", color:C.parchment, lineHeight:1.2, marginBottom:18 }}>
            What do you actually believe —<br /><span style={{ color:C.gold }}>and who votes like you?</span>
          </h1>
          <p style={{ fontFamily:"'Figtree',sans-serif", fontWeight:400, fontSize:15, color:C.parchmentDim, lineHeight:1.8, marginBottom:12 }}>
            12 real-world scenarios. No political jargon. No right or wrong answers.<br />
            We'll map your beliefs and show you which members of Congress actually represent your values.
          </p>
          <p style={{ fontFamily:"'Figtree',sans-serif", fontSize:13, color:C.parchmentDim, lineHeight:1.6, marginBottom:40, opacity:0.65 }}>
            No ideology labels. Just your thumbprint.
          </p>
          <div style={{ margin:"0 auto 40px", opacity:0.3 }}>
            <ThumbprintSVG scores={Object.fromEntries(Object.keys(DIMENSION_COLORS).map(d=>[d,30+Math.random()*50]))} animate={false} size={210}/>
          </div>
          <button onClick={() => setPhase("question")}
            style={{ fontFamily:"'Figtree',sans-serif", fontWeight:800, fontSize:16, color:C.bg, background:C.gold, border:"none", borderRadius:4, padding:"16px 52px", cursor:"pointer", marginBottom:14, animation:"pulseGold 2.8s ease-in-out infinite" }}
          >Start the Quiz →</button>
          <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:12, color:C.parchmentDim, opacity:0.65 }}>~5 minutes · No account required · Skip any question</div>
        </div>
      </div>
    </>
  );

  // ─── PROCESSING ───────────────────────────────────────────────────────────
  if (phase === "processing") return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:28, padding:24, textAlign:"center" }}>
        <Spinner/>
        <div style={{ fontFamily:"'Figtree',sans-serif", fontWeight:600, fontSize:20, color:C.parchment }}>{processingMsg}</div>
        <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:13, color:C.parchmentDim, lineHeight:1.6, maxWidth:340 }}>Building your political thumbprint from your responses…</div>
      </div>
    </>
  );

  // ─── RESULTS ──────────────────────────────────────────────────────────────
  if (phase === "results" && scores) {
    const dims = Object.keys(DIMENSION_COLORS);
    return (
      <>
        <Head><title>Your Political Thumbprint · Throughline</title></Head>
        <style>{GLOBAL_STYLES}</style>
        <div style={{ minHeight:"100vh", background:C.bg, color:C.parchment }}>
          <div style={{ maxWidth:580, margin:"0 auto", padding:"44px 24px 80px" }}>

            <div style={{ textAlign:"center", marginBottom:36, animation:"fadeSlideIn 0.6s ease forwards" }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:"0.35em", color:C.gold, marginBottom:14 }}>YOUR POLITICAL THUMBPRINT</div>
              <h1 style={{ fontFamily:"'Figtree',sans-serif", fontWeight:800, fontSize:"clamp(22px,5vw,34px)", color:C.parchment, lineHeight:1.2, marginBottom:12 }}>No two are exactly alike.</h1>
              <p style={{ fontFamily:"'Figtree',sans-serif", fontSize:14, color:C.parchmentDim, lineHeight:1.75, maxWidth:420, margin:"0 auto" }}>
                Each axis is one policy dimension. The further the point extends, the stronger your position on that issue.
              </p>
            </div>

            <div style={{ display:"flex", justifyContent:"center", marginBottom:12, animation:"fadeSlideIn 0.6s ease forwards 0.2s", opacity:0 }}>
              <ThumbprintSVG scores={scores} size={290} animate={true}/>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 20px", marginBottom:44, animation:"fadeSlideIn 0.6s ease forwards 0.4s", opacity:0 }}>
              {dims.map(dim => {
                const score = scores[dim] ?? 50;
                const color = DIMENSION_COLORS[dim];
                const qs = QUESTIONS.find(q=>q.dimension===dim);
                const wasSkipped = answers[dim] === "skipped";
                return (
                  <div key={dim} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"1px solid rgba(201,168,76,0.05)" }}>
                    <span style={{ color, fontSize:14, flexShrink:0 }}>{DIMENSION_ICONS[dim]}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <span style={{ fontFamily:"'Figtree',sans-serif", fontWeight:600, fontSize:11, color:C.parchmentDim, opacity:wasSkipped?0.5:1 }}>{qs?.label||dim}</span>
                        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:13, color:wasSkipped?C.parchmentDim:color, marginLeft:6, opacity:wasSkipped?0.4:1 }}>{wasSkipped?"—":Math.round(score)}</span>
                      </div>
                      <div style={{ height:3, background:"rgba(255,255,255,0.05)", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${wasSkipped?0:score}%`, background:color, borderRadius:2, transition:"width 1s ease 0.6s" }}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {matches.length > 0 ? (
              <div style={{ marginBottom:44, animation:"fadeSlideIn 0.6s ease forwards 0.6s", opacity:0 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:"0.28em", color:C.parchmentDim, textTransform:"uppercase", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
                  YOUR CLOSEST MATCHES <div style={{ flex:1, height:1, background:"rgba(201,168,76,0.1)" }}/>
                </div>
                {matches.map(pol => {
                  const pc = partyColor(pol.party);
                  const initials = pol.name.split(" ").map(w=>w[0]).slice(0,2).join("");
                  const photoUrl = pol.bioguide_id ? `https://bioguide.congress.gov/bioguide/photo/${pol.bioguide_id[0]}/${pol.bioguide_id}.jpg` : null;
                  const matchPct = Math.max(55, Math.round(100-(pol.distance/10)));
                  return (
                    <div key={pol.slug} onClick={() => router.push(`/politician/${pol.slug}`)}
                      style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:C.bgCard, border:`1px solid ${C.goldBorderDim}`, borderRadius:4, marginBottom:8, cursor:"pointer", transition:"border-color 0.15s ease" }}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=C.goldBorder}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=C.goldBorderDim}
                    >
                      <div style={{ width:46, height:46, borderRadius:"50%", background:pc+"20", color:pc, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:14, flexShrink:0, overflow:"hidden", border:`1.5px solid ${pc}40` }}>
                        {photoUrl ? <img src={photoUrl} alt={pol.name} style={{ width:"100%",height:"100%",objectFit:"cover",objectPosition:"top" }} onError={e=>e.target.style.display="none"}/> : initials}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:"'Figtree',sans-serif", fontWeight:700, fontSize:15, color:C.parchment }}>{pol.name}</div>
                        <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:12, color:C.parchmentDim }}>{pol.party} · {pol.state} · {pol.chamber}</div>
                      </div>
                      <div style={{ textAlign:"center", flexShrink:0 }}>
                        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:24, color:C.green }}>{matchPct}%</div>
                        <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:10, color:C.parchmentDim }}>match</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ marginBottom:44, padding:22, background:C.bgCard, border:`1px solid ${C.goldBorderDim}`, borderRadius:4, textAlign:"center", animation:"fadeSlideIn 0.6s ease forwards 0.6s", opacity:0 }}>
                <div style={{ fontFamily:"'Figtree',sans-serif", fontWeight:700, fontSize:16, color:C.parchment, marginBottom:8 }}>Politician matches coming soon</div>
                <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:13, color:C.parchmentDim, lineHeight:1.65 }}>We're processing FEC data for all 538 members. Once it's live, you'll see exactly who votes in line with your values.</div>
              </div>
            )}

            {showSavePrompt && !user && (
              <div style={{ marginBottom:32, padding:26, background:C.bgCard, border:`1px solid ${C.goldBorder}`, borderRadius:4, textAlign:"center", animation:"popIn 0.4s ease forwards" }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, letterSpacing:"0.3em", color:C.gold, marginBottom:10 }}>SAVE YOUR THUMBPRINT</div>
                <div style={{ fontFamily:"'Figtree',sans-serif", fontWeight:700, fontSize:18, color:C.parchment, marginBottom:8 }}>Don't lose your results.</div>
                <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:13, color:C.parchmentDim, lineHeight:1.7, marginBottom:20 }}>Create a free account to save your thumbprint, follow politicians that match your values, and get alerts when they vote.</div>
                <button onClick={() => router.push("/?signup=true")}
                  style={{ fontFamily:"'Figtree',sans-serif", fontWeight:800, fontSize:15, color:C.bg, background:C.gold, border:"none", borderRadius:4, padding:"14px 36px", cursor:"pointer" }}
                >Create Free Account →</button>
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:10, animation:"fadeSlideIn 0.6s ease forwards 0.8s", opacity:0 }}>
              <button onClick={() => router.push("/")}
                style={{ fontFamily:"'Figtree',sans-serif", fontWeight:800, fontSize:15, color:C.bg, background:C.gold, border:"none", borderRadius:4, padding:15, cursor:"pointer" }}
              >Explore Politicians →</button>
              <button onClick={() => { setPhase("intro");setQIndex(0);setAnswers({});setWritten({});setSelectedIdx(null);setScores(null);setMatches([]); }}
                style={{ fontFamily:"'Figtree',sans-serif", fontWeight:600, fontSize:13, color:C.parchmentDim, background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:4, padding:13, cursor:"pointer" }}
              >Retake the Quiz</button>
            </div>

            <div style={{ marginTop:40, padding:22, background:C.bgDeep, border:`1px solid ${C.goldBorderDim}`, borderRadius:4, textAlign:"center" }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:13, letterSpacing:"0.12em", color:C.gold, marginBottom:8 }}>WANT A MORE ACCURATE PICTURE?</div>
              <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:13, color:C.parchmentDim, lineHeight:1.7, marginBottom:16 }}>Answer 12 more questions to refine your thumbprint and unlock more precise politician matches.</div>
              <button onClick={() => alert("Deep dive coming soon.")}
                style={{ fontFamily:"'Figtree',sans-serif", fontWeight:700, fontSize:13, color:C.gold, background:"transparent", border:`1px solid ${C.goldBorder}`, borderRadius:4, padding:"10px 24px", cursor:"pointer" }}
              >Refine My Results →</button>
            </div>

          </div>
        </div>
      </>
    );
  }

  // ─── QUESTION ─────────────────────────────────────────────────────────────
  const dimColor = DIMENSION_COLORS[q.dimension];

  return (
    <>
      <Head><title>Quiz · Throughline</title></Head>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ minHeight:"100vh", background:C.bg, color:C.parchment }}>
        <div style={{ maxWidth:600, margin:"0 auto", padding:"28px 20px 80px" }}>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
            <button onClick={() => router.push("/")} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:12, letterSpacing:"0.15em", color:C.parchmentDim, background:"none", border:"none", cursor:"pointer" }}>← THROUGHLINE</button>
            <div style={{ fontFamily:"'Figtree',sans-serif", fontWeight:600, fontSize:12, color:C.parchmentDim }}>Question {qIndex+1} of {SHUFFLED.length}</div>
          </div>

          <div style={{ marginBottom:28 }}>
            <ProgressBar current={qIndex+1} total={SHUFFLED.length} skipped={skippedCount}/>
          </div>

          <div style={animStyle}>

            {/* Dimension chip */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 14px", borderRadius:20, background:dimColor+"14", border:`1px solid ${dimColor}30`, marginBottom:20 }}>
              <span style={{ fontSize:14, color:dimColor }}>{DIMENSION_ICONS[q.dimension]}</span>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:"0.2em", color:dimColor, textTransform:"uppercase" }}>{q.label}</span>
            </div>

            {/* Scenario */}
            <div style={{ background:C.bgCard, borderLeft:`3px solid ${dimColor}`, borderRadius:"0 4px 4px 0", padding:"18px 20px", marginBottom:8 }}>
              <p style={{ fontFamily:"'Figtree',sans-serif", fontWeight:400, fontSize:15, color:C.parchmentDim, lineHeight:1.7, marginBottom:10 }}>{q.scenario}</p>
              <p style={{ fontFamily:"'Figtree',sans-serif", fontWeight:700, fontSize:19, color:C.parchment, lineHeight:1.35 }}>{q.question}</p>
            </div>
            <div style={{ fontFamily:"'Figtree',sans-serif", fontSize:12, color:C.parchmentDim, marginBottom:22, paddingLeft:4, opacity:0.7 }}>{q.context}</div>

            {/* Answers */}
            <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:14 }}>
              {q.answers.map((ans,i) => (
                <button key={i} className={`answer-btn${selectedIdx===i?" selected":""}`} onClick={() => handleSelect(i)}
                  style={{ width:"100%", textAlign:"left", fontFamily:"'Figtree',sans-serif", fontWeight:selectedIdx===i?600:400, fontSize:14, color:selectedIdx===i?C.parchment:C.parchmentDim, background:selectedIdx===i?"rgba(201,168,76,0.1)":C.bgCard, border:`1.5px solid ${selectedIdx===i?C.gold:"rgba(201,168,76,0.1)"}`, borderRadius:4, padding:"14px 16px", cursor:"pointer", lineHeight:1.6 }}
                >
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:selectedIdx===i?C.gold:"rgba(201,168,76,0.35)", marginRight:10, letterSpacing:"0.06em" }}>{String.fromCharCode(65+i)}</span>
                  {ans.text}
                </button>
              ))}

              {/* None of these fit me */}
              <button className="write-own-btn" onClick={handleWriteOwn}
                style={{ width:"100%", textAlign:"left", fontFamily:"'Figtree',sans-serif", fontWeight:writeOwn?600:400, fontSize:13, color:writeOwn?C.gold:C.parchmentDim, background:writeOwn?"rgba(201,168,76,0.08)":"transparent", border:`1.5px dashed ${writeOwn?C.goldBorder:"rgba(201,168,76,0.18)"}`, borderRadius:4, padding:"12px 16px", cursor:"pointer", lineHeight:1.5, transition:"all 0.15s ease" }}
              >
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, color:writeOwn?C.gold:"rgba(201,168,76,0.4)", marginRight:10, letterSpacing:"0.1em" }}>✎</span>
                None of these fit me — write my own response
              </button>
            </div>

            {/* Write own textarea */}
            {writeOwn && (
              <div style={{ marginBottom:16, animation:"fadeSlideIn 0.25s ease forwards" }}>
                <p style={{ fontFamily:"'Figtree',sans-serif", fontSize:13, color:C.parchmentDim, marginBottom:8, lineHeight:1.65 }}>
                  Describe how you actually see this issue. Our AI will analyze your response and map it to your thumbprint.
                </p>
                <textarea placeholder="Type your view here…" value={ownText} onChange={e => setOwnText(e.target.value)} rows={4}
                  style={{ width:"100%", background:C.bgDeep, border:`1.5px solid ${C.goldBorderDim}`, borderRadius:4, padding:"12px 14px", fontSize:14, color:C.parchment, fontFamily:"'Figtree',sans-serif", lineHeight:1.65, resize:"vertical" }}
                />
              </div>
            )}

            {/* Add nuance */}
            {selectedIdx !== null && (
              <div style={{ marginBottom:16, animation:"fadeSlideIn 0.25s ease forwards" }}>
                <button onClick={() => setDeeperOpen(o=>!o)}
                  style={{ fontFamily:"'Figtree',sans-serif", fontWeight:600, fontSize:12, color:deeperOpen?C.gold:C.parchmentDim, background:"transparent", border:`1px solid ${deeperOpen?C.goldBorder:"rgba(201,168,76,0.15)"}`, borderRadius:4, padding:"7px 14px", cursor:"pointer", transition:"all 0.15s ease" }}
                >{deeperOpen?"▲ Close":"▼ Add nuance to my answer"}</button>
                {deeperOpen && (
                  <div style={{ marginTop:10, animation:"fadeSlideIn 0.25s ease forwards" }}>
                    <p style={{ fontFamily:"'Figtree',sans-serif", fontSize:13, color:C.parchmentDim, marginBottom:8, lineHeight:1.65 }}>
                      Add context, a personal experience, or nuance the options missed. Our AI will factor it in.
                    </p>
                    <textarea placeholder="Add your nuance here…" value={written[q.dimension]||""} onChange={e=>setWritten(p=>({...p,[q.dimension]:e.target.value}))} rows={3}
                      style={{ width:"100%", background:C.bgDeep, border:`1.5px solid ${C.goldBorderDim}`, borderRadius:4, padding:"12px 14px", fontSize:13, color:C.parchment, fontFamily:"'Figtree',sans-serif", lineHeight:1.65, resize:"vertical" }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Skip warning */}
            {skipWarning && (
              <div style={{ marginBottom:12, padding:"10px 14px", background:"rgba(201,168,76,0.07)", border:`1px solid ${C.goldBorder}`, borderRadius:4, fontFamily:"'Figtree',sans-serif", fontSize:13, color:C.parchmentDim, lineHeight:1.6 }}>
                You've already skipped {MAX_SKIPS} questions. The more you answer, the more accurate your results — try picking the closest option, even if it's not perfect.
              </div>
            )}

            {/* Action row */}
            <div style={{ display:"flex", gap:10, alignItems:"center", marginTop:6 }}>
              {qIndex > 0 && (
                <button onClick={handleBack}
                  style={{ fontFamily:"'Figtree',sans-serif", fontWeight:600, fontSize:13, color:C.parchmentDim, background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:4, padding:"13px 18px", cursor:"pointer", flexShrink:0, transition:"border-color 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.25)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"}
                >← Back</button>
              )}
              <button onClick={handleNext} disabled={!canProceed}
                style={{ flex:1, fontFamily:"'Figtree',sans-serif", fontWeight:800, fontSize:15, color:canProceed?C.bg:C.parchmentDim, background:canProceed?C.gold:"rgba(201,168,76,0.08)", border:"none", borderRadius:4, padding:15, cursor:canProceed?"pointer":"default", transition:"all 0.2s ease" }}
              >{qIndex+1===SHUFFLED.length ? "See My Results →" : "Next Question →"}</button>
              {!skipWarning && skippedCount < MAX_SKIPS && (
                <button onClick={handleSkip}
                  style={{ fontFamily:"'Figtree',sans-serif", fontWeight:600, fontSize:12, color:C.parchmentDim, background:"transparent", border:"1px solid rgba(255,255,255,0.08)", borderRadius:4, padding:"13px 14px", cursor:"pointer", flexShrink:0, transition:"border-color 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.2)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"}
                >Skip</button>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
