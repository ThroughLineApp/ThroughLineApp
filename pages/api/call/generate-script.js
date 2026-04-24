// pages/api/call/generate-script.js
// POST — generates a call or email script via Claude, logs to call_actions

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SYSTEM_PROMPT = `You are helping a constituent contact their representative.
Write a clear, respectful, and persuasive script.
Be specific about the bill. Reference the rep's actual vote if relevant.
Keep it concise — under 90 seconds to read aloud for calls,
under 200 words for emails. No filler. No generic platitudes.
Sound like a real person, not a form letter.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    rep_name,
    rep_party,
    rep_chamber,
    rep_phone,
    rep_contact_form,
    bill_title,
    bill_summary,
    how_rep_voted,
    user_position,
    user_reason,
    user_name,
    action_type,
    bioguide_id,
    bill_id,
    user_id,
  } = req.body || {};

  // ── Validate required fields ──────────────────────────────────────────────
  if (!rep_name || !bill_title || !user_position || !action_type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  // ── Build user prompt ─────────────────────────────────────────────────────
  const actionLabel  = action_type === "email" ? "email" : "call script";
  const contactInfo  = action_type === "call"
    ? (rep_phone ? `Phone: ${rep_phone}` : "")
    : (rep_contact_form ? `Contact form: ${rep_contact_form}` : "");

  const lines = [
    `Write a ${actionLabel} for a constituent contacting ${rep_name} (${rep_party || "?"}, ${rep_chamber || "?"}).`,
    "",
    `Bill: ${bill_title}`,
  ];
  if (bill_summary) lines.push(bill_summary);
  if (how_rep_voted) lines.push(`Rep voted: ${how_rep_voted}`);
  lines.push(`Constituent position: ${user_position} this bill`);
  if (user_reason) lines.push(`Their reason: ${user_reason}`);
  if (user_name)   lines.push(`Constituent name: ${user_name}`);
  lines.push("");

  if (action_type === "call") {
    lines.push("For a call script: format as Introduction, Issue, Ask, Close. Label each section clearly.");
  } else {
    lines.push("For an email: format as Subject line, then body with greeting, issue paragraph, ask paragraph, closing.");
  }

  if (contactInfo) lines.push(`Include ${rep_name}'s ${contactInfo} at the end.`);

  const userPrompt = lines.join("\n");

  // ── Call Claude ───────────────────────────────────────────────────────────
  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model:      "claude-opus-4-5",
      max_tokens: 800,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: userPrompt }],
    });

    const script = message.content?.[0]?.text || "";

    // ── Log to call_actions (skip if no user_id) ──────────────────────────
    if (user_id && bioguide_id) {
      try {
        // Look up politician_id by bioguide_id
        const { data: pol } = await supabaseAdmin
          .from("politicians")
          .select("id")
          .eq("bioguide_id", bioguide_id)
          .single();

        if (pol?.id) {
          await supabaseAdmin.from("call_actions").insert({
            user_id,
            politician_id: pol.id,
            bill_id:       bill_id || null,
            action_type,
            created_at:    new Date().toISOString(),
          });
        }
      } catch (dbErr) {
        // Non-fatal — log but don't fail the response
        console.error("[generate-script] DB log error:", dbErr.message);
      }
    }

    return res.status(200).json({
      script,
      action_type,
      rep_phone:        rep_phone        || null,
      rep_contact_form: rep_contact_form || null,
    });
  } catch (err) {
    console.error("[generate-script] Claude error:", err.message);
    return res.status(500).json({ error: "Could not generate script" });
  }
}
