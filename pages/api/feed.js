import supabase from "../../lib/supabase";

const PAGE_SIZE = 10;

function isRawPacId(str) {
  return /^C\d{8}$/.test(str ?? "");
}

function cleanBillName(enriched, raw, dimension) {
  if (enriched && enriched.length > 0) return enriched;
  if (!raw) return "Federal Legislation";
  const cleaned = raw
    .replace(/^On Motion to Suspend the Rules and (Pass|Agree)/i, "Vote on")
    .replace(/^On Motion to Recommit/i, "Motion to Recommit")
    .replace(/^On Passage/i, "Final Passage Vote")
    .replace(/^On Agreeing to the Amendment/i, "Amendment Vote")
    .replace(/^On the Resolution/i, "Resolution Vote")
    .replace(/^On the Conference Report/i, "Conference Report Vote")
    .replace(/^On Cloture/i, "Cloture Vote")
    .replace(/^On the Nomination/i, "Nomination Vote")
    .replace(/^On the Joint Resolution/i, "Joint Resolution Vote");
  if (cleaned !== raw) {
    const dimLabel = {
      economic:    "Economic Policy",
      healthcare:  "Healthcare",
      climate:     "Climate & Energy",
      criminal:    "Criminal Justice",
      immigration: "Immigration",
      foreign:     "Foreign Policy",
      education:   "Education",
      freedom:     "Personal Freedom",
      guns:        "Gun Policy",
      housing:     "Housing & Urban",
      tech:        "Tech & Privacy",
      voting:      "Electoral Rights",
    }[dimension] || dimension;
    return dimLabel ? `${cleaned} — ${dimLabel}` : cleaned;
  }
  return cleaned;
}

function buildFallbackImpact(row) {
  const voted = row.how_voted === "Yea" ? "voted in favor" : "voted against";
  const bill = cleanBillName(row.bill_name_enriched, row.bill_name, row.dimension);
  const days = row.days_between ? `${row.days_between} days` : "shortly";
  const amount = row.donation_amount
    ? `$${Number(row.donation_amount).toLocaleString()}`
    : "a significant donation";
  return `This politician ${voted} on ${bill}, ${days} after receiving ${amount} from this donor.`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { state, follows, page: pageParam = "0" } = req.query;
    const page = parseInt(pageParam, 10) || 0;

    let userScores = null;
    if (req.query.scores) {
      try { userScores = JSON.parse(req.query.scores); } catch (_) {}
    }

    const followsArray = follows
      ? follows.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    // ── Build query against the view ──────────────────────────────────────
    let query = supabase
      .from("feed_events_deduped")
      .select(`
        id, politician_id, donor_name, donor_industry, donor_pac_name,
        donation_amount, donation_date, bill_name, bill_name_enriched,
        bill_link, vote_date, how_voted, days_between, vote_impact,
        dimension, corruption_contribution,
        politicians!inner(name, party, state, chamber, bioguide_id, slug, donor_alignment_score)
      `)
      .not("donation_date", "is", null)
      .not("vote_date", "is", null);

    if (followsArray.length > 0) {
      query = query.in("politician_id", followsArray);
    } else if (state) {
      query = query.eq("politicians.state", state);
    }

    query = query
      .order("vote_date", { ascending: false })
      .range(page * PAGE_SIZE * 3, (page + 1) * PAGE_SIZE * 3 - 1);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];

    // ── Deduplicate: one row per (politician_id, donor_name) ──────────────
    const seen = new Map();
    for (const row of rows) {
      const key = `${row.politician_id}|${row.donor_name}`;
      if (!seen.has(key)) {
        seen.set(key, row);
      } else {
        const existing = seen.get(key);
        if (row.vote_date > existing.vote_date) {
          seen.set(key, row);
        }
      }
    }
    let deduped = Array.from(seen.values());

    // ── Sort by dimension relevance if user scores provided ───────────────
    if (userScores && typeof userScores === "object") {
      deduped.sort((a, b) => {
        const relA = Math.abs((userScores[a.dimension] ?? 50) - 50);
        const relB = Math.abs((userScores[b.dimension] ?? 50) - 50);
        return relB - relA;
      });
    }

    // ── Slice to PAGE_SIZE ────────────────────────────────────────────────
    const hasMore = deduped.length > PAGE_SIZE;
    const sliced = deduped.slice(0, PAGE_SIZE);

    // ── Shape response ────────────────────────────────────────────────────
    const shaped = sliced.map(row => ({
      id:                      row.id,
      politician_id:           row.politician_id,
      politician_name:         row.politicians.name,
      politician_party:        row.politicians.party,
      politician_state:        row.politicians.state,
      politician_chamber:      row.politicians.chamber,
      politician_slug:         row.politicians.slug,
      politician_bioguide_id:  row.politicians.bioguide_id,
      donor_alignment_score:   row.politicians.donor_alignment_score,
      donor_name: (() => {
        const name = row.donor_pac_name || row.donor_name;
        if (isRawPacId(name)) {
          return row.donor_industry
            ? row.donor_industry.charAt(0).toUpperCase() + row.donor_industry.slice(1) + " Industry PAC"
            : "PAC Donor";
        }
        return name;
      })(),
      donor_industry:          row.donor_industry,
      donation_amount:         row.donation_amount,
      donation_date:           row.donation_date,
      bill_name:               cleanBillName(row.bill_name_enriched, row.bill_name, row.dimension),
      bill_link:               row.bill_link,
      vote_date:               row.vote_date,
      how_voted:               row.how_voted,
      days_between:            row.days_between,
      vote_impact:             row.vote_impact || buildFallbackImpact(row),
      dimension:               row.dimension,
      corruption_contribution: row.corruption_contribution,
    }));

    return res.status(200).json({
      events:   shaped,
      hasMore,
      page,
      fallback: false,
    });

  } catch (err) {
    console.error("Feed API error:", err.message);
    return res.status(200).json({ events: [], hasMore: false, fallback: true });
  }
}
