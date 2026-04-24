// pages/api/call/bills-for-rep.js
// GET ?bioguide=X&chamber=senate|house
// Returns up to 8 recent bills the member voted on, with dimension tagging.

const CONGRESS_BASE = "https://api.congress.gov/v3";

// ── In-memory cache: { [bioguide]: { data, fetchedAt } } ─────────────────────
const _cache = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ── Procedural vote titles to filter out ─────────────────────────────────────
const PROCEDURAL = [
  "cloture",
  "motion to proceed",
  "on the nomination",
  "on the conference report",
  "quorum",
];

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

function isProcedural(title = "") {
  const t = title.toLowerCase();
  return PROCEDURAL.some(p => t.includes(p));
}

async function fetchBillsForRep(bioguide) {
  const now = Date.now();
  if (_cache[bioguide] && now - _cache[bioguide].fetchedAt < CACHE_TTL) {
    return _cache[bioguide].data;
  }

  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) throw new Error("CONGRESS_API_KEY not set");

  const url = `${CONGRESS_BASE}/member/${bioguide}/votes?limit=20&api_key=${apiKey}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    throw new Error(`Congress API returned ${res.status} for member ${bioguide}`);
  }

  const json = await res.json();
  const voteItems = json?.votes || [];

  // Deduplicate by bill_id, filter procedural, build bill objects
  const seen = new Set();
  const bills = [];

  for (const item of voteItems) {
    // Congress API vote record shape varies — normalize what we can
    const title =
      item.description ||
      item.question ||
      item.bill?.title ||
      item.amendment?.description ||
      "";

    if (!title || isProcedural(title)) continue;

    // Build a stable bill_id
    const billNumber = item.bill?.number || "";
    const billType   = item.bill?.type   || "";
    const congress   = item.congress     || item.bill?.congress || "";
    const bill_id    = billNumber && congress
      ? `${billType.toLowerCase()}${billNumber}-${congress}`
      : `vote-${item.rollCall || Math.random().toString(36).slice(2)}`;

    if (seen.has(bill_id)) continue;
    seen.add(bill_id);

    const billUrl =
      item.bill?.url ||
      (billNumber && congress
        ? `https://www.congress.gov/bill/${congress}th-congress/${billType.toLowerCase()}-bill/${billNumber}`
        : null);

    bills.push({
      bill_id,
      title,
      short_title: item.bill?.title || title,
      summary: item.description || null,
      vote_date:  item.date || null,
      how_voted:  item.memberVoted || item.voted || null,
      congress:   String(congress),
      bill_url:   billUrl,
      dimension:  guessDimension(title),
    });

    if (bills.length >= 8) break;
  }

  // Sort descending by vote_date
  bills.sort((a, b) => {
    if (!a.vote_date) return 1;
    if (!b.vote_date) return -1;
    return new Date(b.vote_date) - new Date(a.vote_date);
  });

  _cache[bioguide] = { data: bills, fetchedAt: now };
  return bills;
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

  try {
    const bills = await fetchBillsForRep(bioguide);
    return res.status(200).json({ bills });
  } catch (err) {
    console.error("[bills-for-rep] error:", err.message);
    return res.status(500).json({ error: "Could not fetch bills" });
  }
}
