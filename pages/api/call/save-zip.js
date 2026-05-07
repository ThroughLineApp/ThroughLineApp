// pages/api/call/save-zip.js
// POST { zip_code, user_id } — resolves reps and saves to profiles via service role

import { createClient } from "@supabase/supabase-js";
import { lookupRepsForZip } from "./lookup-zip";

// Admin client — service role only, never exposed to the browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { zip_code, user_id } = req.body || {};

  if (!zip_code || String(zip_code).length < 5) {
    return res.status(400).json({ error: "A 5-digit ZIP code is required" });
  }

  try {
    const { senators, rep } = lookupRepsForZip(String(zip_code));
    const bioguide_ids = [...(senators || []), rep]
      .filter(Boolean)
      .map((r) => r.bioguide_id)
      .filter(Boolean);

    // Only write to DB if we have a logged-in user
    if (user_id) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id:          user_id,
            zip_code:    String(zip_code),
            my_reps:     bioguide_ids,
            zip_set_at:  new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (error) {
        console.error("[save-zip] upsert error:", error.message);
        return res.status(500).json({ error: "Failed to save ZIP code" });
      }
    }

    return res.status(200).json({ success: true, senators, rep });
  } catch (err) {
    console.error("[save-zip] error:", err.message);
    return res.status(500).json({ error: "Could not save ZIP code" });
  }
}
