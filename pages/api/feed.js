import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PAGE_SIZE = 10;

const BAD_BILL_PATTERNS = [
  /^On the Cloture Motion/i,
  /^On the Motion/i,
  /^On Cloture/i,
  /^On the Nomination/i,
  /^On the Conference Report/i,
  /^On the Joint Resolution/i,
  /^On Passage of the Bill/i,
  /^On the Amendment/i,
  /^On the Resolution/i,
  /^PN\d/i,
];

function isBadBillName(name) {
  if (!name) return true;
  return BAD_BILL_PATTERNS.some(p => p.test(name.trim()));
}

function isRawPacId(name) {
  if (!name) return true;
  return /^C\d{8}$/.test(name.trim());
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { state, follows, page = "0" } = req.query;
  const pageNum = parseInt(page, 10) || 0;

  try {
    const fetchSize = PAGE_SIZE * 20;
    const from = pageNum * fetchSize;
    const to = from + fetchSize - 1;

    let query = supabase
      .from("throughline_events")
      .select(`
        id,
        politician_id,
        donor_name,
        donor_industry,
        donor_pac_name,
        donation_amount,
        donation_date,
        bill_name,
        bill_name_enriched,
        bill_link,
        vote_date,
        how_voted,
        days_between,
        vote_impact,
        dimension,
        corruption_contribution,
        confidence_score,
        politicians (
          id,
          name,
          party,
          state,
          slug,
          donor_alignment_score,
          bioguide_id
        )
      `)
      .not("donation_amount", "is", null)
      .not("vote_impact", "is", null)
      .order("donation_amount", { ascending: false });

    if (follows) {
      const followList = follows.split(",").filter(Boolean);
      if (followList.length > 0) {
        query = query.in("politician_id", followList);
      }
    }

    const { data, error } = await query.range(from, to);
    if (error) throw error;

    // Flatten join
    let events = (data || []).map(e => ({
      ...e,
      politician_name: e.politicians?.name,
      party: e.politicians?.party,
      state: e.politicians?.state,
      politician_slug: e.politicians?.slug,
      donor_alignment_score: e.politicians?.donor_alignment_score,
      bioguide_id: e.politicians?.bioguide_id,
      bill_name: e.bill_name_enriched || e.bill_name,
      days_before_vote: e.days_between,
      vote_impact: e.vote_impact
        ? e.vote_impact.replace(/^#+\s*/gm, "").replace(/\n+/g, " ").trim()
        : null,
      donor_display: isRawPacId(e.donor_pac_name)
        ? (isRawPacId(e.donor_name)
            ? (e.donor_industry || "PAC donor")
            : e.donor_name)
        : e.donor_pac_name,
    }));

    // Filter — only remove truly bad data, keep everything else
    events = events.filter(e =>
      e.politician_name &&
      e.bioguide_id &&
      e.donation_amount > 0 &&
      e.vote_impact &&
      e.vote_impact.length > 20
    );

    // Deduplicate — one card per politician per page
    const seenPoliticians = new Set();
    const deduped = [];
    for (const e of events) {
      if (!seenPoliticians.has(e.politician_id)) {
        seenPoliticians.add(e.politician_id);
        deduped.push(e);
      }
      if (deduped.length >= PAGE_SIZE) break;
    }

    // Sort user's state reps to top
    let sorted = deduped;
    if (state && !follows) {
      sorted = [
        ...deduped.filter(e => e.state === state),
        ...deduped.filter(e => e.state !== state),
      ];
    }

    return res.status(200).json({
      events: sorted,
      hasMore: sorted.length === PAGE_SIZE,
      total: null,
    });
  } catch (err) {
    console.error("Feed API error:", err.message);
    return res.status(200).json({
      events: [],
      hasMore: false,
      total: 0,
      fallback: true,
    });
  }
}
