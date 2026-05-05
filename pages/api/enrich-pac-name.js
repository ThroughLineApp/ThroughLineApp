// pages/api/enrich-pac-name.js
// Server-side route: persists a FEC-resolved PAC name to pac_donors using the
// service role key (bypasses RLS). Called fire-and-forget from /local after a
// successful FEC committee lookup.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { pac_id, pac_name } = req.body || {};
  if (!pac_id || !pac_name) {
    return res.status(400).json({ error: "Missing pac_id or pac_name" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Only update rows that still have a null pac_name — never overwrite existing data
  const { error } = await supabase
    .from("pac_donors")
    .update({ pac_name })
    .eq("pac_id", pac_id)
    .is("pac_name", null);

  if (error) {
    console.error("enrich-pac-name error:", error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
