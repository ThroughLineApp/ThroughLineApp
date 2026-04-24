// pages/api/call/log-action.js
// POST { user_id, bioguide_id, bill_id, action_type }
// Logs a completed call or email action and returns updated count.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user_id, bioguide_id, bill_id, action_type } = req.body || {};

  if (!action_type) {
    return res.status(400).json({ error: "action_type is required" });
  }

  try {
    // Look up politician_id from politicians table by bioguide_id
    let politician_id = null;
    if (bioguide_id) {
      const { data: pol } = await supabaseAdmin
        .from("politicians")
        .select("id")
        .eq("bioguide_id", bioguide_id)
        .single();
      politician_id = pol?.id || null;
    }

    // INSERT into call_actions
    await supabaseAdmin.from("call_actions").insert({
      user_id:       user_id       || null,
      politician_id: politician_id || null,
      bill_id:       bill_id       || null,
      action_type,
      created_at:    new Date().toISOString(),
    });

    // Return total count
    const { count } = await supabaseAdmin
      .from("call_actions")
      .select("*", { count: "exact", head: true });

    return res.status(200).json({ success: true, count: count || 0 });
  } catch (err) {
    console.error("[log-action] error:", err.message);
    return res.status(500).json({ error: "Could not log action" });
  }
}
