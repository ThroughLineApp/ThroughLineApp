require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DELAY_MS = 300;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWikipediaPhoto(name) {
  const encoded = encodeURIComponent(name.replace(/ /g, "_"));
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const { data: politicians, error } = await supabase
    .from("politicians")
    .select("id, name")
    .is("wikipedia_photo_url", null);

  if (error) { console.error("Failed to load politicians:", error.message); process.exit(1); }
  console.log(`Fetching Wikipedia photos for ${politicians.length} politicians...\n`);

  let found = 0;
  for (const pol of politicians) {
    const photoUrl = await fetchWikipediaPhoto(pol.name);
    if (photoUrl) {
      const { error: updateError } = await supabase
        .from("politicians")
        .update({ wikipedia_photo_url: photoUrl })
        .eq("id", pol.id);
      if (updateError) {
        console.log(`[${pol.name}] update failed: ${updateError.message}`);
      } else {
        console.log(`[${pol.name}] photo found`);
        found++;
      }
    } else {
      console.log(`[${pol.name}] not found`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDone. Found ${found} of ${politicians.length}.`);
}

main();
