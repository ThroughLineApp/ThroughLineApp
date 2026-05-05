// pages/api/belief-question.js
// GET  — fetch one unanswered question for the logged-in user
// POST — save a user's response to user_question_responses

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { user_id } = req.query;
    console.log("SERVICE_ROLE_KEY present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!user_id) return res.status(400).json({ error: "Missing user_id" });

    // Fetch all question IDs the user has already answered
    const { data: answered, error: answeredError } = await supabase
      .from("user_question_responses")
      .select("question_id")
      .eq("user_id", user_id);

    if (answeredError) {
      console.error("belief-question GET error (answered):", answeredError.message);
      return res.status(500).json({ error: answeredError.message });
    }

    const answeredIds = (answered || []).map((r) => r.question_id);

    // Fetch one unanswered question
    let query = supabase
      .from("questions")
      .select("id, question_text, category, sub_issue, dimension, difficulty")
      .order("difficulty", { ascending: true })
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

    const question = questions?.[0] || null;
    return res.status(200).json({ question });
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
      console.error("belief-question POST error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
