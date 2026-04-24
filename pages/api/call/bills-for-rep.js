// pages/api/call/bills-for-rep.js
// GET ?bioguide=X
// Returns up to 8 bills for a member.
// SOURCE 1: our own throughline_events table (preferred — real vote data)
// SOURCE 2: Congress.gov sponsored-legislation (fallback supplement if <3 results)

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Procedural titles to filter out ──────────────────────────────────────────
const PROCEDURAL = [
  "cloture",
  "motion to proceed",
  "on the nomination",
  "on the conference report",
  "quorum",
];

function isProcedural(title = "") {
  const t = title.toLowerCase();
  return PROCEDURAL.some(p => t.includes(p));
}

// ── Dimension keyword mapping ─────────────────────────────────────────────────
function guessDimension(title = "") {
  const t = title.toLowerCase();
  if (/health|medicare|medicaid|drug|pharma|hospital|insurance|prescription/.test(t)) return "healthcare";
  if (/climate|energy|carbon|environment|fossil|oil|gas|emission|renewable|solar|wind/.test(t)) return "climate";
  if (/gun|firearm|weapon|ammunition|background check/.test(t)) return "guns";
  if (/immigr|border|asylum|visa|migrant|daca|refugee/.test(t)) return "immigration";
  if (/educat|school|student loan|college|university|title iv/.test(t)) return "education";
  if (/hous|rent|mortgage|zoning|homeless|affordable/.test(t)) return "housing";
  if (/privacy|data|tech|cyber|surveillance|internet|artificial intelligence/.test(t)) return "tech";
  if (/vot|election|ballot|gerrymandr|redistrict/.test(t)) return "voting";
  if (/criminal|prison|police|justice|sentenc|drug offense|incarcerat/.test(t)) return "criminal";
  if (/foreign|military|defense|nato|ukraine|israel|war|troop|sanction|diplomat/.test(t)) return "foreign";
  if (/tax|tariff|trade|economy|budget|debt|deficit|fiscal|appropriat|spending|revenue/.test(t)) return "economic";
  return "economic";
}

// ── SOURCE 1: throughline_events via Supabase ─────────────────────────────────
async function fromThroughlineEvents(bioguide) {
  // First resolve politician_id from bioguide_id
  const { data: polRow, error: polErr } = await supabase
    .from("politicians")
    .select("id")
    .eq("bioguide_id", bioguide)
    .limit(1)
    .single();

  if (polErr || !polRow) {
    throw new Error(`No politician found for bioguide ${bioguide}`);
  }

  const politicianId = polRow.id;

  // Fetch distinct bills voted on by this politician
  const { data, error } = await supabase
    .from("throughline_events")
    .select("bill_id, bill_name, vote_date, how_voted, dimension, vote_impact, relevant_excerpt")
    .eq("politician_id", politicianId)
    .not("bill_id", "is", null)
    .not("bill_name", "is", null)
    .order("vote_date", { ascending: false })
    .limit(30); // fetch extra, deduplicate below

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  // Deduplicate by bill_id — keep most recent vote per bill
  const seen = new Set();
  const bills = [];
  for (const row of data) {
    if (seen.has(row.bill_id)) continue;
    seen.add(row.bill_id);

    // Attempt a congress.gov URL if the bill_id looks like a slug
    const billUrl = row.bill_id && /[a-z]/.test(row.bill_id)
      ? `https://congress.gov/bill/${row.bill_id}`
      : null;

    bills.push({
      bill_id:     row.bill_id,
      title:       row.bill_name,
      short_title: row.bill_name,
      summary:     row.vote_impact || null,
      vote_date:   row.vote_date,
      how_voted:   row.how_voted,
      dimension:   row.dimension || guessDimension(row.bill_name),
      bill_url:    billUrl,
      source:      "throughline",
    });

    if (bills.length >= 15) break;
  }

  return bills;
}

// ── SOURCE 2: Congress.gov sponsored legislation ──────────────────────────────
async function fromSponsoredLegislation(bioguide) {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) return []; // no key → skip silently

  const url = `https://api.congress.gov/v3/member/${bioguide}/sponsored-legislation?limit=10&api_key=${apiKey}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    console.warn(`[bills-for-rep] Congress.gov sponsored-legislation returned ${res.status}`);
    return [];
  }

  const json = await res.json();
  const items = json?.sponsoredLegislation || [];

  return items
    .filter(item => item.title && !isProcedural(item.title))
    .map(item => ({
      bill_id:     `${item.number || ""}-${item.type || ""}`.toLowerCase(),
      title:       item.title,
      short_title: item.title,
      summary:     item.latestAction?.text || null,
      vote_date:   item.introducedDate || null,
      how_voted:   "SPONSORED",
      dimension:   guessDimension(item.title),
      bill_url:    item.url || null,
      source:      "congress",
    }));
}

// ── API handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { bioguide } = req.query;
  if (!bioguide) {
    return res.status(400).json({ error: "bioguide query param is required" });
  }

  let throughlineBills = [];
  let supplementBills  = [];

  // ── SOURCE 1 ──────────────────────────────────────────────────────────────
  try {
    throughlineBills = await fromThroughlineEvents(bioguide);
  } catch (err) {
    console.error("[bills-for-rep] throughline_events error:", err.message);
    // Fall through — will try SOURCE 2 below
  }

  // ── SOURCE 2 (only if throughline returned < 3) ──────────────────────────
  if (throughlineBills.length < 3) {
    try {
      supplementBills = await fromSponsoredLegislation(bioguide);
    } catch (err) {
      console.error("[bills-for-rep] Congress.gov error:", err.message);
    }
  }

  // ── Combine + deduplicate ─────────────────────────────────────────────────
  if (throughlineBills.length === 0 && supplementBills.length === 0) {
    return res.status(200).json({ bills: [], empty: true });
  }

  const seen = new Set(throughlineBills.map(b => b.bill_id));
  const combined = [...throughlineBills];

  for (const bill of supplementBills) {
    if (!seen.has(bill.bill_id)) {
      seen.add(bill.bill_id);
      combined.push(bill);
    }
    if (combined.length >= 8) break;
  }

  // Sort throughline bills by vote_date DESC; sponsored appended after
  const throughline = combined.filter(b => b.source === "throughline")
    .sort((a, b) => {
      if (!a.vote_date) return 1;
      if (!b.vote_date) return -1;
      return new Date(b.vote_date) - new Date(a.vote_date);
    });
  const sponsored = combined.filter(b => b.source === "congress");

  const bills = [...throughline, ...sponsored].slice(0, 8);

  return res.status(200).json({ bills });
}
