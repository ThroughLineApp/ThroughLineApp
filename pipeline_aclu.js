// pipeline_aclu.js
// Scrapes ACLU congressional scorecard via Puppeteer (IDs 1–600).
// Writes score_freedom AND score_criminal (ACLU covers both dimensions).
// Priority politicians → score_review_queue
// Non-priority politicians → politicians.score_* (direct write)
// All politicians → politician_score_history
//
// Flags:
//   --dry-run        Log what would be written, write nothing
//   --priority-only  Only process priority politicians
//   --single "Name"  Process one politician by name
//   --fast           500ms between requests (default: 2000ms)
//   --skip-scrape    Skip Puppeteer phase; use existing checkpoint only

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN        = process.argv.includes("--dry-run");
const PRIORITY_ONLY  = process.argv.includes("--priority-only");
const FAST           = process.argv.includes("--fast");
const SKIP_SCRAPE    = process.argv.includes("--skip-scrape");
const SINGLE_IDX     = process.argv.indexOf("--single");
const SINGLE_NAME    = SINGLE_IDX !== -1 ? process.argv[SINGLE_IDX + 1] : null;

const DELAY_MS        = FAST ? 500 : 2000;
const DATA_DIR        = path.join(__dirname, "data");
const CHECKPOINT_PATH = path.join(DATA_DIR, "aclu_scores.json");
const LOG_PATH        = path.join(__dirname, "unmatched_aclu.log");
const MAX_ID          = 600;
const ACLU_BASE       = "https://www.aclu.org/congressional-scorecards";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── legislators-current.json index (same pattern as ideology pipeline) ────────

function loadLegislators() {
  const filePath = path.join(__dirname, "public", "legislators-current.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildLegislatorIndex(legislators) {
  const index = {};
  for (const l of legislators) {
    const t = l.terms[l.terms.length - 1];
    const state = t.state.toUpperCase();
    const lastName = l.name.last.toLowerCase();
    const key = `${state}:${lastName}`;
    if (!index[key]) index[key] = [];
    index[key].push({ bioguide: l.id.bioguide, firstName: l.name.first.toLowerCase() });
  }
  return index;
}

function normalizeName(name) {
  return name
    .replace(/^(Rep\.|Sen\.)\s*/i, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+(Jr\.|Sr\.|III|IV|II|V)\.?$/i, "")
    .trim();
}

function resolveBioguide(index, state, fullName) {
  const normalized = normalizeName(fullName);
  const parts = normalized.split(/\s+/);
  const lastName = parts[parts.length - 1].toLowerCase();
  const firstName = parts[0].toLowerCase();
  const stateUp = state.toUpperCase();

  let matches = index[`${stateUp}:${lastName}`];
  if (!matches || matches.length === 0) {
    if (parts.length >= 3) {
      const altLast = parts[parts.length - 2].toLowerCase();
      matches = index[`${stateUp}:${altLast}`];
    }
  }
  if (!matches || matches.length === 0) return null;
  if (matches.length === 1) return matches[0].bioguide;
  const firstMatch = matches.find(m => m.firstName.startsWith(firstName.slice(0, 3)));
  return firstMatch ? firstMatch.bioguide : matches[0].bioguide;
}

// ── STATE_ABBR map (full name → 2-letter) ─────────────────────────────────────

const STATE_ABBR = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA",
  "Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD",
  "Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS",
  "Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH",
  "New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC",
  "North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA",
  "Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD","Tennessee":"TN",
  "Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA","Washington":"WA",
  "West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY","District of Columbia":"DC",
};

// ── Puppeteer scrape phase ────────────────────────────────────────────────────

async function scrapeACLU(existing) {
  const puppeteer = require("puppeteer");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  const results = { ...existing };
  let found = 0, empty = 0, skipped = 0;

  for (let id = 1; id <= MAX_ID; id++) {
    // Skip if: confirmed null (404/empty) OR already has name+score
    const cached = results[id];
    if (cached === null || (cached?.name && cached?.score != null)) {
      skipped++;
      continue;
    }

    const url = `${ACLU_BASE}?legislator=${id}`;
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

      // Wait for h1 to be populated with a real legislator name
      // (not the generic "Congressional Scorecards" heading)
      try {
        await page.waitForFunction(
          () => {
            const h1 = document.querySelector("h1");
            return h1 &&
              h1.textContent.trim().length > 3 &&
              !h1.textContent.includes("Congressional Scorecards");
          },
          { timeout: 6000 }
        );
      } catch (_) {
        // Timeout → generic/404 page, no legislator at this ID
        results[id] = null;
        empty++;
        if (id % 50 === 0) fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(results, null, 2));
        await sleep(DELAY_MS);
        continue;
      }

      const data = await page.evaluate((stateAbbr) => {
        const h1El = document.querySelector("h1");
        const name = h1El ? h1El.textContent.trim() : null;

        const allText = document.body.innerText || "";

        // State: "State: Maryland" → "MD"
        const stateMatch = allText.match(/State:\s*([A-Za-z ]+)/);
        const stateFull = stateMatch ? stateMatch[1].trim() : null;
        const state = stateFull ? (stateAbbr[stateFull] || null) : null;

        // Score: h2 starts with "XX% of NAME's N votes"
        // This is the ACLU scorecard-specific pattern — far more reliable than any %
        let score = null;
        const h2Els = Array.from(document.querySelectorAll("h2"));
        for (const h2 of h2Els) {
          const m = h2.textContent.match(/^(\d{1,3})%\s+of\s+/);
          if (m) { score = parseInt(m[1], 10); break; }
        }
        // Fallback: "XX% of NAME's" anywhere in text
        if (score === null) {
          const m = allText.match(/(\d{1,3})%\s+of\s+\w+['']s/);
          if (m) score = parseInt(m[1], 10);
        }

        return { name, state, score };
      }, STATE_ABBR);

      if (!data.name || data.score === null) {
        results[id] = null;
        empty++;
      } else {
        results[id] = { name: data.name, state: data.state, score: data.score };
        found++;
        process.stdout.write(`\r  Scraped ${found} legislators (ID ${id}/${MAX_ID})...`);
      }

    } catch (e) {
      console.error(`\n  Error at ID ${id}: ${e.message}`);
      results[id] = null;
    }

    if (id % 50 === 0) {
      fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(results, null, 2));
    }

    await sleep(DELAY_MS);

    if (
      SINGLE_NAME &&
      results[id]?.name?.toLowerCase().includes(SINGLE_NAME.toLowerCase())
    ) {
      console.log(`\n  Found "${SINGLE_NAME}" at legislator ID ${id}`);
      break;
    }
  }

  await browser.close();
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(results, null, 2));
  console.log(
    `\n  Scrape complete: ${found} with name+score, ${empty} empty/404, ${skipped} already cached`
  );
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏛  Throughline ACLU Pipeline`);
  console.log(`   DRY RUN: ${DRY_RUN}`);
  console.log(`   PRIORITY ONLY: ${PRIORITY_ONLY}`);
  console.log(`   SKIP SCRAPE: ${SKIP_SCRAPE}`);
  if (SINGLE_NAME) console.log(`   SINGLE: ${SINGLE_NAME}`);
  console.log("");

  if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH);

  // ── Load checkpoint ──────────────────────────────────────────────────────
  let aclData = {};
  if (fs.existsSync(CHECKPOINT_PATH)) {
    aclData = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf8"));
    const named   = Object.values(aclData).filter(v => v?.name && v?.score != null).length;
    const scored  = Object.values(aclData).filter(v => v?.score != null).length;
    console.log(`  Loaded checkpoint: ${named} complete (name+score), ${scored} total with scores`);
  } else {
    console.log("  No checkpoint found.");
  }

  // ── Scrape phase ─────────────────────────────────────────────────────────
  const shouldScrape = !SKIP_SCRAPE && !(DRY_RUN && SINGLE_NAME);

  if (shouldScrape) {
    const needsNames = Object.values(aclData).filter(v => v !== null && !v?.name).length;
    if (needsNames > 0) {
      console.log(`  ${needsNames} entries need names — re-scraping those IDs...\n`);
    }
    console.log(`  Starting Puppeteer scrape (IDs 1–${MAX_ID}, ${DELAY_MS}ms delay)...\n`);
    aclData = await scrapeACLU(aclData);
  } else if (DRY_RUN && SINGLE_NAME) {
    console.log("  (--dry-run --single: skipping scrape, using checkpoint only)\n");
  }

  // ── Build bioguide → score map using legislators-current.json ────────────
  const legislators = loadLegislators();
  const legIndex    = buildLegislatorIndex(legislators);

  const scrapeEntries = Object.values(aclData).filter(v => v?.name && v?.score != null);
  console.log(`\n📊 ${scrapeEntries.length} legislators with name+score in checkpoint`);

  // Resolve bioguide for each scraped entry
  const bioguideToScore = {};
  let resolved = 0, unresolved = 0;
  for (const entry of scrapeEntries) {
    if (!entry.state) { unresolved++; continue; }
    const bg = resolveBioguide(legIndex, entry.state, entry.name);
    if (bg) {
      bioguideToScore[bg] = entry.score;
      resolved++;
    } else {
      fs.appendFileSync(LOG_PATH, `UNMATCHED ACLU: ${entry.name} | ${entry.state}\n`);
      unresolved++;
    }
  }
  console.log(`   Resolved to bioguide: ${resolved}, unresolved: ${unresolved}\n`);

  // ── Fetch politicians from Supabase ──────────────────────────────────────
  const { data: politicians, error: polError } = await supabase
    .from("politicians")
    .select("id, name, bioguide_id, is_priority");
  if (polError) throw polError;

  const bioguideToId = {};
  for (const p of politicians) {
    if (p.bioguide_id) bioguideToId[p.bioguide_id] = { id: p.id, is_priority: p.is_priority };
  }

  if (PRIORITY_ONLY || SINGLE_NAME) {
    for (const bg of Object.keys(bioguideToScore)) {
      const pol = bioguideToId[bg];
      if (!pol) continue;
      if (PRIORITY_ONLY && !pol.is_priority) delete bioguideToScore[bg];
      if (SINGLE_NAME) {
        const match = politicians.find(p => p.bioguide_id === bg);
        if (!match || !match.name.toLowerCase().includes(SINGLE_NAME.toLowerCase())) {
          delete bioguideToScore[bg];
        }
      }
    }
  }

  console.log(`📋 Processing ${Object.keys(bioguideToScore).length} matched politicians...\n`);

  let written = 0, queued = 0, nulled = 0;

  for (const [bioguide, score] of Object.entries(bioguideToScore)) {
    const pol = bioguideToId[bioguide];
    if (!pol) {
      fs.appendFileSync(LOG_PATH, `NOT IN DB: bioguide ${bioguide}\n`);
      nulled++;
      continue;
    }

    const polName = politicians.find(p => p.bioguide_id === bioguide)?.name || bioguide;
    process.stdout.write(`  ${polName}... `);
    console.log(`${score}%`);

    if (DRY_RUN) {
      console.log(`  [DRY] would write → score_freedom: ${score}, score_criminal: ${score}`);
      continue;
    }

    const scores = { score_freedom: score, score_criminal: score };

    await supabase.from("politician_score_history").insert({
      politician_id: pol.id,
      source:        "ACLU Congressional Scorecard",
      scored_at:     new Date().toISOString(),
      ...scores,
    });

    if (pol.is_priority) {
      await supabase.from("score_review_queue").insert({
        politician_id: pol.id,
        source:        "ACLU Congressional Scorecard",
        status:        "pending",
        ...scores,
      });
      queued++;
    } else {
      await supabase.from("politicians").update(scores).eq("id", pol.id);
      written++;
    }
  }

  console.log(`\n✅ Done.`);
  console.log(`   Written directly: ${written}`);
  console.log(`   Queued for review: ${queued}`);
  console.log(`   No score found: ${nulled}`);
  if (fs.existsSync(LOG_PATH)) {
    const lines = fs.readFileSync(LOG_PATH, "utf8").split("\n").filter(Boolean);
    console.log(`   Unmatched log: ${LOG_PATH} (${lines.length} entries)`);
  }
}

main().catch(err => {
  console.error("Pipeline error:", err);
  process.exit(1);
});
