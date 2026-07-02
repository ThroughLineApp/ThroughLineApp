import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import supabase from "../lib/supabase";
import { useAuth } from "../lib/auth";
import ZipPrompt from "../components/ZipPrompt";
import { PRIMARY, SECONDARY } from "../lib/buttons";


const C={bg:"#0a0b0d",bgCard:"#11131a",bgDeep:"#0d0f14",gold:"#c9a84c",goldBorder:"rgba(201,168,76,0.35)",goldBorderDim:"rgba(201,168,76,0.12)",parchment:"#e8dfc8",parchmentDim:"#a89d88",green:"#4ca87c",red:"#c94c4c",blue:"#4c78c9",purple:"#8e4cc9"};

const GLOBAL_STYLES=`
  @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Barlow+Condensed:wght@400;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0b0d;font-family:'Figtree',sans-serif}
  @keyframes fadeSlideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeSlideOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-16px)}}
  @keyframes fadeSlideBack{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulseGold{0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0)}50%{box-shadow:0 0 0 8px rgba(201,168,76,0.12)}}
  @keyframes thumbDraw{from{stroke-dashoffset:1400}to{stroke-dashoffset:0}}
  @keyframes spinnerRing{to{transform:rotate(360deg)}}
  @keyframes popIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
  @keyframes badgeReveal{from{opacity:0;transform:scale(0.8) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
  .answer-btn{transition:all 0.15s ease}
  .answer-btn:hover{border-color:rgba(201,168,76,0.5)!important;background:rgba(201,168,76,0.06)!important;transform:translateX(3px)}
  .answer-btn.selected{border-color:#c9a84c!important;background:rgba(201,168,76,0.1)!important;transform:translateX(0)!important}
  textarea:focus{outline:none;border-color:rgba(201,168,76,0.45)!important}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.2);border-radius:2px}
`;

const DIMENSION_ICONS={economic:"◈",healthcare:"✦",climate:"❋",criminal:"⊕",immigration:"◎",foreign:"⊞",education:"◇",freedom:"◉",guns:"⊗",housing:"⬡",tech:"⊛",voting:"◐"};
const DIMENSION_COLORS={economic:"#c9a84c",healthcare:"#c94c78",climate:"#4ca87c",criminal:"#c97c4c",immigration:"#4c78c9",foreign:"#8e4cc9",education:"#c98e4c",freedom:"#4cc9c9",guns:"#c94c4c",housing:"#78c94c",tech:"#4c8ec9",voting:"#c94c9e"};
const DIMS=Object.keys(DIMENSION_COLORS);
const MAX_SKIPS=4;

const L1_QUESTIONS=[
  {id:"economic",dimension:"economic",label:"Economic Policy",scenario:"Your town's biggest factory just closed. 400 people lost their jobs overnight.",question:"What should happen next?",answers:[{text:"Get government out of the way. Cut taxes, reduce regulations, and businesses will come back on their own.",score:12},{text:"Retrain the workers and provide temporary support. The market will recover — people just need a bridge.",score:48},{text:"This is what we pay taxes for. Fund retraining, extend benefits, make sure no family goes under.",score:68},{text:"Tax the corporations that extracted wealth from this town for decades. Time to give something back.",score:88},{text:"Washington won't fix this. Local churches, neighbors, and community organizations know these families.",score:22}]},
  {id:"healthcare",dimension:"healthcare",label:"Healthcare",scenario:"Your neighbor was just diagnosed with cancer. She works full time but her insurance won't cover the treatment she needs.",question:"What should happen?",answers:[{text:"Tragic — but the answer is more competition, not government takeover. Better markets create better options.",score:14},{text:"There should be a public backup option. No one should fall through the cracks in the richest country on earth.",score:58},{text:"Every person deserves the same care regardless of their job or bank account. That's not radical — it's basic.",score:82},{text:"The entire insurance industry exists to deny claims. Abolish it and replace it with something that actually works.",score:96},{text:"Communities take care of their own. Neighbors, faith groups, and local fundraising have always come through.",score:24}]},
  {id:"climate",dimension:"climate",label:"Climate & Energy",scenario:"A new coal plant is proposed for your county. It'll bring 200 jobs — but scientists say it'll worsen air quality and contribute to long-term climate damage.",question:"What do you think?",answers:[{text:"Build it. American workers need jobs and America needs energy independence. Climate activists don't live here.",score:8},{text:"Approve it with strict environmental standards. We need both jobs and accountability.",score:42},{text:"Invest in clean energy jobs instead — transition the workforce rather than lock in 30 more years of fossil fuels.",score:72},{text:"Don't build it. No short-term jobs are worth the long-term damage to health, air, and the climate.",score:92},{text:"This decision belongs to the people who live here — not federal agencies or outside environmental groups.",score:28}]},
  {id:"criminal",dimension:"criminal",label:"Criminal Justice",scenario:"A young man in your city gets caught with drugs for the third time. He grew up in poverty with almost no real opportunities.",question:"What should the system do?",answers:[{text:"The law has to mean something. Consistent consequences are the only real deterrent.",score:14},{text:"Judges need discretion. Mandatory minimums punish people, not circumstances — and the circumstances matter here.",score:46},{text:"He needs treatment and a real job — not another prison sentence that makes everything worse.",score:74},{text:"The system that created his circumstances is the real criminal. We need root-and-branch reform.",score:94},{text:"Faith-based programs reach people that government programs never can. That's where real change happens.",score:28}]},
  {id:"immigration",dimension:"immigration",label:"Immigration",scenario:"A family from Central America has lived in your town for 12 years. They own a small business. Their kids go to local schools. They're undocumented.",question:"What happens now?",answers:[{text:"The law is the law. No exceptions — or the rule of law becomes meaningless for everyone.",score:10},{text:"12 years, a business, kids in school — they've earned a path to legal status.",score:62},{text:"People who build lives here belong here. Full stop. They should be citizens.",score:88},{text:"Fix the broken legal system that created this — make it possible to come here the right way.",score:48},{text:"We need to reduce immigration levels to protect American workers and preserve community character.",score:18}]},
  {id:"foreign",dimension:"foreign",label:"Foreign Policy",scenario:"Congress is debating whether to send $10 billion in aid and weapons to an ally that's under military attack.",question:"What should America do?",answers:[{text:"Only act if American lives or American soil are directly at risk. Otherwise — stay out.",score:28},{text:"Standing by allies is what keeps the world from falling into chaos. Weakness invites more aggression.",score:72},{text:"Help diplomatically and with humanitarian aid — but keep American weapons and troops at home.",score:48},{text:"International coalitions exist for exactly this. Work through the UN, not unilateral American action.",score:64},{text:"Defense contractors profit from endless war. Stop funding it. The military-industrial complex is the problem.",score:90}]},
  {id:"education",dimension:"education",label:"Education",scenario:"Two kids live 10 miles apart. One goes to a well-funded suburban school with small classes. The other goes to a crumbling underfunded school with 35 kids per class.",question:"What should be done?",answers:[{text:"School choice and vouchers let families escape failing schools. Competition makes everything better.",score:22},{text:"Federal funding should be equalized. A child's future shouldn't depend on their zip code.",score:68},{text:"Education is a right — fund it fully and equally so every school has what it needs. Period.",score:88},{text:"Teachers unions protect a broken system. Real reform starts with accountability, not just more money.",score:18},{text:"Education works best when communities control it — the federal government has made schools worse, not better.",score:32}]},
  {id:"freedom",dimension:"freedom",label:"Personal Freedom",scenario:"Your state is debating whether to restrict something that many people find controversial — but that only directly affects the person doing it.",question:"Where do you stand?",answers:[{text:"Government has no business in personal choices that don't harm others. That's the whole point of freedom.",score:88},{text:"Individual liberty is America's foundation. Protect it completely — no exceptions, no compromise.",score:82},{text:"Some moral guardrails exist for a reason. Society has a legitimate interest in what people do.",score:28},{text:"Communities should set their own standards — not Washington. Local decisions for local values.",score:42},{text:"True freedom requires economic security. You can't be free if you're one crisis from losing everything.",score:76}]},
  {id:"guns",dimension:"guns",label:"Gun Policy",scenario:"A mass shooting happens at a school two towns over. Twenty-two people are killed. Congress is called to act.",question:"What should they do?",answers:[{text:"The Second Amendment is non-negotiable. Any restriction is a step toward disarming law-abiding citizens.",score:8},{text:"More trained, armed people on campus save lives. The answer is protection, not restriction.",score:18},{text:"Background checks and red flag laws are reasonable steps that don't ban anything from responsible owners.",score:58},{text:"Mental health is the real issue — treat the root cause instead of stripping constitutional rights.",score:32},{text:"Military-style weapons have no place in civilian life. Ban them, buy them back, and enforce it.",score:88}]},
  {id:"housing",dimension:"housing",label:"Housing & Urban",scenario:"Rent in your city has doubled in five years. Teachers, nurses, and service workers are being pushed out. Homeless encampments are growing.",question:"What's the solution?",answers:[{text:"Zoning laws and regulations are strangling housing supply. Deregulate and build — the market will respond.",score:28},{text:"Tax incentives for developers who build affordable units — nudge the market rather than replace it.",score:52},{text:"The government needs to invest heavily in public housing. Private developers will never serve low-income people.",score:80},{text:"Treating homes as investment vehicles is the root problem. The whole system needs to be rethought.",score:94},{text:"Rent control has made things worse everywhere it's been tried. Free the market and prices will stabilize.",score:18}]},
  {id:"tech",dimension:"tech",label:"Tech & Privacy",scenario:"You just found out a major app has been selling your location, browsing history, and private messages to advertisers and political campaigns — without your knowledge.",question:"What should happen?",answers:[{text:"That's the deal with free services. Read the terms of service — no one forced you to use it.",score:16},{text:"There should be clear, enforceable laws about what data can be collected, sold, and for how long.",score:62},{text:"Big Tech has too much unchecked power. Break them up and regulate them like the utilities they've become.",score:82},{text:"Your data belongs to you. No company should be able to own or sell it without your active ongoing consent.",score:92},{text:"If people don't like it, they'll use different apps. Let market pressure fix this — not government mandates.",score:14}]},
  {id:"voting",dimension:"voting",label:"Electoral Rights",scenario:"Turnout in your city's last election was 28%. Young people, renters, and shift workers barely voted. Well-funded candidates dominated the airwaves.",question:"What do you do?",answers:[{text:"Low turnout reflects civic disengagement — making voting easier won't fix a culture that doesn't value it.",score:24},{text:"Voter ID protects election integrity. We can expand access AND maintain the security people deserve.",score:38},{text:"Automatic registration, mail-in ballots, and early voting remove real barriers for working people.",score:72},{text:"Election Day should be a national holiday. Automatic registration at 18. This is basic in every other democracy.",score:88},{text:"Unlimited money in elections is the real problem. Until we fix campaign finance, nothing else matters.",score:80}]},
];

const L2_QUESTIONS={
  economic:{"0-20":{label:"Economic Policy",scenario:"A major factory in your town just announced it's moving production overseas. The community is devastated — hundreds of jobs, gone.",question:"What should the government do?",answers:[{text:"Hit them with tariffs until they bring the jobs back. You don't get to use American consumers and then abandon American workers.",score:10},{text:"Give companies tax incentives for keeping jobs here — make it more profitable to stay than to leave.",score:28},{text:"Nothing — companies go where costs are lowest. Government interference makes things worse, not better.",score:5},{text:"Renegotiate trade deals from scratch. The deals we signed gutted American manufacturing and we're still paying for it.",score:15},{text:"Offer transitional support for the workers — retraining, unemployment, relocation help — but don't try to reverse the business decision.",score:45}]},"21-40":{label:"Economic Policy",scenario:"You're hearing a lot of debate about raising the minimum wage. Some business owners in your area say it would force them to cut staff or close. Some workers say they can't make rent.",question:"Where do you come down?",answers:[{text:"Keep it where it is — the market sets wages better than politicians do.",score:20},{text:"A modest increase tied to inflation makes sense, but don't jump to $20 overnight.",score:38},{text:"Let states set their own — the cost of living in Montana is nothing like San Francisco.",score:32},{text:"Index it to inflation automatically going forward so this fight doesn't happen every five years.",score:52},{text:"Eliminate the federal minimum entirely — it causes unemployment by pricing out low-skill workers.",score:10}]},"41-60":{label:"Economic Policy",scenario:"You keep hearing that the national debt is at a record high. Both parties are pointing fingers but neither is proposing anything that actually adds up.",question:"What's the right approach?",answers:[{text:"Cut military spending first — it's the biggest discretionary item and largely untouchable in Washington.",score:60},{text:"Raise taxes on the wealthy and corporations — they've benefited most from the government programs debt funded.",score:68},{text:"Cut entitlement spending — Social Security and Medicare are the biggest long-term drivers.",score:30},{text:"A balanced mix of cuts and revenue increases — everyone shares the pain.",score:50},{text:"The debt is being used as a scare tactic — invest in growth now and deal with debt later.",score:72}]},"61-80":{label:"Economic Policy",scenario:"You read that a major corporation made record profits last year but paid a lower tax rate than you did. Your accountant says that's perfectly legal.",question:"What should happen?",answers:[{text:"Close every loophole — the tax code shouldn't reward companies for being big enough to hire lawyers.",score:72},{text:"Set a 15% minimum corporate tax — no more zero-tax years regardless of deductions.",score:68},{text:"Break up the largest companies — monopoly power is the real problem, not just the tax rate.",score:78},{text:"Use the revenue to invest in small businesses so they can compete on a more level playing field.",score:65},{text:"Require profit-sharing with workers above a certain company size — redistribute at the source, not just through taxes.",score:82}]},"81-100":{label:"Economic Policy",scenario:"You see a report that the wealthiest 1% now own more than the bottom 90% combined, and that gap has doubled in your lifetime.",question:"What does that tell you?",answers:[{text:"The system is working exactly as designed — and it needs to be redesigned from the ground up.",score:95},{text:"A wealth tax of 2–3% on assets above $50 million would start reversing it without destroying the economy.",score:82},{text:"Worker cooperatives and mandatory profit-sharing would fix the distribution problem at the source.",score:90},{text:"Public ownership of key industries — energy, housing, healthcare — prevents concentration in the first place.",score:96},{text:"Capitalism needs strong guardrails: progressive taxation, real unions, and actual antitrust enforcement.",score:78}]}},
  healthcare:{"0-20":{label:"Healthcare",scenario:"Congress is debating a bill that would let the government set limits on what drug companies can charge for certain medications.",question:"Do you support it?",answers:[{text:"No — price controls kill the profit incentive that funds the research saving lives.",score:10},{text:"Only if paired with FDA reforms to speed up approval and increase competition.",score:28},{text:"The real problem is insurance bureaucracy, not drug prices — fix that first.",score:22},{text:"Let Americans buy drugs from Canada — market competition without government price-fixing.",score:32},{text:"Pharmaceutical companies are already over-regulated — deregulate and watch prices drop.",score:8}]},"21-40":{label:"Healthcare",scenario:"Your employer just told everyone that health insurance premiums are going up again — and the coverage is getting worse at the same time.",question:"What should happen?",answers:[{text:"More competition between insurers — let them sell across state lines and watch prices fall.",score:28},{text:"Tax credits to help people afford better private plans — choice without a government takeover.",score:38},{text:"Employers shouldn't be in the insurance business at all — decouple it from employment.",score:45},{text:"A limited public option for people who genuinely can't afford private coverage — but keep private insurance.",score:55},{text:"Tort reform — malpractice lawsuits drive up costs for everyone and nothing gets done about it.",score:22}]},"41-60":{label:"Healthcare",scenario:"You've heard that Americans spend twice as much on healthcare as people in most other wealthy countries, but rank lower on a lot of health outcomes.",question:"What explains this and what should be done?",answers:[{text:"Administrative complexity — simplify the insurance system without eliminating private coverage.",score:52},{text:"A public option would create competition that drives down costs across the board.",score:60},{text:"Our innovation and technology are world-class — the outcomes comparison isn't straightforward.",score:38},{text:"End-of-life care spending is the biggest driver — reform how we handle terminal illness.",score:48},{text:"The profit motive in healthcare is fundamentally incompatible with good outcomes — remove it.",score:78}]},"61-80":{label:"Healthcare",scenario:"You know someone who works full time, has insurance, and still went bankrupt from a medical bill. They did everything right and it still happened.",question:"What's the right solution?",answers:[{text:"Expand Medicaid significantly — cover everyone who falls through the cracks immediately.",score:68},{text:"A public option available to all — keep private insurance but give people a real alternative.",score:62},{text:"Strengthen the ACA marketplace with better subsidies so situations like this don't happen.",score:58},{text:"Medicare for All with a transition period to protect workers in the insurance industry.",score:80},{text:"The system isn't designed to cover people like her — redesign it.",score:88}]},"81-100":{label:"Healthcare",scenario:"You read that insurance companies denied nearly one in five claims last year. Their CEOs earned hundreds of millions of dollars.",question:"What does that tell you?",answers:[{text:"The insurance industry exists to extract profit from illness — it should be abolished, not reformed.",score:96},{text:"Medicare for All would eliminate the claim denial system entirely — that's the whole point.",score:90},{text:"Every other wealthy country figured this out — single payer isn't radical, it's just overdue.",score:88},{text:"Nationalize the largest insurers and convert them to non-profit public utilities.",score:95},{text:"The ACA preserved a fundamentally broken system — it's time to start over.",score:84}]}},
  climate:{"0-20":{label:"Climate & Energy",scenario:"A new environmental regulation would force the largest employer in your county to shut down within five years. Hundreds of families depend on that paycheck.",question:"What should happen?",answers:[{text:"Block the regulation — real people's livelihoods matter more than distant policy goals.",score:8},{text:"Delay implementation until the community has real alternative employers lined up.",score:22},{text:"The federal government created this problem — they owe these workers a real transition plan.",score:42},{text:"Let the market decide — if cleaner alternatives are better, companies will adapt without mandates.",score:15},{text:"EPA overreach is the problem — energy policy should be set by Congress, not bureaucrats.",score:12}]},"21-40":{label:"Climate & Energy",scenario:"Your state is switching several coal plants to natural gas. Environmentalists say it's not enough. Energy companies say it saved hundreds of jobs.",question:"Where do you come down?",answers:[{text:"It's a realistic step — cleaner than before, jobs preserved, and renewables can come next.",score:42},{text:"Fine as a transition, but there needs to be a real plan and timeline for what comes after.",score:52},{text:"Natural gas is still a fossil fuel — it buys time but doesn't solve the underlying problem.",score:62},{text:"Let the market decide — if renewables become cheaper, gas will phase itself out naturally.",score:28},{text:"We've been promised 'bridge fuels' for decades — it always ends up being a delay, not a transition.",score:68}]},"41-60":{label:"Climate & Energy",scenario:"The country has signed international climate agreements, but scientists say the current commitments still won't prevent serious long-term consequences.",question:"What should the US do?",answers:[{text:"Strengthen commitments significantly — the current pledge isn't anywhere near enough.",score:72},{text:"Honor the current commitment first, then reassess — credibility matters internationally.",score:52},{text:"Pair climate commitments with trade measures so other countries can't undercut us.",score:58},{text:"Climate agreements without enforcement are just PR — focus on what we can control domestically.",score:45},{text:"The most aggressive targets may already be too late — we need to plan for adaptation too.",score:65}]},"61-80":{label:"Climate & Energy",scenario:"Solar and wind power are now the cheapest ways to generate new electricity. At the same time, fossil fuel companies still receive billions in federal subsidies every year.",question:"What should happen?",answers:[{text:"Eliminate fossil fuel subsidies immediately and redirect to clean energy deployment.",score:78},{text:"Phase them out over five years to avoid economic disruption in affected communities.",score:65},{text:"End all energy subsidies — let the market pick winners without government thumb on the scale.",score:42},{text:"End fossil fuel subsidies AND expand clean energy subsidies to accelerate the transition.",score:82},{text:"No energy source should be subsidized — level the playing field and let cost decide.",score:38}]},"81-100":{label:"Climate & Energy",scenario:"Scientists say we have a narrow window to make dramatic changes before certain climate impacts become irreversible. Current policies fall far short of what they say is needed.",question:"What does that require?",answers:[{text:"A wartime-level mobilization — Green New Deal scale investment and regulation, now.",score:92},{text:"Ban all new fossil fuel infrastructure immediately — no new pipelines, no new drilling permits.",score:88},{text:"Public ownership of the energy sector — private companies can't decarbonize fast enough.",score:94},{text:"A carbon tax high enough to make fossil fuels economically unviable within a decade.",score:85},{text:"The climate crisis justifies treating this as an emergency — normal legislative timelines are too slow.",score:90}]}},
  criminal:{"0-20":{label:"Criminal Justice",scenario:"Violent crime in your city went up significantly last year. The mayor is proposing hiring hundreds of additional police officers.",question:"Do you support it?",answers:[{text:"Yes — more police presence deters crime. The data is consistent on this.",score:12},{text:"Yes, but pair it with better training and clearer accountability standards.",score:28},{text:"Only if focused on violent crime — not petty offenses that just cycle people through the system.",score:38},{text:"Yes, and restore qualified immunity so officers can do their jobs without constant lawsuit threats.",score:8},{text:"The soft-on-crime policies of recent years caused this — reverse them entirely.",score:10}]},"21-40":{label:"Criminal Justice",scenario:"Your state has mandatory minimum sentences — fixed prison terms judges must impose regardless of the individual situation in front of them.",question:"Should they be reformed?",answers:[{text:"Keep them — consistency and certainty of punishment matters for deterrence.",score:18},{text:"Reform them for nonviolent drug offenses only — violent crime minimums stay.",score:35},{text:"Give judges full discretion — they see the whole picture, legislators don't.",score:55},{text:"Eliminate them entirely — justice requires judgment, not formulas written years in advance.",score:68},{text:"They were designed to be tough on crime but mostly just made prisons expensive and overcrowded.",score:48}]},"41-60":{label:"Criminal Justice",scenario:"You hear that it costs about $35,000 a year to keep someone in prison, and recidivism rates are high — meaning many people who go to prison come back.",question:"What does this tell us?",answers:[{text:"We're locking up too many people for nonviolent offenses — reform sentencing.",score:62},{text:"The high cost is an argument for efficiency, not release — make prisons work better.",score:35},{text:"Recidivism proves prisons aren't rehabilitating people — invest more in reentry programs.",score:68},{text:"The comparison to other countries ignores real differences in crime rates and reporting.",score:40},{text:"Mass incarceration is a policy choice — we chose this, and we can choose differently.",score:75}]},"61-80":{label:"Criminal Justice",scenario:"Studies show people who go through drug treatment instead of prison are significantly less likely to reoffend. Treatment costs a fraction of incarceration.",question:"What should change?",answers:[{text:"Divert all nonviolent drug offenses to treatment instead of incarceration.",score:75},{text:"Expand drug courts — give judges the option to mandate treatment over prison.",score:68},{text:"Decriminalize personal possession entirely — criminalization makes treatment harder to access.",score:80},{text:"Invest in community-based treatment centers in every county, not just cities.",score:72},{text:"The war on drugs has failed by every measure — end it and treat addiction as a health issue.",score:85}]},"81-100":{label:"Criminal Justice",scenario:"You've read that Black Americans are incarcerated at dramatically higher rates than white Americans for similar offenses, and that this pattern has persisted for decades.",question:"What does this require?",answers:[{text:"The criminal justice system needs to be dismantled and rebuilt — reform isn't enough.",score:94},{text:"End mandatory minimums, reform bail, elect different prosecutors — fix every chokepoint in the system.",score:88},{text:"Reparative justice — those harmed by discriminatory enforcement deserve acknowledgment and remedy.",score:90},{text:"Invest heavily in communities devastated by mass incarceration — jobs, housing, schools.",score:85},{text:"You can't fix criminal justice without fixing the broader inequality that feeds it.",score:92}]}},
  immigration:{"0-20":{label:"Immigration",scenario:"Border crossings have been at record levels. The backlog of asylum cases now stretches years. Politicians are calling it a crisis.",question:"What is the real solution?",answers:[{text:"Secure the border with physical barriers and expanded enforcement first — then talk about reform.",score:8},{text:"Deport anyone who entered illegally immediately — no lengthy hearings, no exceptions.",score:5},{text:"Declare a national emergency and use executive authority to close the border until Congress acts.",score:10},{text:"End catch and release — detain everyone until their case is heard.",score:12},{text:"The asylum system is being abused as a loophole — raise the standard for who qualifies dramatically.",score:15}]},"21-40":{label:"Immigration",scenario:"There are millions of people living in the US who entered illegally, most of whom have been here for over a decade, work, and haven't been in trouble.",question:"What is a realistic policy?",answers:[{text:"Enforce the law — begin deportation proceedings starting with those with criminal records.",score:22},{text:"A path to legal status (not citizenship) for those with clean records and long residence.",score:42},{text:"E-Verify for all employers — if you can't get hired, most will leave on their own.",score:28},{text:"No amnesty — it rewards illegal entry and signals that future illegal immigration will also be forgiven.",score:15},{text:"Secure the border first, then deal with those already here — in that order, not simultaneously.",score:32}]},"41-60":{label:"Immigration",scenario:"You've heard that immigrants start businesses at higher rates than native-born Americans and fill critical gaps in healthcare, agriculture, and construction.",question:"How should this factor into immigration policy?",answers:[{text:"Expand work visas in sectors with documented labor shortages — let the economy guide it.",score:55},{text:"Economic contribution matters but doesn't override rule of law — reform the legal system itself.",score:48},{text:"Create fast-track paths to legal status for immigrants working in critical industries.",score:62},{text:"High-skilled immigration yes, but be careful about low-wage immigration and its effect on workers already here.",score:40},{text:"People have value beyond their economic contribution — humanitarian considerations must come first.",score:70}]},"61-80":{label:"Immigration",scenario:"There are young people who were brought to the US as infants, grew up here, went to school here, and now face deportation to countries they've never actually known.",question:"What should happen?",answers:[{text:"Offer them permanent legal status immediately — they are American in every meaningful sense.",score:72},{text:"Pass the DREAM Act — it's had bipartisan support for two decades, just do it.",score:68},{text:"Create a path to citizenship, not just legal status — they should be able to fully participate.",score:80},{text:"Use this as the easy case to build goodwill — then use that momentum for broader reform.",score:65},{text:"Use DACA as leverage for comprehensive reform — don't give it away without getting something in return.",score:55}]},"81-100":{label:"Immigration",scenario:"Many of the people seeking asylum at the border are fleeing countries that have been destabilized by US foreign policy decisions, trade agreements, and demand for drugs over the past several decades.",question:"What does America owe them?",answers:[{text:"A fair hearing and a genuine path to safety — we helped create the conditions they're fleeing.",score:82},{text:"Honor international asylum law fully — political persecution is not a debate.",score:88},{text:"Address root causes — foreign aid and real policy change would reduce refugee flows more than any wall.",score:85},{text:"Open the border substantially — the concept of 'illegal' immigration is itself a political construct.",score:92},{text:"Countries we've harmed have a moral claim on our generosity — reparative immigration policy.",score:90}]}},
  foreign:{"0-20":{label:"Foreign Policy",scenario:"A rival nation is rapidly expanding its military presence in a region where the US has long had strategic interests. Allies are nervous.",question:"What should the US do?",answers:[{text:"Increase military presence and push back hard — weakness invites aggression.",score:18},{text:"Strengthen alliances in the region — make the cost of aggression clear before it happens.",score:28},{text:"Sanction companies with US market access — economic pressure is more effective than military posture.",score:38},{text:"Confront them diplomatically at every multilateral forum — isolate them internationally.",score:42},{text:"Prepare for conflict if necessary — some nations have ambitions incompatible with a stable order.",score:22}]},"21-40":{label:"Foreign Policy",scenario:"Most NATO allies agreed to spend 2% of their economy on defense. Most of them aren't meeting that commitment. American taxpayers are covering the difference.",question:"What should the US do?",answers:[{text:"Demand they meet their commitments or reduce US contributions proportionally.",score:32},{text:"Continue leading NATO but make burden-sharing a public and recurring priority.",score:42},{text:"Europe is capable of defending itself — reduce US commitment and let them step up.",score:28},{text:"The 2% target is arbitrary — what matters is whether the alliance actually works.",score:48},{text:"NATO expansion has created more problems than it solved — reform the mission, not just the budget.",score:55}]},"41-60":{label:"Foreign Policy",scenario:"Looking back at decades of US military involvement in the Middle East, the region is in many ways less stable than before those interventions began.",question:"What does this tell us about American foreign policy?",answers:[{text:"Military intervention rarely achieves lasting political goals — rely on diplomacy and economics first.",score:60},{text:"We went in wrong, not that we shouldn't have gone — better strategy and execution matters.",score:42},{text:"Withdraw from the region and let regional powers manage their own affairs.",score:55},{text:"Protect narrow American interests — counterterrorism, energy, that's it.",score:38},{text:"The military-industrial complex profits from perpetual conflict — that's why it never ends.",score:75}]},"61-80":{label:"Foreign Policy",scenario:"The US provides billions in military aid to an ally accused by human rights organizations of causing widespread civilian casualties in an ongoing conflict.",question:"What should the US do?",answers:[{text:"Condition military aid on compliance with international humanitarian law — no exceptions for allies.",score:72},{text:"Reduce aid significantly until there is a credible path toward a peaceful resolution.",score:68},{text:"Use diplomatic leverage more aggressively — the US has more influence than it chooses to use.",score:65},{text:"Redirect military aid to humanitarian assistance for civilian populations affected by the conflict.",score:75},{text:"The US is complicit in what's happening — suspend aid immediately pending independent review.",score:82}]},"81-100":{label:"Foreign Policy",scenario:"The US maintains hundreds of military bases in dozens of countries. Maintaining them costs over $100 billion annually.",question:"What should happen?",answers:[{text:"Close most of them — empire-building costs more than it protects and creates more enemies than it deters.",score:88},{text:"Convert military bases to diplomatic and development missions — soft power works better.",score:80},{text:"The bases represent American imperialism — close them and reckon seriously with that history.",score:92},{text:"Redirect that spending to climate, poverty, and global health — those are the real threats.",score:85},{text:"Keep only genuinely strategic locations — close everything else and stop pretending it's about defense.",score:78}]}},
  education:{"0-20":{label:"Education",scenario:"Parents in your district are frustrated that consistently underperforming teachers can't be removed because of union contract protections.",question:"What should happen?",answers:[{text:"Reform union contracts to allow removal of underperforming teachers — accountability requires consequences.",score:18},{text:"Merit pay for teachers — reward performance, not just years of service.",score:22},{text:"Give principals real authority to hire and fire — schools need to function like accountable organizations.",score:20},{text:"School choice is the answer — competition forces improvement better than any internal reform.",score:15},{text:"The union contract system protects adults at the expense of children — change it entirely.",score:12}]},"21-40":{label:"Education",scenario:"Your state is considering giving parents $7,000 per child to spend at any school of their choice — public, private, or religious.",question:"Do you support it?",answers:[{text:"Yes — parents should choose what's best for their child, not be assigned a school by zip code.",score:28},{text:"Yes for low-income families only — choice shouldn't be a privilege of the wealthy.",score:38},{text:"No — vouchers drain public schools of funding they desperately need.",score:60},{text:"Support charter schools but not religious schools — public money shouldn't fund religion.",score:42},{text:"Pilot it in a few districts first — evaluate the data before going statewide.",score:45}]},"41-60":{label:"Education",scenario:"Two kids live ten miles apart. One goes to a school with $15,000 per student in funding. The other gets $7,000. Both are public schools funded by local property taxes.",question:"Is this acceptable?",answers:[{text:"No — equalize funding statewide so zip code doesn't determine educational quality.",score:65},{text:"Improve funding in poor districts without reducing it in wealthy ones — raise the floor.",score:60},{text:"Funding alone doesn't explain outcomes — culture, stability, and community expectations matter too.",score:45},{text:"It's not ideal, but local control of schools requires local funding — that's the inherent tradeoff.",score:38},{text:"The whole local-funding model is broken — federal funding with national standards is the answer.",score:72}]},"61-80":{label:"Education",scenario:"Student loan debt is at a record high. Many people you know took on debt for degrees that didn't lead to jobs that could realistically repay them.",question:"What's the right response?",answers:[{text:"Cancel debt for borrowers who were genuinely misled about the value or cost of their degree.",score:68},{text:"Cancel up to $50K for all borrowers below a certain income — broad but targeted relief.",score:72},{text:"Make public college free going forward and cancel existing debt — fix both problems at once.",score:80},{text:"Income-based repayment for all federal loans — no one pays more than they can afford.",score:65},{text:"The colleges that collected the tuition should share liability for unpayable debt — make them accountable.",score:75}]},"81-100":{label:"Education",scenario:"In some countries, teaching is one of the most competitive and well-paid professions. Education is fully publicly funded through university. Their outcomes rank among the best in the world.",question:"What does this suggest for America?",answers:[{text:"Fully fund public education from pre-K through university — treat it like infrastructure.",score:90},{text:"Pay teachers like the professionals they are — starting salary should be significantly higher.",score:85},{text:"Eliminate high-stakes standardized testing as the primary measure of school quality.",score:82},{text:"Community schools model — schools as neighborhood hubs for health, social services, and learning.",score:88},{text:"The American education system reflects American inequality — you can't fix one without fixing the other.",score:92}]}},
  freedom:{"0-20":{label:"Personal Freedom",scenario:"Your state is considering legalizing recreational marijuana, which is already legal in roughly half the country.",question:"Where do you stand?",answers:[{text:"Oppose it — legalization sends the wrong message and increases use among young people.",score:12},{text:"Leave it to local communities — cities and counties should decide, not state government.",score:28},{text:"Oppose commercial legalization but support decriminalization of personal possession.",score:35},{text:"The federal government should enforce existing federal law — state legalization doesn't change that.",score:10},{text:"Oppose it — some guardrails on social behavior exist for good reason and shouldn't be abandoned.",score:15}]},"21-40":{label:"Personal Freedom",scenario:"The Supreme Court has ruled that states can significantly restrict abortion access. Some states have near-total bans. Others have broad protections.",question:"Where do you stand?",answers:[{text:"States should decide — this is exactly how federalism is supposed to work.",score:32},{text:"Support some restrictions — late-term abortions should require medical justification.",score:38},{text:"Support restrictions with meaningful exceptions for rape, incest, and the life of the mother.",score:42},{text:"The decision should be between a woman and her doctor — government shouldn't be involved.",score:72},{text:"Oppose all restrictions — reproductive autonomy is a fundamental right, full stop.",score:85}]},"41-60":{label:"Personal Freedom",scenario:"Some cities have banned flavored tobacco products and vaping. Others have tried to ban large sodas or trans fats. The goal is public health. Critics say it's overreach.",question:"Where do you draw the line?",answers:[{text:"Ban proven harmful products — government has a legitimate interest in public health.",score:48},{text:"Regulate marketing and access for minors but leave adult choices alone.",score:58},{text:"Tax harmful products rather than banning them — price signals work better than prohibition.",score:52},{text:"Government has no business regulating what adults consume — full stop.",score:78},{text:"Public health costs justify regulation — individual choices have collective consequences when taxpayers foot the bill.",score:42}]},"61-80":{label:"Personal Freedom",scenario:"Several states have passed laws restricting certain medical care for transgender minors, citing concerns about irreversibility. Families and doctors say the restrictions are causing real harm.",question:"What do you think?",answers:[{text:"These laws are harmful — parents and doctors should decide, not legislatures.",score:75},{text:"Medical decisions for minors deserve special care — more research is needed before legislating.",score:55},{text:"Support restrictions on irreversible procedures for minors — reversible care is different.",score:42},{text:"Parental rights should be paramount — government shouldn't override parents either way.",score:60},{text:"Trans youth deserve the same dignity and medical care as any other young person — period.",score:85}]},"81-100":{label:"Personal Freedom",scenario:"The War on Drugs has resulted in millions of arrests and incarcerations for possession of substances that primarily affect the person using them.",question:"What's the right policy?",answers:[{text:"Decriminalize all personal drug use — criminalization destroys lives worse than the drugs do.",score:88},{text:"Legalize and regulate all drugs — treat addiction as a health issue, fully fund treatment.",score:90},{text:"The drug war was used to suppress minority and dissident communities — end it and reckon with that history.",score:92},{text:"Freedom means the right to make choices others disapprove of — government has no authority here.",score:85},{text:"Redirect all drug enforcement spending to treatment, housing, and mental health — that's what actually works.",score:88}]}},
  guns:{"0-20":{label:"Gun Policy",scenario:"A bill proposes requiring all gun owners to carry liability insurance, similar to car insurance.",question:"Do you support it?",answers:[{text:"No — it's a backdoor tax on a constitutional right, designed to price people out of gun ownership.",score:8},{text:"Absolutely not — criminals don't buy insurance, only law-abiding citizens get burdened.",score:5},{text:"The Second Amendment doesn't come with an insurance requirement — full stop.",score:10},{text:"This is the kind of government overreach the founders warned about.",score:8},{text:"Maybe for first-time buyers — but experienced gun owners have already demonstrated responsibility.",score:22}]},"21-40":{label:"Gun Policy",scenario:"Your state is debating whether to allow people to carry a concealed weapon without any permit or training requirement.",question:"Where do you stand?",answers:[{text:"Support it — the Second Amendment is the only permit you need.",score:15},{text:"Oppose it — some basic training requirement protects everyone, including responsible gun owners.",score:38},{text:"Leave it to counties — rural and urban communities genuinely have different needs.",score:32},{text:"Support constitutional carry but require safety courses for first-time carriers.",score:28},{text:"Oppose it — more guns in public places without training is a real public safety risk.",score:52}]},"41-60":{label:"Gun Policy",scenario:"Universal background checks have overwhelming public support but haven't passed Congress in decades.",question:"Why do you think that is, and what should happen?",answers:[{text:"The gun lobby has outsized political influence — campaign finance reform would fix it.",score:62},{text:"Background checks are already required — the loopholes are overstated.",score:32},{text:"Pass universal background checks but stop there — respect the constitutional line.",score:52},{text:"The Senate filibuster blocks popular legislation — the problem is procedural, not policy.",score:58},{text:"The 90% support number is misleading once people actually hear the specifics.",score:38}]},"61-80":{label:"Gun Policy",scenario:"You've seen the statistics: the US has far more civilian guns per capita than comparable wealthy nations and by far the highest gun death rate among them.",question:"What does this data tell you?",answers:[{text:"More guns clearly correlates with more gun deaths — reducing the number in circulation should be the goal.",score:75},{text:"Ban assault-style weapons and high-capacity magazines — the data supports it.",score:72},{text:"Australia's mandatory buyback program cut gun deaths dramatically — it's worth studying seriously.",score:78},{text:"Mental health is the primary driver of the violence — treat that, and gun deaths will fall.",score:40},{text:"Gun ownership also prevents crime — the data cuts both ways when you include defensive use.",score:35}]},"81-100":{label:"Gun Policy",scenario:"Mass shootings have become a recurring part of American life. Legislation that passes in one Congress gets reversed in the next. Nothing seems to stick.",question:"What is the actual solution?",answers:[{text:"A mandatory buyback of all military-style weapons — voluntary programs don't work.",score:88},{text:"The gun industry should face the same product liability as any other manufacturer — sue them.",score:85},{text:"Ban handguns in cities — that's where the majority of gun deaths actually occur.",score:82},{text:"The NRA has functioned as a political operation blocking every reform for decades — treat it accordingly.",score:88},{text:"Repeal or fundamentally reinterpret the Second Amendment — it was written for a different world.",score:92}]}},
  housing:{"0-20":{label:"Housing & Urban",scenario:"Your city is considering requiring developers to include 20% affordable units in every new building they construct.",question:"Do you support it?",answers:[{text:"No — it raises costs for everyone and discourages the development that would actually lower prices.",score:12},{text:"Only if developers get density bonuses in exchange — incentives work better than mandates.",score:28},{text:"Let the market build — supply is the answer, not mandates that reduce supply.",score:15},{text:"Oppose it — these costs just get passed on to other buyers and renters.",score:10},{text:"Zoning reform would do more — allow more building everywhere and let the market respond.",score:22}]},"21-40":{label:"Housing & Urban",scenario:"Single-family zoning laws prevent apartments from being built in most residential neighborhoods. A state bill would override those local restrictions.",question:"Should it pass?",answers:[{text:"Yes — allow duplexes and small apartments everywhere, let the market respond to demand.",score:38},{text:"Reform near transit corridors but protect established neighborhoods.",score:42},{text:"Leave zoning to local communities — state governments shouldn't override local decisions.",score:28},{text:"The housing shortage is real but zoning reform alone won't fix it — need infrastructure investment too.",score:48},{text:"Oppose state override — neighborhood character and property values reflect genuine community preferences.",score:22}]},"41-60":{label:"Housing & Urban",scenario:"Homelessness has increased despite years of spending on shelters and services. Cities are struggling and nothing seems to fully work.",question:"Why isn't the current approach working?",answers:[{text:"We're treating symptoms not causes — affordable housing is the only real long-term solution.",score:62},{text:"The Housing First model works where it's been tried seriously — fund it at actual scale.",score:68},{text:"Mental health and addiction are the root causes — shelters can't fix those.",score:45},{text:"Some people experiencing homelessness resist services — we need more options including structured programs.",score:40},{text:"Homelessness is a failure of the entire housing market — piecemeal solutions will always fall short.",score:72}]},"61-80":{label:"Housing & Urban",scenario:"Large investment firms have been buying up single-family homes in your area, renting them out, and keeping prices high. Families who want to buy can't compete.",question:"What should happen?",answers:[{text:"Limit or ban institutional ownership of single-family homes — they're for families, not portfolios.",score:75},{text:"Tax vacant properties and speculative holdings at punitive rates.",score:72},{text:"Require institutional landlords to offer right of first purchase to tenants.",score:70},{text:"Strengthen tenant protections — cap rent increases and limit evictions.",score:68},{text:"The financialization of housing is the core problem — housing should be a right, not an asset class.",score:85}]},"81-100":{label:"Housing & Urban",scenario:"A generation ago, the median home cost roughly three times the median income. Today it's eight times. Working people are being priced out of entire cities.",question:"What does this require?",answers:[{text:"A public housing program at real scale — the private market has failed to provide affordable homes.",score:88},{text:"Social housing — government builds and owns mixed-income housing, rents based on income.",score:90},{text:"Land value taxation — tax the land, not the building, to discourage speculation and hoarding.",score:82},{text:"Treat housing like infrastructure — publicly funded, universally accessible, like roads.",score:88},{text:"The entire financialized housing system needs to be dismantled — homes are for living in, not investing.",score:94}]}},
  tech:{"0-20":{label:"Tech & Privacy",scenario:"The government wants tech companies to build access points into encrypted messaging apps so law enforcement can read communications with a court warrant.",question:"Do you support it?",answers:[{text:"Yes — law enforcement needs these tools to investigate terrorism and serious crime.",score:15},{text:"Yes, with strong warrant requirements and real judicial oversight.",score:25},{text:"No — backdoors make everyone less secure, and criminals will just use foreign apps.",score:48},{text:"Only for national security cases — not routine criminal investigations.",score:20},{text:"Absolutely not — encryption protects everyone, including whistleblowers and dissidents.",score:65}]},"21-40":{label:"Tech & Privacy",scenario:"Social media platforms use algorithms that seem to push people toward more extreme content because it keeps them engaged longer.",question:"What should happen?",answers:[{text:"Require transparency — users should know why they're seeing what they see.",score:42},{text:"Let the market decide — if people don't like it, they'll use different platforms.",score:22},{text:"Repeal Section 230 so platforms face liability for what they amplify.",score:35},{text:"Regulate them as publishers — they make editorial choices, they should have editorial responsibility.",score:38},{text:"Trust users to make their own decisions — paternalistic regulation suppresses free speech.",score:18}]},"41-60":{label:"Tech & Privacy",scenario:"A handful of technology companies now control most of the internet — search, social media, mobile operating systems, and cloud computing.",question:"Is this a problem?",answers:[{text:"Yes — break them up using existing antitrust law.",score:65},{text:"Regulate them as utilities — natural monopolies need oversight, not necessarily breakup.",score:58},{text:"Competition is the answer — lower barriers to entry for new companies.",score:48},{text:"Their dominance reflects genuine consumer preference — people chose these platforms.",score:30},{text:"The monopoly problem is global — domestic antitrust alone won't fix a worldwide market.",score:52}]},"61-80":{label:"Tech & Privacy",scenario:"You discover your phone has been tracking your location around the clock, and that data was sold to advertisers, political campaigns, and law enforcement without your knowledge.",question:"What should happen?",answers:[{text:"Require explicit opt-in consent for all data collection — no more buried terms of service.",score:72},{text:"Ban the sale of location data entirely — it's too sensitive to treat as a commodity.",score:78},{text:"Create a federal privacy law with real enforcement — the US is one of the few democracies without one.",score:70},{text:"Give users ownership of their data with the right to delete it and compensation for its use.",score:80},{text:"Regulate data brokers directly — the middlemen buying and selling your information are the problem.",score:75}]},"81-100":{label:"Tech & Privacy",scenario:"AI systems are making decisions about who gets loans, jobs, housing, and bail — often with no human review, no transparency, and no way to appeal.",question:"What does this require?",answers:[{text:"Ban high-stakes automated decisions until bias can be independently verified and eliminated.",score:88},{text:"Mandatory algorithmic audits by independent bodies for any AI affecting people's lives.",score:85},{text:"A legal right to human review for any AI decision — no appeal process is unacceptable.",score:88},{text:"Data used to train AI should be public so bias can be independently identified and challenged.",score:82},{text:"Corporate liability for discriminatory AI outcomes — make companies legally responsible.",score:90}]}},
  voting:{"0-20":{label:"Electoral Rights",scenario:"Several states have passed voter ID laws. Supporters say it protects election integrity. Critics say it suppresses turnout among certain groups.",question:"Where do you stand?",answers:[{text:"Support voter ID — you need ID for everything else in life, voting should be no different.",score:18},{text:"Support it with free government-issued ID provided to anyone who needs one.",score:28},{text:"Strongly support it — election integrity is the foundation everything else rests on.",score:12},{text:"Support ID alongside same-day registration — make both voting and verification easier.",score:38},{text:"The fraud voter ID prevents is essentially nonexistent — it's suppression dressed as security.",score:75}]},"21-40":{label:"Electoral Rights",scenario:"The Electoral College means a presidential candidate can lose the popular vote by millions and still win the presidency.",question:"Should it be reformed?",answers:[{text:"Keep it — it protects smaller states from being ignored and candidates from only campaigning in big cities.",score:25},{text:"Keep it but allocate electors by congressional district — more proportional representation.",score:35},{text:"Reform it through the National Popular Vote Interstate Compact — no constitutional amendment needed.",score:55},{text:"Abolish it — the president should be chosen by the most votes, full stop.",score:72},{text:"The bigger problem is gerrymandering — fix that first before touching the Electoral College.",score:48}]},"41-60":{label:"Electoral Rights",scenario:"Voter turnout in the US is consistently lower than in most other wealthy democracies. A lot of people, especially younger and lower-income voters, simply don't vote.",question:"What's the best way to change that?",answers:[{text:"Automatic voter registration at 18 — opt out rather than opt in.",score:68},{text:"Election Day as a national holiday — working people can't always get to the polls on a Tuesday.",score:72},{text:"Ranked-choice voting — more choices means more people feel their vote actually matters.",score:62},{text:"Civic education reform — engagement starts in schools, not at the polling place.",score:52},{text:"Low turnout is rational disengagement — fix the broken system and people will participate.",score:75}]},"61-80":{label:"Electoral Rights",scenario:"Political maps are drawn by whichever party is in power, often creating districts where one party wins by enormous margins and representatives face no real competition.",question:"What should be done about gerrymandering?",answers:[{text:"Independent redistricting commissions in every state — remove politicians from the process entirely.",score:75},{text:"Federal standards for fair maps — the Supreme Court has abdicated, Congress must act.",score:72},{text:"Mathematical fairness standards — maps should reflect how people actually live.",score:68},{text:"Ranked-choice voting reduces the impact of gerrymandering regardless of district shape.",score:70},{text:"The single-member district system itself produces gerrymandering — switch to proportional representation.",score:80}]},"81-100":{label:"Electoral Rights",scenario:"After a series of Supreme Court rulings, unlimited money from corporations and billionaires now funds most political advertising. Much of it comes from anonymous donors.",question:"What does a healthy democracy require?",answers:[{text:"A constitutional amendment to overturn those rulings — money is not speech.",score:92},{text:"Full public financing of elections — candidates get equal funds, outside money banned.",score:90},{text:"Real-time disclosure of all political spending — transparency is the absolute minimum.",score:80},{text:"The corruption of democracy by money is an emergency — treat it with that urgency.",score:88},{text:"Representative democracy is incompatible with unlimited political spending — structural reform or accept oligarchy.",score:94}]}},
};

const BADGE_ICONS={
  voter:(<svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6"/></svg>),
  informed:(<svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>),
  wonk:(<svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>),
  activist:(<svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>),
  engaged:(<svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>),
  analyst:(<svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
};
const BADGES=[
  {id:"voter",icon:BADGE_ICONS.voter,label:"Voter",desc:"Completed Level 1 quiz"},
  {id:"informed",icon:BADGE_ICONS.informed,label:"Informed",desc:"Completed Level 2 quiz"},
  {id:"wonk",icon:BADGE_ICONS.wonk,label:"Wonk",desc:"Completed Level 3 quiz"},
  {id:"activist",icon:BADGE_ICONS.activist,label:"Activist",desc:"Following 5+ politicians"},
  {id:"engaged",icon:BADGE_ICONS.engaged,label:"Engaged",desc:"Quiz taken + 3+ issues followed"},
  {id:"analyst",icon:BADGE_ICONS.analyst,label:"Analyst",desc:"Retaken the quiz 3+ times"},
];

function getScoreBand(s){if(s<=20)return"0-20";if(s<=40)return"21-40";if(s<=60)return"41-60";if(s<=80)return"61-80";return"81-100";}
function shuffle(a){return[...a].sort(()=>Math.random()-0.5);}
function buildL2(l1Scores){return DIMS.map(dim=>{const band=getScoreBand(l1Scores[dim]??50);const q=L2_QUESTIONS[dim][band];return{id:`l2_${dim}`,dimension:dim,label:q.label,scenario:q.scenario,question:q.question,answers:shuffle(q.answers)};});}
function profileLabel(scores){return"Your Political Thumbprint";}

function ThumbprintSVG({scores,size=160,animate=true}){
  const cx=size/2,cy=size/2,r=size*0.40;
  const pt=(i,rr)=>{const a=(Math.PI*2*i)/DIMS.length-Math.PI/2;return[cx+rr*Math.cos(a),cy+rr*Math.sin(a)];};
  const pts=DIMS.map((dim,i)=>{const rr=((scores[dim]??50)/100)*r;return pt(i,rr);});
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[.25,.5,.75,1].map(f=>{const rp=DIMS.map((_,i)=>pt(i,f*r));return<polygon key={f} points={rp.map(p=>p.join(",")).join(" ")} fill="none" stroke="rgba(201,168,76,0.07)" strokeWidth="1"/>;} )}
      {DIMS.map((_,i)=>{const[x,y]=pt(i,r);return<line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(201,168,76,0.09)" strokeWidth="1"/>;} )}
      <polygon points={pts.map(p=>p.join(",")).join(" ")} fill="rgba(201,168,76,0.07)" stroke="#c9a84c" strokeWidth="2.5" strokeLinejoin="round"
        style={animate?{strokeDasharray:1400,strokeDashoffset:1400,animation:"thumbDraw 2s ease forwards 0.4s"}:{}}/>
      {pts.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r={4.5} fill={Object.values(DIMENSION_COLORS)[i]} opacity={0.9}/>)}
      {DIMS.map((dim,i)=>{const[x,y]=pt(i,r+22);return<text key={dim} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="'Barlow Condensed',sans-serif" fontWeight="700" fill={DIMENSION_COLORS[dim]} opacity={0.7}>{DIMENSION_ICONS[dim]}</text>;})}
    </svg>
  );
}

function Spinner(){return<div style={{width:42,height:42,borderRadius:"50%",border:"3px solid rgba(201,168,76,0.12)",borderTopColor:C.gold,animation:"spinnerRing 0.85s linear infinite",margin:"0 auto"}}/>;}

function ProgressBar({current,total,skipped,level}){
  return(
    <div>
      <div style={{width:"100%",height:3,background:"rgba(201,168,76,0.08)",borderRadius:2,overflow:"hidden",marginBottom:4}}>
        <div style={{height:"100%",width:`${(current/total)*100}%`,background:C.gold,borderRadius:2,transition:"width 0.4s ease"}}/>
      </div>
      {skipped>0&&<div style={{fontFamily:"'Figtree',sans-serif",fontSize:11,color:C.parchmentDim,opacity:0.6,textAlign:"right"}}>{skipped} skipped</div>}
    </div>
  );
}

function QuestionScreen({q,qIndex,total,level,onAnswer,onBack,onSkip,skippedCount,previousAnswer}){
  const router=useRouter();
  const[sel,setSel]=useState(previousAnswer??null);
  const[writeOwn,setWriteOwn]=useState(false);
  const[ownText,setOwnText]=useState("");
  const[nuanceOpen,setNuanceOpen]=useState(false);
  const[nuanceText,setNuanceText]=useState("");
  const[skipWarn,setSkipWarn]=useState(false);
  const[anim,setAnim]=useState(false);
  const[animDir,setAnimDir]=useState("forward");
  const[pointerMoved,setPointerMoved]=useState(false);
  const[pointerStartY,setPointerStartY]=useState(0);
  const[nuanceError,setNuanceError]=useState(false);
  const canProceed=sel!==null||(writeOwn&&ownText.trim().length>0)||sel==="own"||(nuanceText&&nuanceText.trim().length>0);
  const dc=DIMENSION_COLORS[q.dimension];
  const go=(dir,fn)=>{if(anim)return;setAnimDir(dir);setAnim(true);setTimeout(()=>{fn();setAnim(false);},280);};
  const handleNext=()=>{if(!canProceed)return;const isOwn=writeOwn||sel==="own";const score=isOwn?50:q.answers[sel].score;const wt=isOwn?ownText.trim():(nuanceText.trim()||null);const ansIdx=isOwn?null:sel;go("forward",()=>onAnswer(q.dimension,score,wt,ansIdx));};
  const handleBack=()=>{if(qIndex===0)return;go("back",()=>onBack());};
  const handleSkip=()=>{if(skippedCount>=MAX_SKIPS){setSkipWarn(true);return;}go("forward",()=>onSkip(q.dimension));};
  const animStyle=anim?{animation:`${animDir==="forward"?"fadeSlideOut":"fadeSlideIn"} 0.28s ease forwards`}:{animation:`${animDir==="back"?"fadeSlideBack":"fadeSlideIn"} 0.32s ease forwards`};
  return(
    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",maxWidth:600,margin:"0 auto",minHeight:0}}>

      {/* ZONE 1 — Header */}
      <div style={{flexShrink:0,padding:"6px 16px 2px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <button onClick={handleBack} style={{fontFamily:"Arial",fontSize:12,color:"#9A9488",background:"none",border:"none",cursor:"pointer",padding:"4px 0",touchAction:"manipulation",visibility:qIndex>0?"visible":"hidden"}}>← Back</button>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",flex:1}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"3px 10px",borderRadius:20,background:dc+"14",border:`1px solid ${dc}30`}}>
              <span style={{fontSize:13,color:dc}}>{DIMENSION_ICONS[q.dimension]}</span>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:9,letterSpacing:"0.2em",color:dc,textTransform:"uppercase"}}>{q.label}</span>
            </div>
          </div>
          <span style={{fontFamily:"'Figtree',sans-serif",fontSize:12,color:C.parchmentDim,textAlign:"right"}}>{qIndex+1} of {total}</span>
        </div>
        <ProgressBar current={qIndex+1} total={total} skipped={skippedCount} level={level}/>
      </div>

      {/* ZONE 2 — Content */}
      <div style={{flex:1,overflow:"hidden",padding:"0 16px 8px"}} onTouchMove={(e)=>e.stopPropagation()}>
        <div style={animStyle}>
          <div style={{background:C.bgCard,borderLeft:`3px solid ${dc}`,borderRadius:"0 4px 4px 0",padding:"6px 10px",marginBottom:6}}>
            <p style={{fontFamily:"'Figtree',sans-serif",fontSize:13,color:C.parchmentDim,lineHeight:1.35,marginBottom:4}}>{q.scenario}</p>
            <p style={{fontFamily:"'Figtree',sans-serif",fontWeight:700,fontSize:17,color:C.parchment,lineHeight:1.3}}>{q.question}</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:8,marginTop:6}}>
            {q.answers.map((ans,i)=>(
              <button key={i} className={`answer-btn${sel===i?" selected":""}`}
                onPointerDown={(e)=>{setPointerMoved(false);setPointerStartY(e.clientY);e.currentTarget.releasePointerCapture(e.pointerId);}}
                onPointerMove={(e)=>{if(Math.abs(e.clientY-pointerStartY)>8){setPointerMoved(true);}}}
                onPointerUp={(e)=>{if(!pointerMoved){e.preventDefault();setSel(i);setWriteOwn(false);setOwnText("");}}}
                style={{width:"100%",textAlign:"left",fontFamily:"'Figtree',sans-serif",fontWeight:sel===i?600:400,fontSize:15,color:sel===i?C.parchment:C.parchmentDim,background:sel===i?"rgba(201,168,76,0.1)":C.bgCard,border:`1.5px solid ${sel===i?C.gold:"rgba(201,168,76,0.1)"}`,borderRadius:4,padding:"9px 12px",cursor:"pointer",lineHeight:1.35,touchAction:"none",userSelect:"none",WebkitUserSelect:"none",MozUserSelect:"none",WebkitTapHighlightColor:"transparent",WebkitTouchCallout:"none",outline:"none"}}>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:11,color:sel===i?C.gold:"rgba(201,168,76,0.35)",marginRight:10,letterSpacing:"0.06em"}}>{String.fromCharCode(65+i)}</span>
                {ans.text}
              </button>
            ))}
          </div>
          {skipWarn&&(
            <div style={{marginBottom:12,padding:"10px 14px",background:"rgba(201,168,76,0.07)",border:`1px solid ${C.goldBorder}`,borderRadius:4,fontFamily:"'Figtree',sans-serif",fontSize:13,color:C.parchmentDim,lineHeight:1.6}}>
              You've used all {MAX_SKIPS} skips. Pick the closest answer even if it's not perfect.
            </div>
          )}
        </div>
      </div>

      {/* ZONE 3 — Footer */}
      <div style={{flexShrink:0,padding:"6px 16px 12px",background:C.bg,borderTop:"0.5px solid rgba(255,255,255,0.08)"}}>
        <button
          onClick={()=>setNuanceOpen(true)}
          style={{width:"100%",fontSize:12,color:"#9A9488",background:"none",border:"none",cursor:"pointer",padding:"6px 0 2px",fontFamily:"'Figtree',sans-serif",textAlign:"center",touchAction:"manipulation"}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:5}}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {sel===null?"Write my own response":"Add nuance to my answer"}
          </span>
        </button>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={handleNext} disabled={!canProceed} style={{...PRIMARY,flex:1,fontSize:15,padding:15,opacity:canProceed?1:0.35,background:canProceed?"#C9A84C":"rgba(201,168,76,0.08)",color:canProceed?"#0A0B0D":"#9A9488",cursor:canProceed?"pointer":"not-allowed",transition:"all 0.2s ease",touchAction:"manipulation"}}>SUBMIT ANSWER →</button>
          {!skipWarn&&skippedCount<MAX_SKIPS&&<button onClick={handleSkip} style={{...SECONDARY,fontSize:11,padding:"13px 14px",flexShrink:0,touchAction:"manipulation"}}>SKIP</button>}
        </div>
      </div>

      {/* Nuance / Write-own popup */}
      {nuanceOpen&&(
        <div
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:500,display:"flex",flexDirection:"column",justifyContent:"flex-start",alignItems:"center",paddingTop:"60px"}}
          onClick={()=>{setNuanceText("");setNuanceError(false);setNuanceOpen(false);}}>
          <div
            style={{background:"#111318",borderRadius:12,padding:24,margin:24,maxWidth:480,width:"100%",animation:"popIn 0.2s ease forwards"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <button
                onClick={()=>{if(!nuanceText.trim()){setNuanceError(true);return;}setSel("own");setOwnText(nuanceText);setNuanceError(false);setNuanceOpen(false);}}
                style={{...PRIMARY,flex:1,fontSize:13,padding:"12px 16px",borderRadius:8}}>
                USE THIS RESPONSE →
              </button>
              <button
                onClick={()=>{setNuanceText("");setNuanceError(false);setNuanceOpen(false);}}
                style={{...SECONDARY,flex:0,fontSize:13,padding:"12px 16px",borderRadius:8,whiteSpace:"nowrap"}}>
                CANCEL
              </button>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:16,letterSpacing:"0.1em",color:C.gold,marginBottom:16,textTransform:"uppercase"}}>Add your own response</div>
            <textarea
              placeholder="Type your response or add nuance..."
              value={nuanceText}
              onChange={e=>{setNuanceText(e.target.value);if(nuanceError)setNuanceError(false);}}
              rows={4}
              autoFocus
              style={{width:"100%",minHeight:100,background:"#181C22",border:`1px solid ${nuanceError?"#c94c4c":"rgba(201,168,76,0.3)"}`,borderRadius:8,color:"#F0ECE4",fontSize:14,padding:12,fontFamily:"Arial",lineHeight:1.5,resize:"vertical",boxSizing:"border-box"}}
            />
            {nuanceError&&<div style={{fontFamily:"Arial",fontSize:12,color:"#c94c4c",marginTop:6}}>Please write something before submitting.</div>}
          </div>
        </div>
      )}

    </div>
  );
}

function BadgeScreen({earnedBadges,onContinue,continueLabel}){
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",textAlign:"center"}}>
      <div style={{maxWidth:480}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,letterSpacing:"0.35em",color:C.gold,marginBottom:14}}>ACHIEVEMENT UNLOCKED</div>
        <h1 style={{fontFamily:"'Figtree',sans-serif",fontWeight:800,fontSize:"clamp(24px,5vw,36px)",color:C.parchment,lineHeight:1.2,marginBottom:24}}>You earned {earnedBadges.length===1?"a badge":"badges"}.</h1>
        <div style={{display:"flex",flexWrap:"wrap",gap:16,justifyContent:"center",marginBottom:40}}>
          {earnedBadges.map((b,i)=>(
            <div key={b.id} style={{background:C.bgCard,border:`1px solid ${C.goldBorder}`,borderRadius:8,padding:"20px 24px",minWidth:140,animation:`badgeReveal 0.5s ease forwards ${i*0.15}s`,opacity:0}}>
              <div style={{fontSize:36,marginBottom:8}}>{b.icon}</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:18,color:C.gold,marginBottom:4}}>{b.label}</div>
              <div style={{fontFamily:"'Figtree',sans-serif",fontSize:12,color:C.parchmentDim,lineHeight:1.5}}>{b.desc}</div>
            </div>
          ))}
        </div>
        <button onClick={onContinue} style={{...PRIMARY,fontSize:16,padding:"16px 40px"}}>{continueLabel}</button>
      </div>
    </div>
  );
}

function MatchesSection({ scores }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const { data, error } = await supabase
          .from("politicians")
          .select("id, name, party, chamber, slug, is_priority, search_rank, bioguide_id, wikipedia_photo_url, score_climate, score_economic, score_education, score_guns")
          .or("score_climate.not.is.null,score_economic.not.is.null,score_education.not.is.null,score_guns.not.is.null");

        if (error || !data) return;

        const DIMENSION_MAP = [
          { userKey: "climate",   dbKey: "score_climate"   },
          { userKey: "economic",  dbKey: "score_economic"  },
          { userKey: "education", dbKey: "score_education" },
          { userKey: "guns",      dbKey: "score_guns"      },
        ];

        const scored = data.map(pol => {
          let sumSq = 0;
          let counted = 0;
          for (const { userKey, dbKey } of DIMENSION_MAP) {
            const userScore = scores[userKey];
            const polScore = pol[dbKey];
            if (userScore == null || polScore == null) continue;
            const userNorm = userScore;
            const diff = userNorm - polScore;
            sumSq += diff * diff;
            counted++;
          }
          if (counted === 0) return null;
          const distance = Math.sqrt(sumSq);
          const maxDist = Math.sqrt(counted * 100 * 100);
          const match = Math.round(100 - (distance / maxDist) * 100);
          return { ...pol, match };
        }).filter(Boolean);

        scored.sort((a, b) => {
          const matchDiff = b.match - a.match;
          if (Math.abs(matchDiff) > 2) return matchDiff;
          return (a.search_rank ?? 999) - (b.search_rank ?? 999);
        });
        setMatches(scored.slice(0, 5));
      } catch (e) {
        console.error("Match fetch error:", e);
      } finally {
        setLoading(false);
      }
    }

    const hasScores = scores && Object.values(scores).some(v => v !== 0);
    if (hasScores) fetchMatches();
    else setLoading(false);
  }, []);

  const PARTY_COLOR = { D: "#4c78c9", R: "#c94c4c", I: "#8e4cc9" };

  if (loading) return (
    <div style={{ width: "100%", maxWidth: 480, marginBottom: 32 }}>
      <div style={{ background: "#11131a", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 8, padding: "28px 24px" }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>
          POLITICIAN MATCHES
        </div>
        <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 12, color: "#a89d88" }}>
          Calculating your matches...
        </div>
      </div>
    </div>
  );

  if (!matches.length) return (
    <div style={{ width: "100%", maxWidth: 480, marginBottom: 32 }}>
      <div style={{ background: "#11131a", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 8, padding: "28px 24px" }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>
          POLITICIAN MATCHES
        </div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontStyle: "italic", fontSize: 16, color: "#e8dfc8", lineHeight: 1.6 }}>
          Complete the quiz to see your matches.
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%", maxWidth: 480, marginBottom: 32 }}>
      <div style={{ background: "#11131a", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 8, padding: "28px 24px" }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", color: "#c9a84c", textTransform: "uppercase", marginBottom: 16 }}>
          POLITICIAN MATCHES
        </div>
        {matches.map((pol, i) => (
          <div
            key={pol.id}
            onClick={() => pol.slug && (window.location.href = `/politician/${pol.slug}`)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: i < matches.length - 1 ? "1px solid rgba(201,168,76,0.12)" : "none",
              cursor: pol.slug ? "pointer" : "default",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {(pol.wikipedia_photo_url || pol.bioguide_id) ? (
                <img
                  src={pol.wikipedia_photo_url || `https://bioguide.congress.gov/bioguide/photo/${pol.bioguide_id[0]}/${pol.bioguide_id}.jpg`}
                  alt={pol.name}
                  referrerPolicy="no-referrer"
                  onError={e => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                  style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
              ) : null}
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "#1a2340",
                display: (pol.wikipedia_photo_url || pol.bioguide_id) ? "none" : "flex",
                alignItems: "center", justifyContent: "center",
                fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 700, fontSize: 14, color: "#c9a84c",
                flexShrink: 0,
              }}>
                {pol.party}
              </div>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, fontSize: 15, color: "#e8dfc8" }}>
                  {pol.name}
                </div>
                <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, color: "#a89d88", marginTop: 2 }}>
                  {pol.chamber}
                </div>
              </div>
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 700, fontSize: 22,
              color: "#c9a84c",
            }}>
              {pol.match}%
            </div>
          </div>
        ))}
        <div style={{ fontFamily: "'Figtree',sans-serif", fontSize: 10, color: "#a89d88", marginTop: 16, fontStyle: "italic" }}>
          Based on climate, economic, education, and gun policy scores. More dimensions coming.
        </div>
      </div>
    </div>
  );
}

function ResultsScreen({scores,onStartL2,onRetake,onContinueToL2,onExplore,user,showSavePrompt,onSignUp,level,isL1,isReturningUser}){
  const router=useRouter();
  const { needsZip, refreshProfile } = useAuth();
  const [zipDismissed, setZipDismissed] = useState(false);
  const safe=scores||Object.fromEntries(DIMS.map(d=>[d,50]));
  const pcolor=p=>p==="D"?C.blue:p==="R"?C.red:C.purple;
  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.parchment}}>
      <div style={{maxWidth:580,margin:"0 auto",padding:"44px 24px 80px"}}>
        {isReturningUser&&(
          <div style={{marginBottom:24,padding:"12px 18px",background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.25)",borderRadius:4,display:"flex",alignItems:"center",gap:12,animation:"fadeSlideIn 0.5s ease forwards"}}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:"0.12em",color:C.gold,marginBottom:2}}>WELCOME BACK</div>
              <div style={{fontFamily:"'Figtree',sans-serif",fontSize:13,color:C.parchmentDim}}>Here are your saved results. Retake the quiz anytime to update your thumbprint.</div>
            </div>
          </div>
        )}
        <div style={{textAlign:"center",marginBottom:36,animation:"fadeSlideIn 0.6s ease forwards"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,letterSpacing:"0.35em",color:C.gold,marginBottom:8}}>{level===1?"LEVEL 1 COMPLETE":"LEVEL 2 COMPLETE"}</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:"clamp(22px,5vw,32px)",letterSpacing:"0.08em",color:C.gold,marginBottom:6}}>YOUR POLITICAL THUMBPRINT</div>
          <p style={{fontFamily:"'Figtree',sans-serif",fontSize:14,color:C.parchmentDim,lineHeight:1.75,maxWidth:420,margin:"0 auto"}}>Each axis is one policy dimension. The further the point extends, the stronger your position on that issue.</p>
        </div>
        <div style={{display:"flex",justifyContent:"center",marginBottom:12,animation:"fadeSlideIn 0.6s ease forwards 0.2s",opacity:0}}>
          <ThumbprintSVG scores={safe} size={290} animate={true}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 20px",marginBottom:44,animation:"fadeSlideIn 0.6s ease forwards 0.4s",opacity:0}}>
          {DIMS.map(dim=>{
            const s=safe[dim]??50;const color=DIMENSION_COLORS[dim];
            const ql=L1_QUESTIONS.find(q=>q.dimension===dim);
            return(
              <div key={dim} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(201,168,76,0.05)"}}>
                <span style={{color,fontSize:14,flexShrink:0}}>{DIMENSION_ICONS[dim]}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{fontFamily:"'Figtree',sans-serif",fontWeight:600,fontSize:11,color:C.parchmentDim}}>{ql?.label||dim}</span>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:13,color,marginLeft:6}}>{Math.round(s)}</span>
                  </div>
                  <div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${s}%`,background:color,borderRadius:2,transition:"width 1s ease 0.6s"}}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {user && needsZip && !zipDismissed && (
          <div style={{ margin: "24px 0" }}>
            <ZipPrompt
              context="quiz"
              onComplete={() => {
                refreshProfile();
                setZipDismissed(true);
              }}
              onDismiss={() => setZipDismissed(true)}
            />
          </div>
        )}
        <div style={{animation:"fadeSlideIn 0.6s ease forwards 0.6s",opacity:0}}>
          <MatchesSection scores={scores} />
          {isL1&&onContinueToL2&&(
            <button onClick={onContinueToL2}
              style={{width:"100%",maxWidth:480,fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:700,letterSpacing:"0.2em",color:"#0a0b0d",background:"#c9a84c",border:"none",borderRadius:2,padding:"16px",cursor:"pointer",marginBottom:16,display:"block"}}>
              CONTINUE TO LEVEL 2 →
            </button>
          )}
        </div>
        {showSavePrompt&&!user&&(
          <div style={{marginBottom:32,padding:26,background:C.bgCard,border:`1px solid ${C.goldBorder}`,borderRadius:4,textAlign:"center",animation:"popIn 0.4s ease forwards"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,letterSpacing:"0.3em",color:C.gold,marginBottom:10}}>SAVE YOUR THUMBPRINT</div>
            <div style={{fontFamily:"'Figtree',sans-serif",fontWeight:700,fontSize:18,color:C.parchment,marginBottom:8}}>Don't lose your results.</div>
            <div style={{fontFamily:"'Figtree',sans-serif",fontSize:13,color:C.parchmentDim,lineHeight:1.7,marginBottom:20}}>Create a free account to save your thumbprint, follow politicians, and get alerts.</div>
            <button onClick={onSignUp} style={{...SECONDARY,fontSize:14,padding:"14px 36px"}}>CREATE FREE ACCOUNT →</button>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:10,animation:"fadeSlideIn 0.6s ease forwards 0.8s",opacity:0}}>
          <button onClick={onExplore} style={{...SECONDARY,fontSize:14,padding:15,width:"100%"}}>EXPLORE POLITICIANS →</button>
          {level===1&&(
            <div style={{padding:22,background:C.bgDeep,border:`1px solid ${C.goldBorderDim}`,borderRadius:4,textAlign:"center"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:13,letterSpacing:"0.12em",color:C.gold,marginBottom:8}}>WANT A MORE ACCURATE PICTURE?</div>
              <div style={{fontFamily:"'Figtree',sans-serif",fontSize:13,color:C.parchmentDim,lineHeight:1.7,marginBottom:16}}>Answer 12 more targeted questions to refine your thumbprint. Level 2 selects questions specifically tailored to your results.</div>
              <button onClick={onStartL2} style={{...PRIMARY,fontSize:14,padding:"12px 28px"}}>START LEVEL 2 →</button>
            </div>
          )}
          {level===2&&(
            <div style={{padding:22,background:C.bgDeep,border:`1px solid ${C.goldBorderDim}`,borderRadius:4,textAlign:"center"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:13,letterSpacing:"0.12em",color:C.gold,marginBottom:8}}>LEVEL 3 — COMING SOON</div>
              <div style={{fontFamily:"'Figtree',sans-serif",fontSize:13,color:C.parchmentDim,lineHeight:1.7}}>Level 3 goes deeper on the dimensions where your views are most nuanced. Questions are in development.</div>
            </div>
          )}
          <button onClick={onRetake} style={{fontFamily:"'Figtree',sans-serif",fontWeight:400,fontSize:13,color:"#a89d88",background:"transparent",border:"none",textDecoration:"underline",cursor:"pointer",padding:"6px 0"}}>Retake the Quiz</button>
        </div>
      </div>
    </div>
  );
}

function BottomNavBar({ activeTab }) {
  const router = useRouter();
  const tabs = [
    {
      id: "feed", label: "Feed",
      onClick: () => router.push("/"),
      icon: (a) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9,22 9,12 15,12 15,22" />
        </svg>
      ),
    },
    {
      id: "explore", label: "Explore",
      onClick: () => router.push("/explore"),
      icon: (a) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" />
        </svg>
      ),
    },
    {
      id: "local", label: "Local",
      onClick: () => router.push("/local"),
      icon: (a) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
    {
      id: "profile", label: "Profile",
      onClick: () => router.push("/profile"),
      icon: (a) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? "#c9a84c" : "#a89d88"} strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
        </svg>
      ),
    },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "#0a0b0d",
      borderTop: "1px solid rgba(201,168,76,0.15)",
      zIndex: 9999,
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {tabs.map(tab => {
        const active = tab.id === activeTab;
        return (
          <button key={tab.id} type="button" onClick={tab.onClick}
            style={{
              flex: 1, height: "56px", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", border: "none", background: "transparent",
            }}>
            {tab.icon(active)}
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10, letterSpacing: "0.08em", marginTop: 3,
              color: active ? "#c9a84c" : "#a89d88", textTransform: "uppercase",
            }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function QuizPage(){
  const router=useRouter();
  const{user,profile,requireAuth}=useAuth();
  const[phase,setPhase]=useState("intro");
  const[l1QIdx,setL1QIdx]=useState(0);
  const[l1Answers,setL1Answers]=useState({});
  const[l1Written,setL1Written]=useState({});
  const[l1Scores,setL1Scores]=useState(null);
  const[l2Questions,setL2Questions]=useState([]);
  const[l2QIdx,setL2QIdx]=useState(0);
  const[l2Answers,setL2Answers]=useState({});
  const[l2Written,setL2Written]=useState({});
  const[l2Scores,setL2Scores]=useState(null);
  const[procMsg,setProcMsg]=useState("Analyzing your responses…");
  const[showSave,setShowSave]=useState(false);
  const[earnedBadges,setEarnedBadges]=useState([]);
  const[lvl,setLvl]=useState(1);
  const[shuffledL1]=useState(()=>shuffle(L1_QUESTIONS));
  const[l1AnswerIndices,setL1AnswerIndices]=useState({});
  const[l2AnswerIndices,setL2AnswerIndices]=useState({});
  const[checkingExisting,setCheckingExisting]=useState(true);
  const[isReturningUser,setIsReturningUser]=useState(false);


  useEffect(()=>{
    async function checkExistingResults(){
      try{
        const{data:{user:authUser}}=await supabase.auth.getUser();
        if(!authUser){setCheckingExisting(false);return;}
        const{data:savedResults,error}=await supabase
          .from("quiz_results")
          .select("*")
          .eq("user_id",authUser.id)
          .order("quiz_level",{ascending:false})
          .limit(1)
          .single();
        if(error||!savedResults){setCheckingExisting(false);return;}
        const savedScores={
          economic:savedResults.score_economic??50,
          healthcare:savedResults.score_healthcare??50,
          climate:savedResults.score_climate??50,
          criminal:savedResults.score_criminal??50,
          immigration:savedResults.score_immigration??50,
          foreign:savedResults.score_foreign??50,
          education:savedResults.score_education??50,
          freedom:savedResults.score_freedom??50,
          guns:savedResults.score_guns??50,
          housing:savedResults.score_housing??50,
          tech:savedResults.score_tech??50,
          voting:savedResults.score_voting??50,
        };
        setIsReturningUser(true);
        if(savedResults.quiz_level===2){
          setL2Scores(savedScores);
          setL1Scores(savedScores);
          setPhase("l2_results");
        }else{
          setL1Scores(savedScores);
          setPhase("l1_results");
        }
      }catch(e){console.log("checkExistingResults error:",e.message);}
      finally{setCheckingExisting(false);}
    }
    checkExistingResults();
  },[]);

  useEffect(()=>{
    if(!router.isReady)return;
    if(router.query.level==="2"&&profile?.quiz_level>=1&&l1Scores===null){
      const profileScores={
        economic:profile.score_economic??50,
        healthcare:profile.score_healthcare??50,
        climate:profile.score_climate??50,
        criminal:profile.score_criminal??50,
        immigration:profile.score_immigration??50,
        foreign:profile.score_foreign??50,
        education:profile.score_education??50,
        freedom:profile.score_freedom??50,
        guns:profile.score_guns??50,
        housing:profile.score_housing??50,
        tech:profile.score_tech??50,
        voting:profile.score_voting??50,
      };
      setL1Scores(profileScores);
      setL2Questions(buildL2(profileScores));
      setPhase("l2_question");
    }
  },[router.isReady,router.query,profile]);

  const l1Skipped=Object.values(l1Answers).filter(v=>v==="skipped").length;
  const l2Skipped=Object.values(l2Answers).filter(v=>v==="skipped").length;

  const handleL1Answer=(dim,score,wt,selIdx)=>{
    const na={...l1Answers,[dim]:score};const nw=wt?{...l1Written,[dim]:wt}:l1Written;
    setL1Answers(na);setL1Written(nw);
    if(selIdx!=null)setL1AnswerIndices(prev=>({...prev,[dim]:selIdx}));
    if(l1QIdx+1>=shuffledL1.length){setPhase("l1_processing");runL1(na,nw);}
    else setL1QIdx(i=>i+1);
  };
  const handleL1Skip=(dim)=>{
    const na={...l1Answers,[dim]:"skipped"};setL1Answers(na);
    if(l1QIdx+1>=shuffledL1.length){setPhase("l1_processing");runL1(na,l1Written);}
    else setL1QIdx(i=>i+1);
  };
  const handleL1Back=()=>{if(l1QIdx>0)setL1QIdx(i=>i-1);};
  const handleL2Answer=(dim,score,wt,selIdx)=>{
    const na={...l2Answers,[dim]:score};const nw=wt?{...l2Written,[dim]:wt}:l2Written;
    setL2Answers(na);setL2Written(nw);
    if(selIdx!=null)setL2AnswerIndices(prev=>({...prev,[dim]:selIdx}));
    if(l2QIdx+1>=l2Questions.length){setPhase("l2_processing");runL2(na,nw);}
    else setL2QIdx(i=>i+1);
  };
  const handleL2Skip=(dim)=>{
    const na={...l2Answers,[dim]:"skipped"};setL2Answers(na);
    if(l2QIdx+1>=l2Questions.length){setPhase("l2_processing");runL2(na,l2Written);}
    else setL2QIdx(i=>i+1);
  };
  const handleL2Back=()=>{if(l2QIdx>0)setL2QIdx(i=>i-1);};
  const startL2=()=>{setL2Questions(buildL2(l1Scores));setL2QIdx(0);setL2Answers({});setL2Written({});setPhase("l2_question");};

  const aiRefine=async(scores,written)=>{
    const entries=Object.entries(written).filter(([,v])=>v&&v.trim());
    if(entries.length===0)return scores;
    try{
      const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error("AI timeout")),2500));
      const res=await Promise.race([
        fetch("/api/ai-refine",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,messages:[{role:"user",content:`Adjust political scores (0=most conservative, 100=most progressive) based on written quiz responses.\nCurrent scores: ${Object.entries(scores).map(([k,v])=>`${k}:${v}`).join(", ")}\nWritten responses: ${entries.map(([k,v])=>`${k}: "${v}"`).join(" | ")}\nReturn ONLY a JSON object adjusting scores for the written dimensions. Example: {"economic":65}\nNo markdown. No explanation. Just JSON.`}]})
        }),
        timeout
      ]);
      const d=await res.json();
      const txt=(d.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim();
      return{...scores,...JSON.parse(txt)};
    }catch(e){console.log("AI skip:",e.message);return scores;}
  };

  const runL1 = async (rawAnswers, writtenInputs) => {
    const hardEscape = setTimeout(() => { setLvl(1); setPhase("l1_badges"); }, 9000);
    try {
      setProcMsg("Reading your answers…");
      const numeric = {};
      Object.entries(rawAnswers).forEach(([k, v]) => { if (v !== "skipped") numeric[k] = v; });

      let refined = numeric;
      try {
        refined = await aiRefine(numeric, writtenInputs);
      } catch (e) { console.log("AI refine skipped:", e.message); }

      setProcMsg("Building your political thumbprint…");
      await new Promise(r => setTimeout(r, 600));
      const full = {};
      DIMS.forEach(d => { full[d] = refined[d] ?? numeric[d] ?? 50; });
      setL1Scores(full);

      try {
        const ps = profileLabel(full);
        const row = {
          user_id: user?.id || null,
          session_id: crypto.randomUUID(),
          completed_at: new Date().toISOString(),
          tier: "basic",
          quiz_level: 1,
          score_economic: full.economic, score_healthcare: full.healthcare,
          score_climate: full.climate, score_criminal: full.criminal,
          score_immigration: full.immigration, score_foreign: full.foreign,
          score_education: full.education, score_freedom: full.freedom,
          score_guns: full.guns, score_housing: full.housing,
          score_tech: full.tech, score_voting: full.voting,
          profile_summary: ps
        };
        const { data: saved, error: se } = await supabase
          .from("quiz_results")
          .upsert(row, { onConflict: "user_id,quiz_level" })
          .select()
          .single();
        console.log("quiz_results save:", saved, se);
        if (!se && saved) {
          if (user?.id) {
            const { error: pe } = await supabase
              .from("profiles")
              .update({
                quiz_result_id: saved.id,
                quiz_level: 1,
                quiz_completed: true,
                score_economic: full.economic,
                score_healthcare: full.healthcare,
                score_climate: full.climate,
                score_criminal: full.criminal,
                score_immigration: full.immigration,
                score_foreign: full.foreign,
                score_education: full.education,
                score_freedom: full.freedom,
                score_guns: full.guns,
                score_housing: full.housing,
                score_tech: full.tech,
                score_voting: full.voting,
              })
              .eq("id", user.id);
            console.log("profiles update:", pe);
          } else {
            setShowSave(true);
          }
        }
        try { await supabase.from("quiz_history").insert({ ...row }); } catch (e) {}
      } catch (e) {
        console.log("Save error:", e.message);
      } finally {
        setPhase("l1_badges");
      }

      const ids = ["voter"];
      if ((profile?.followed_politicians?.length || 0) >= 5) ids.push("activist");
      if ((profile?.followed_issues?.length || 0) >= 3) ids.push("engaged");
      try {
        if (user?.id) {
          const { count } = await supabase
            .from("quiz_history")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);
          if (count >= 3) ids.push("analyst");
        }
      } catch (e) {}
      if (user?.id) {
        const ex = profile?.badges || [];
        const add = ids.filter(b => !ex.includes(b));
        if (add.length > 0) {
          const { error: be } = await supabase
            .from("profiles")
            .update({ badges: [...ex, ...add] })
            .eq("id", user.id);
          console.log("badges update:", be);
        }
      }
      setEarnedBadges(BADGES.filter(b => ids.includes(b.id)));

    } catch (e) {
      console.log("L1 error:", e.message);
    } finally {
      clearTimeout(hardEscape);
      setLvl(1);
      setPhase("l1_badges");
    }
  };

  const runL2 = async (rawAnswers, writtenInputs) => {
    const hardEscape = setTimeout(() => { setLvl(2); setPhase("l2_badges"); }, 9000);
    try {
      setProcMsg("Refining your thumbprint…");
      const numeric = {};
      Object.entries(rawAnswers).forEach(([k, v]) => { if (v !== "skipped") numeric[k] = v; });
      const blended = {};
      DIMS.forEach(d => { blended[d] = Math.round(((l1Scores[d] ?? 50) + (numeric[d] ?? (l1Scores[d] ?? 50))) / 2); });

      let refined = blended;
      try {
        refined = await aiRefine(blended, writtenInputs);
      } catch (e) { console.log("L2 AI refine skipped:", e.message); }

      setProcMsg("Building your refined thumbprint…");
      await new Promise(r => setTimeout(r, 600));
      setL2Scores(refined);

      try {
        const ps = profileLabel(refined);
        const row = {
          user_id: user?.id || null,
          session_id: crypto.randomUUID(),
          completed_at: new Date().toISOString(),
          tier: "informed",
          quiz_level: 2,
          score_economic: refined.economic ?? 50, score_healthcare: refined.healthcare ?? 50,
          score_climate: refined.climate ?? 50, score_criminal: refined.criminal ?? 50,
          score_immigration: refined.immigration ?? 50, score_foreign: refined.foreign ?? 50,
          score_education: refined.education ?? 50, score_freedom: refined.freedom ?? 50,
          score_guns: refined.guns ?? 50, score_housing: refined.housing ?? 50,
          score_tech: refined.tech ?? 50, score_voting: refined.voting ?? 50,
          profile_summary: ps
        };
        const { data: saved } = await supabase.from("quiz_results").upsert(row, { onConflict: "user_id,quiz_level" }).select().single();
        if (saved && user?.id) await supabase.from("profiles").update({
          quiz_result_id: saved.id,
          quiz_level: 2,
          quiz_completed: true,
          score_economic: refined.economic ?? 50,
          score_healthcare: refined.healthcare ?? 50,
          score_climate: refined.climate ?? 50,
          score_criminal: refined.criminal ?? 50,
          score_immigration: refined.immigration ?? 50,
          score_foreign: refined.foreign ?? 50,
          score_education: refined.education ?? 50,
          score_freedom: refined.freedom ?? 50,
          score_guns: refined.guns ?? 50,
          score_housing: refined.housing ?? 50,
          score_tech: refined.tech ?? 50,
          score_voting: refined.voting ?? 50,
        }).eq("id", user.id);
        try { await supabase.from("quiz_history").insert({ ...row }); } catch (e) {}
      } catch (e) {
        console.log("L2 save error:", e.message);
      } finally {
        setPhase("l2_badges");
      }

      const ids = ["informed"];
      if (user?.id) {
        const ex = profile?.badges || [];
        const add = ids.filter(b => !ex.includes(b));
        if (add.length > 0) await supabase.from("profiles").update({ badges: [...ex, ...add] }).eq("id", user.id);
      }
      setEarnedBadges(BADGES.filter(b => ids.includes(b.id)));

    } catch (e) {
      console.log("L2 error:", e.message);
    } finally {
      clearTimeout(hardEscape);
      setLvl(2);
      setPhase("l2_badges");
    }
  };

  const handleRetake=()=>{
    setL1QIdx(0);setL1Answers({});setL1Written({});setL1Scores(null);
    setL2QIdx(0);setL2Answers({});setL2Written({});setL2Scores(null);setL2Questions([]);
    setShowSave(false);setEarnedBadges([]);setLvl(1);
    setL1AnswerIndices({});setL2AnswerIndices({});
    setPhase("intro");
  };

  if(checkingExisting)return(
    <>
      <style>{GLOBAL_STYLES}</style>
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
        <Spinner/>
        <div style={{fontFamily:"'Figtree',sans-serif",fontSize:14,color:C.parchmentDim}}>Loading…</div>
      </div>
    </>
  );

  if(phase==="intro")return(
    <>
      <Head><title>Your Political Thumbprint · Throughline</title></Head>
      <style>{GLOBAL_STYLES}</style>
      <div style={{position:"relative",height:"100vh",overflow:"hidden",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",textAlign:"center"}}>
        <button onClick={()=>router.back()} style={{position:"absolute",top:20,left:24,fontFamily:"'Figtree',sans-serif",fontSize:13,color:"#a89d88",background:"none",border:"none",cursor:"pointer",padding:"4px 0",touchAction:"manipulation"}}>← Back</button>
        <div style={{position:"fixed",top:"28%",left:"50%",transform:"translateX(-50%)",width:600,height:400,background:"radial-gradient(ellipse,rgba(201,168,76,0.04) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{maxWidth:520,animation:"fadeSlideIn 0.6s ease forwards"}}>
          <button onClick={()=>router.push("/")} style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:12,letterSpacing:"0.2em",color:C.gold,background:"none",border:"none",cursor:"pointer",marginBottom:44}}>← THROUGHLINE</button>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,letterSpacing:"0.35em",color:C.gold,marginBottom:18}}>YOUR POLITICAL THUMBPRINT</div>
          <h1 style={{fontFamily:"'Figtree',sans-serif",fontWeight:800,fontSize:"clamp(26px,5.5vw,40px)",color:C.parchment,lineHeight:1.2,marginBottom:18}}>
            What do you actually believe —<br/><span style={{color:C.gold}}>and who votes like you?</span>
          </h1>
          <p style={{fontFamily:"'Figtree',sans-serif",fontSize:15,color:C.parchmentDim,lineHeight:1.8,marginBottom:12}}>12 real-world scenarios. No political jargon. No right or wrong answers.<br/>We'll map your beliefs across 12 policy dimensions and show you which members of Congress actually represent your values.</p>
          <p style={{fontFamily:"'Figtree',sans-serif",fontSize:13,color:C.parchmentDim,lineHeight:1.6,marginBottom:40,opacity:0.65}}>No ideology labels. Just your thumbprint.</p>
          <button onClick={()=>setPhase("l1_question")} style={{...PRIMARY,fontSize:16,padding:"16px 52px",marginBottom:14,animation:"pulseGold 2.8s ease-in-out infinite"}}>START THE QUIZ →</button>
          <div style={{fontFamily:"'Figtree',sans-serif",fontSize:12,color:C.parchmentDim,opacity:0.65}}>~5 minutes · No account required · Skip any question</div>
        </div>
      </div>
      <BottomNavBar activeTab="" />
    </>
  );

  if(phase==="l1_processing"||phase==="l2_processing")return(
    <>
      <style>{GLOBAL_STYLES}</style>
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:28,padding:24,textAlign:"center"}}>
        <Spinner/><div style={{fontFamily:"'Figtree',sans-serif",fontWeight:600,fontSize:20,color:C.parchment}}>{procMsg}</div>
        <div style={{fontFamily:"'Figtree',sans-serif",fontSize:13,color:C.parchmentDim,lineHeight:1.6,maxWidth:340}}>Building your political thumbprint from your responses…</div>
      </div>
    </>
  );

  if(phase==="l1_badges")return(<><Head><title>Badge Earned · Throughline</title></Head><style>{GLOBAL_STYLES}</style><BadgeScreen earnedBadges={earnedBadges.length>0?earnedBadges:[BADGES[0]]} onContinue={()=>setPhase("l1_results")} continueLabel="See My Results →"/></>);
  if(phase==="l2_badges")return(<><Head><title>Badge Earned · Throughline</title></Head><style>{GLOBAL_STYLES}</style><BadgeScreen earnedBadges={earnedBadges.length>0?earnedBadges:[BADGES[1]]} onContinue={()=>setPhase("l2_results")} continueLabel="See My Refined Results →"/></>);

  if(phase==="l1_results")return(<><Head><title>Your Political Thumbprint · Throughline</title></Head><style>{GLOBAL_STYLES}</style><ResultsScreen scores={l1Scores} onStartL2={startL2} onRetake={handleRetake} onContinueToL2={startL2} onExplore={()=>router.push("/")} user={user} showSavePrompt={showSave} onSignUp={()=>router.push("/?signup=true")} level={1} isL1={true} isReturningUser={isReturningUser}/><BottomNavBar activeTab="" /></>);
  if(phase==="l2_results")return(<><Head><title>Your Refined Thumbprint · Throughline</title></Head><style>{GLOBAL_STYLES}</style><ResultsScreen scores={l2Scores} onStartL2={null} onRetake={handleRetake} onContinueToL2={null} onExplore={()=>router.push("/")} user={user} showSavePrompt={showSave} onSignUp={()=>router.push("/?signup=true")} level={2} isL1={false} isReturningUser={isReturningUser}/><BottomNavBar activeTab="" /></>);

  if(phase==="l1_question"){const q=shuffledL1[l1QIdx];return(<><Head><title>Quiz · Throughline</title></Head><style>{GLOBAL_STYLES}</style><div style={{height:"100dvh",overflow:"hidden",position:"fixed",width:"100%",top:0,left:0,background:C.bg,color:C.parchment,display:"flex",flexDirection:"column"}}><button onClick={()=>router.back()} style={{position:"absolute",top:20,left:24,fontFamily:"'Figtree',sans-serif",fontSize:13,color:"#a89d88",background:"none",border:"none",cursor:"pointer",padding:"4px 0",touchAction:"manipulation",zIndex:10}}>← Back</button><QuestionScreen key={l1QIdx} q={q} qIndex={l1QIdx} total={shuffledL1.length} level={1} onAnswer={handleL1Answer} onBack={handleL1Back} onSkip={handleL1Skip} skippedCount={l1Skipped} previousAnswer={l1AnswerIndices[shuffledL1[l1QIdx]?.dimension]??null}/></div></>);}
  if(phase==="l2_question"){const q=l2Questions[l2QIdx];return(<><Head><title>Level 2 Quiz · Throughline</title></Head><style>{GLOBAL_STYLES}</style><div style={{height:"100dvh",overflow:"hidden",position:"fixed",width:"100%",top:0,left:0,background:C.bg,color:C.parchment,display:"flex",flexDirection:"column"}}><button onClick={()=>router.back()} style={{position:"absolute",top:20,left:24,fontFamily:"'Figtree',sans-serif",fontSize:13,color:"#a89d88",background:"none",border:"none",cursor:"pointer",padding:"4px 0",touchAction:"manipulation",zIndex:10}}>← Back</button><QuestionScreen key={`l2-${l2QIdx}`} q={q} qIndex={l2QIdx} total={l2Questions.length} level={2} onAnswer={handleL2Answer} onBack={handleL2Back} onSkip={handleL2Skip} skippedCount={l2Skipped} previousAnswer={l2AnswerIndices[l2Questions[l2QIdx]?.dimension]??null}/></div></>);}

  return null;
}
