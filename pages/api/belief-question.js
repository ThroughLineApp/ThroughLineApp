// pages/api/belief-question.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RESPONSE_SCORES = {
  strongly_agree: 15,
  agree: 8,
  neutral: 0,
  disagree: -8,
  strongly_disagree: -15,
};

const DIMENSION_COLUMNS = {
  economic: "score_economic",
  healthcare: "score_healthcare",
  climate: "score_climate",
  criminal: "score_criminal",
  immigration: "score_immigration",
  foreign: "score_foreign",
  education: "score_education",
  freedom: "score_freedom",
  guns: "score_guns",
  housing: "score_housing",
  tech: "score_tech",
  voting: "score_voting",
};

async function recalculateScores(user_id) {
  // Fetch all responses for this user with dimension info
  const { data: responses, error: rErr } = await supabase
    .from("user_question_responses")
    .select("response, questions(dimension)")
    .eq("user_id", user_id);

  if (rErr || !responses?.length) return;

  // Fetch current quiz seed scores from profiles
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("score_economic,score_healthcare,score_climate,score_criminal,score_immigration,score_foreign,score_education,score_freedom,score_guns,score_housing,score_tech,score_voting")
    .eq("id", user_id)
    .single();

  if (pErr || !profile) return;

  // Group belief answers by dimension
  const byDimension = {};
  for (const row of responses) {
    const dim = row.questions?.dimension;
    if (!dim) continue;
    if (!byDimension[dim]) byDimension[dim] = [];
    byDimension[dim].push(RESPONSE_SCORES[row.response] ?? 0);
  }

  // Compute blended scores
  const updates = {};
  for (const [dim, col] of Object.entries(DIMENSION_COLUMNS)) {
    const answers = byDimension[dim] || [];
    const count = answers.length;
    if (count === 0) continue;

    const beliefAvg = answers.reduce((s, v) => s + v, 0) / count;
    // Quiz seed is on 0-100 scale, normalize to -20..20 for blending
    const seedRaw = profile[col] ?? 50;
    const seedNormalized = ((seedRaw - 50) / 50) * 20;

    // Seed weight decays from 10 to 0 as belief count grows (min 0)
    const seedWeight = Math.max(0, 10 - count);
    const beliefWeight = count;
    const blended = (seedNormalized * beliefWeight + beliefAvg * beliefWeight) / (seedWeight + beliefWeight);

    // Convert back to 0-100 scale
    updates[col] = Math.round(((blended / 20) * 50) + 50);
  }

  if (Object.keys(updates).length === 0) return;

  await supabase.from("profiles").update(updates).eq("id", user_id);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { user_id } = req.query;

    let answeredIds = [];
    let lastAnsweredQuestionId = null;

    if (user_id) {
      const { data: answered, error: answeredError } = await supabase
        .from("user_question_responses")
        .select("question_id, answered_at")
        .eq("user_id", user_id)
        .order("answered_at", { ascending: false, nullsFirst: false });

      if (answeredError) {
        console.error("belief-question GET error (answered):", answeredError.message);
        return res.status(500).json({ error: answeredError.message });
      }

      answeredIds = (answered || []).map((r) => r.question_id);
      lastAnsweredQuestionId = answered?.[0]?.question_id ?? null;
    }

    if (lastAnsweredQuestionId) {
      const { data: lastQ } = await supabase
        .from("questions")
        .select("id, difficulty")
        .eq("id", lastAnsweredQuestionId)
        .single();

      if (lastQ?.difficulty === "basic") {
        const { data: followUps } = await supabase
          .from("questions")
          .select("id, question_text, category, sub_issue, dimension, difficulty")
          .eq("follow_up_to", lastAnsweredQuestionId)
          .limit(1);

        const followUp = followUps?.[0] ?? null;
        if (followUp && !answeredIds.includes(followUp.id)) {
          return res.status(200).json({ question: followUp });
        }
      }
    }

    let query = supabase
      .from("questions")
      .select("id, question_text, category, sub_issue, dimension, difficulty")
      .eq("difficulty", "basic")
      .order("dimension", { ascending: true })
      .limit(1);

    if (answeredIds.length > 0) {
      query = query.not("id", "in", `(${answeredIds.join(",")})`);
    }

    const { data: questions, error: qError } = await query;
    if (qError) {
      console.error("belief-question GET error (questions):", qError.message);
      return res.status(500).json({ error: qError.message });
    }

    return res.status(200).json({ question: questions?.[0] || null });
  }

  if (req.method === "POST") {
    const { user_id, question_id, response } = req.body || {};

    if (!user_id || !question_id || !response) {
      return res.status(400).json({ error: "Missing user_id, question_id, or response" });
    }

    const VALID = ["strongly_agree", "agree", "neutral", "disagree", "strongly_disagree"];
    if (!VALID.includes(response)) {
      return res.status(400).json({ error: "Invalid response value" });
    }

    const { error } = await supabase
      .from("user_question_responses")
      .upsert(
        { user_id, question_id, response, answered_at: new Date().toISOString() },
        { onConflict: "user_id,question_id" }
      );

    if (error) {
      console.error("belief-question POST error:", JSON.stringify(error));
      return res.status(500).json({ error: error.message, details: JSON.stringify(error) });
    }

    // Recalculate and update profile scores after successful save
    await recalculateScores(user_id);

    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
