// pipeline_ideology_p1.js
// Populates ideology scores from LCV, AFL-CIO, NEA, and NRA data files.
// Priority politicians → score_review_queue
// Non-priority politicians → politicians.score_* (direct write)
// All politicians → politician_score_history
//
// Flags:
//   --dry-run        Log what would be written, write nothing
//   --priority-only  Only process priority politicians
//   --single "Name"  Process one politician by name

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes("--dry-run");
const PRIORITY_ONLY = process.argv.includes("--priority-only");
const SINGLE_IDX = process.argv.indexOf("--single");
const SINGLE_NAME = SINGLE_IDX !== -1 ? process.argv[SINGLE_IDX + 1] : null;

const DATA_DIR = path.join(__dirname, "data");
const LOG_PATH = path.join(__dirname, "unmatched_ideology.log");

// ── Score conversion tables ───────────────────────────────────────────────────

const NEA_LETTER_TO_NUM = {
  "A": 95, "B": 75, "C": 55, "D": 35, "F": 10,
};

const NRA_LETTER_TO_NUM = {
  "A+": 100, "A": 95, "A-": 90, "AQ": 85,
  "B+": 80, "B": 75, "B-": 70,
  "C+": 65, "C": 60, "C-": 55,
  "D+": 50, "D": 45, "D-": 40,
  "F": 10,
};

function convertNEA(grade) {
  if (!grade) return null;
  return NEA_LETTER_TO_NUM[grade.trim().toUpperCase()] ?? null;
}

function convertNRA(grade) {
  if (!grade || grade.trim() === "?") return null;
  const num = NRA_LETTER_TO_NUM[grade.trim().toUpperCase()] ?? null;
  return num !== null ? 100 - num : null; // invert: high NRA = low gun safety
}

function convertPct(pct) {
  if (!pct) return null;
  const n = parseFloat(pct.replace("%", "").trim());
  return isNaN(n) ? null : n;
}

// ── Name normalization ────────────────────────────────────────────────────────

function stripParentheticals(name) {
  return name.replace(/\(.*?\)/g, "").trim();
}

function normalizeName(name) {
  // Remove prefixes
  let n = name.replace(/^(Rep\.|Sen\.)\s*/i, "").trim();
  n = stripParentheticals(n);
  // Remove suffixes
  n = n.replace(/\s+(Jr\.|Sr\.|III|IV|II|V)\.?$/i, "").trim();
  return n;
}

function extractLastName(fullName) {
  const parts = normalizeName(fullName).split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

function extractFirstName(fullName) {
  const parts = normalizeName(fullName).split(/\s+/);
  return parts[0].toLowerCase();
}

// ── Load legislators-current.json ─────────────────────────────────────────────

function loadLegislators() {
  const filePath = path.join(__dirname, "public", "legislators-current.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildLegislatorIndex(legislators) {
  // index: "state:lastname" → [{ bioguide, firstName }]
  const index = {};
  for (const l of legislators) {
    const t = l.terms[l.terms.length - 1];
    const state = t.state.toUpperCase();
    const lastName = l.name.last.toLowerCase();
    const key = `${state}:${lastName}`;
    if (!index[key]) index[key] = [];
    index[key].push({
      bioguide: l.id.bioguide,
      firstName: l.name.first.toLowerCase(),
    });
  }
  return index;
}

function resolveBioguide(index, state, fullName) {
  const normalized = normalizeName(fullName);
  const parts = normalized.split(/\s+/);
  const lastName = parts[parts.length - 1].toLowerCase();
  const firstName = parts[0].toLowerCase();
  const stateUp = state.toUpperCase();

  // Try exact last name match first
  const key = `${stateUp}:${lastName}`;
  let matches = index[key];

  // If no match, try second-to-last word as last name (handles "Taylor Greene" → "Greene")
  if (!matches || matches.length === 0) {
    if (parts.length >= 3) {
      const altLast = parts[parts.length - 2].toLowerCase();
      const altKey = `${stateUp}:${altLast}`;
      matches = index[altKey];
    }
  }

  if (!matches || matches.length === 0) return null;
  if (matches.length === 1) return matches[0].bioguide;

  // Tiebreak on first name prefix
  const firstMatch = matches.find(m => m.firstName.startsWith(firstName.slice(0, 3)));
  return firstMatch ? firstMatch.bioguide : matches[0].bioguide;
}

// ── CSV parser (simple, handles quoted fields) ────────────────────────────────

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split("\n").filter(l => l.trim());
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map(v => v.replace(/"/g, "").trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
    rows.push(row);
  }
  return rows;
}

// ── Data loaders ──────────────────────────────────────────────────────────────

function loadLCV() {
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

  const raw = fs.readFileSync(path.join(DATA_DIR, "lcv_scores.csv"), "latin1");
  const lines = raw.split("\n").filter(l => l.trim());
  const results = [];
  let currentState = null;

  for (const line of lines) {
    if (line.startsWith('"First Name"') || line === "Senate" || line === "House") continue;
    const parts = line.split(",");
    if (parts.length < 4) {
      const candidate = line.replace(/"/g, "").trim();
      if (STATE_ABBR[candidate]) currentState = STATE_ABBR[candidate];
      continue;
    }
    const [firstName, lastName, party, district, yearScore] = parts;
    const score = convertPct(yearScore === "na" ? null : yearScore);
    if (!firstName || !lastName || !currentState) continue;
    results.push({
      fullName: `${firstName.replace(/"/g, "").trim()} ${lastName.replace(/"/g, "").trim()}`,
      state: currentState,
      score_climate: score,
    });
  }
  return results;
}

function loadAFLCIO() {
  const house = parseCSV(path.join(DATA_DIR, "aflcio_house.csv"));
  const senate = parseCSV(path.join(DATA_DIR, "aflcio_senate.csv"));
  const results = [];

  for (const row of [...house, ...senate]) {
    const name = row["Name"] || "";
    const state = row["State"] || "";
    const score = convertPct(row["Score"]);
    if (!name || !state) continue;
    results.push({
      fullName: name,
      state,
      score_economic: score,
    });
  }
  return results;
}

function loadNEA() {
  const txtPath = path.join(DATA_DIR, "nea_grades.txt");
  if (!fs.existsSync(txtPath)) {
    console.warn("⚠️  data/nea_grades.txt not found — run PDF extraction first.");
    return [];
  }
  const raw = fs.readFileSync(txtPath, "utf8");
  const lines = raw.split("\n").filter(l => l.trim());
  const results = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) continue;
    const state = parts[0];
    if (!/^[A-Z]{2}$/.test(state)) continue;
    const grade = parts[parts.length - 1];
    if (!/^[ABCDF]$/.test(grade)) continue;

    const hasDistrict = /^[A-Z]{2}\d+$/.test(parts[1]);
    const nameParts = hasDistrict ? parts.slice(2, -1) : parts.slice(1, -1);
    if (nameParts.length === 0) continue;

    // Try full name, then progressively shorter suffixes
    // Store all name variants so resolveBioguide can try last word
    const fullName = nameParts.join(" ");

    results.push({
      fullName,
      state,
      score_education: convertNEA(grade),
    });
  }
  return results;
}

function loadNRA() {
  const rows = parseCSV(path.join(DATA_DIR, "nra_grades.csv"));
  const results = [];
  const seen = new Set();

  // Filter federal only, most recent year per name+state, incumbents preferred
  const federal = rows.filter(r =>
    r["body_type"] === "US Senate" || r["body_type"] === "US House"
  );

  // Sort by year desc so most recent comes first
  federal.sort((a, b) => parseInt(b["year"]) - parseInt(a["year"]));

  for (const row of federal) {
    const name = row["full_name"]?.trim();
    const state = row["state"]?.trim();
    const grade = row["grade"]?.trim();
    if (!name || !state) continue;
    const key = `${state}:${name.toLowerCase()}`;
    if (seen.has(key)) continue; // already have most recent
    seen.add(key);
    results.push({
      fullName: name,
      state,
      score_guns: convertNRA(grade),
    });
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🗳  Throughline Ideology Pipeline — Pass 1`);
  console.log(`   DRY RUN: ${DRY_RUN}`);
  console.log(`   PRIORITY ONLY: ${PRIORITY_ONLY}`);
  if (SINGLE_NAME) console.log(`   SINGLE: ${SINGLE_NAME}`);
  console.log("");

  const legislators = loadLegislators();
  const legIndex = buildLegislatorIndex(legislators);

  // Fetch all politicians from Supabase
  const { data: politicians, error: polError } = await supabase
    .from("politicians")
    .select("id, name, bioguide_id, is_priority");
  if (polError) throw polError;

  const bioguideToId = {};
  for (const p of politicians) {
    if (p.bioguide_id) bioguideToId[p.bioguide_id] = { id: p.id, is_priority: p.is_priority };
  }

  // Load all data sources
  const lcvData = loadLCV();
  const aflcioData = loadAFLCIO();
  const neaData = loadNEA();
  const nraData = loadNRA();

  // Merge all sources by bioguide_id
  const merged = {}; // bioguide_id → { score_climate, score_economic, score_education, score_guns }

  function processRows(rows, dimension) {
    for (const row of rows) {
      if (!row.fullName || !row.state) continue;
      if (SINGLE_NAME && !row.fullName.toLowerCase().includes(SINGLE_NAME.toLowerCase())) continue;

      const bioguide = resolveBioguide(legIndex, row.state, row.fullName);
      if (!bioguide) {
        if (dimension !== "score_guns") {
          fs.appendFileSync(LOG_PATH, `UNMATCHED [${dimension}]: ${row.fullName} | ${row.state}\n`);
        }
        continue;
      }
      if (!merged[bioguide]) merged[bioguide] = {};
      if (row[dimension] !== undefined && row[dimension] !== null) {
        merged[bioguide][dimension] = row[dimension];
      }
    }
  }

  processRows(lcvData, "score_climate");
  processRows(aflcioData, "score_economic");
  processRows(neaData, "score_education");
  processRows(nraData, "score_guns");

  console.log(`📊 Resolved scores for ${Object.keys(merged).length} politicians\n`);

  let written = 0, queued = 0, skipped = 0;

  for (const [bioguide, scores] of Object.entries(merged)) {
    const pol = bioguideToId[bioguide];
    if (!pol) {
      fs.appendFileSync(LOG_PATH, `NOT IN DB: bioguide ${bioguide}\n`);
      skipped++;
      continue;
    }

    if (PRIORITY_ONLY && !pol.is_priority) continue;
    if (Object.keys(scores).length === 0) { skipped++; continue; }

    if (DRY_RUN) {
      console.log(`[DRY] ${bioguide} → ${JSON.stringify(scores)}`);
      continue;
    }

    // Always write to score_history
    await supabase.from("politician_score_history").insert({
      politician_id: pol.id,
      source: "pipeline_ideology_p1",
      ...scores,
    });

    if (pol.is_priority) {
      // Write to review queue
      await supabase.from("score_review_queue").insert({
        politician_id: pol.id,
        source: "pipeline_ideology_p1",
        ...scores,
      });
      queued++;
    } else {
      // Write directly to politicians table
      await supabase.from("politicians").update(scores).eq("id", pol.id);
      written++;
    }
  }

  console.log(`✅ Done.`);
  console.log(`   Written directly: ${written}`);
  console.log(`   Queued for review: ${queued}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Unmatched log: ${LOG_PATH}`);
}

main().catch(err => {
  console.error("Pipeline error:", err);
  process.exit(1);
});
