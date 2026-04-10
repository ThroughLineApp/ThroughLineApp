// enrich_pac_names.js
// Looks up FEC committee names for all pac_ids in pac_donors
// Run: node enrich_pac_names.js
// NEVER commit this file to GitHub

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://busiguukyesnvgriktbu.supabase.co";
const SUPABASE_KEY = "sb_publishable_ISiDLfrT9y1mXTAn0IA2YA_jrGAz9fy";
const FEC_API_KEY  = "2o71tf1UbC12kFd9m81dssecJdTWykab9B092imr";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log("Loading pac_ids with no name yet...");

  const { data: pacs, error } = await supabase
    .from("pac_donors")
    .select("pac_id")
    .is("pac_name", null);

  if (error) { console.error(error.message); process.exit(1); }

  // Deduplicate pac_ids
  const uniqueIds = [...new Set(pacs.map(p => p.pac_id))];
  console.log(`Found ${uniqueIds.length} unique PAC IDs to enrich.`);

  let enriched = 0;
  let failed   = 0;

  for (const pacId of uniqueIds) {
    try {
      const url = `https://api.open.fec.gov/v1/committee/${pacId}/?api_key=${FEC_API_KEY}`;
      const res  = await fetch(url);
      const json = await res.json();
      const name = json?.results?.[0]?.name ?? null;

      if (!name) { failed++; continue; }

      const { error: updateError } = await supabase
        .from("pac_donors")
        .update({ pac_name: name })
        .eq("pac_id", pacId);

      if (updateError) {
        console.warn(`  Update failed for ${pacId}: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  ✓ ${pacId} → ${name}`);
        enriched++;
      }

      await sleep(200);
    } catch (err) {
      console.warn(`  ✗ ${pacId}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Enriched: ${enriched}, Failed: ${failed}`);
}

run().catch(err => { console.error(err); process.exit(1); });
