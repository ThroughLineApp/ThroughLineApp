// pages/api/feed.js
// Server-side feed API. Handles all 3 user states.
// Params: state (2-letter), follows (comma-sep bioguide_ids), issues (comma-sep), page (0-indexed)
// Returns: { events: [...], hasMore: bool }

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PAGE_SIZE = 10;
const MIN_CONFIDENCE = 50;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { state, follows, issues, page = "0" } = req.query;
  const pageNum = parseInt(page, 10) || 0;
  const from = pageNum * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  try {
    let query = supabase
      .from("throughline_events")
      .select(`
        id,
        politician_id,
        politician_name,
        party,
        state,
        politician_slug,
        donor_name,
        donor_industry,
        donation_amount,
        donation_date,
        bill_name,
        bill_id,
        bill_link,
        vote_date,
        how_voted,
        days_before_vote,
        vote_impact,
        dimension,
        corruption_contribution,
        confidence_score,
        donor_alignment_score
      `, { count: "exact" });

    // Confidence threshold
    // If confidence_score column doesn't exist yet, we skip this filter gracefully
    // (handled in catch below — will fall back to mock)

    // State 3: logged in with follows
    if (follows) {
      const followList = follows.split(",").filter(Boolean);
      if (followList.length > 0) {
        query = query
          .in("bioguide_id", followList)
          .order("vote_date", { ascending: false });
      }
    }
    // State 2: anon with zip/state
    else if (state) {
      query = query
        .order("vote_date", { ascending: false });
      // We'll filter state-first in JS after fetching since we can't do conditional ORDER BY in supabase-js
    }
    // State 1: anon no context — highest dollar amounts
    else {
      query = query
        .order("donation_amount", { ascending: false })
        .order("vote_date", { ascending: false });
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    let events = data || [];

    // State 2: sort state politicians to top
    if (state && !follows) {
      events = [
        ...events.filter(e => e.state === state),
        ...events.filter(e => e.state !== state),
      ];
    }

    const hasMore = count ? from + PAGE_SIZE < count : false;

    return res.status(200).json({ events, hasMore, total: count });
  } catch (err) {
    console.error("Feed API error:", err.message);
    // Return empty — feed.jsx falls back to curated mock data
    return res.status(200).json({ events: [], hasMore: false, total: 0, fallback: true });
  }
}
