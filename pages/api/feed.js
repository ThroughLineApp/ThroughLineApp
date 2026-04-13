import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PAGE_SIZE = 10;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { state, follows, page = "0" } = req.query;
  const pageNum = parseInt(page, 10) || 0;
  const from = pageNum * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  try {
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
      `, { count: "exact" })
      .not("donation_amount", "is", null)
      .order("donation_amount", { ascending: false });

    if (follows) {
      const followList = follows.split(",").filter(Boolean);
      if (followList.length > 0) {
        query = query.in("politician_id", followList);
      }
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    // Flatten politician join into event object
    const events = (data || []).map(e => ({
      ...e,
      politician_name: e.politicians?.name,
      party: e.politicians?.party,
      state: e.politicians?.state,
      politician_slug: e.politicians?.slug,
      donor_alignment_score: e.politicians?.donor_alignment_score,
      bioguide_id: e.politicians?.bioguide_id,
      days_before_vote: e.days_between,
    }));

    // State 2: sort user's state reps to top
    let sorted = events;
    if (state && !follows) {
      sorted = [
        ...events.filter(e => e.state === state),
        ...events.filter(e => e.state !== state),
      ];
    }

    return res.status(200).json({
      events: sorted,
      hasMore: count ? from + PAGE_SIZE < count : false,
      total: count,
    });
  } catch (err) {
    console.error("Feed API error:", err.message);
    return res.status(200).json({ events: [], hasMore: false, total: 0, fallback: true });
  }
}
