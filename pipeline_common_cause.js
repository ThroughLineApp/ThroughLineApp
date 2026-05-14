// pipeline_common_cause.js
// Populates score_voting from Common Cause 2024 Democracy Scorecard PDF.
// Priority politicians → score_review_queue
// Non-priority politicians → politicians.score_voting (direct write)
// All politicians → politician_score_history
//
// Flags:
//   --dry-run        Log what would be written, write nothing
//   --priority-only  Only process priority politicians
//   --single "Name"  Process one politician by name

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
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
const PDF_PATH = path.join(DATA_DIR, "common_cause_2024.pdf");
const TXT_PATH = path.join(DATA_DIR, "common_cause_2024.txt");
const LOG_PATH = path.join(__dirname, "unmatched_common_cause.log");

// ── State name → abbreviation ─────────────────────────────────────────────────

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

const STATE_NAMES_RE = new RegExp(
  "\\b(" + Object.keys(STATE_ABBR).sort((a, b) => b.length - a.length).join("|") + ")\\b"
);

// ── PDF extraction ────────────────────────────────────────────────────────────

function extractPDF() {
  if (fs.existsSync(TXT_PATH)) {
    console.log("  Using cached common_cause_2024.txt");
    return fs.readFileSync(TXT_PATH, "utf8");
  }
  console.log("  Extracting PDF via pdfplumber...");
  const pyScript = path.join(__dirname, "_cc_extract.py");
  fs.writeFileSync(pyScript, [
    "import pdfplumber, sys",
    "sys.stdout.reconfigure(encoding='utf-8', errors='replace')",
    `with pdfplumber.open(r'${PDF_PATH.replace(/\\/g, "\\\\")}') as pdf:`,
    "    text = '\\n'.join(p.extract_text() or '' for p in pdf.pages)",
    `open(r'${TXT_PATH.replace(/\\/g, "\\\\")}', 'w', encoding='utf-8').write(text)`,
  ].join("\n"));
  execFileSync("python", [pyScript], { encoding: "utf8" });
  fs.unlinkSync(pyScript);
  return fs.readFileSync(TXT_PATH, "utf8");
}

// ── Parse scorecard rows ──────────────────────────────────────────────────────

function loadCommonCause() {
  const text = extractPDF();
  const rows = [];
  const lines = text.split("\n");

  for (const line of lines) {
    // Data rows end with a fraction like "11/13", "0/13", "13/13"
    const totalMatch = line.match(/(\d+)\/(\d+)\s*\r?$/);
    if (!totalMatch) continue;

    const numerator = parseInt(totalMatch[1], 10);
    const denominator = parseInt(totalMatch[2], 10);
    if (denominator === 0) continue;

    const score = Math.round((numerator / denominator) * 100);

    // Strip vote symbols, DNV, fraction
    const cleaned = line
      .replace(/[✔✖]/g, "")
      .replace(/DNV/g, "")
      .replace(/\d+\/\d+\s*\r?$/, "")
      .replace(/\s+/g, " ")
      .trim();

    // Match full state name
    const stateMatch = cleaned.match(STATE_NAMES_RE);
    if (!stateMatch) continue;

    const stateAbbr = STATE_ABBR[stateMatch[1]];
    const statePos = cleaned.indexOf(stateMatch[1]);

    // Name is everything before the state name
    const rawName = cleaned.slice(0, statePos).trim().replace(/,\s*$/, "");

    // Party is last token after state (R/D/I)
    const afterState = cleaned.slice(statePos + stateMatch[1].length).trim();
    const afterTokens = afterState.split(/\s+/);
    const party = afterTokens[afterTokens.length - 1];
    if (party !== "R" && party !== "D" && party !== "I") continue;

    if (!rawName) continue;

    // "Last, First Middle" → "First Middle Last"
    let fullName;
    const commaIdx = rawName.indexOf(",");
    if (commaIdx !== -1) {
      const last = rawName.slice(0, commaIdx).trim();
      const first = rawName.slice(commaIdx + 1).trim();
      fullName = `${first} ${last}`;
    } else {
      fullName = rawName;
    }

    rows.push({ fullName, state: stateAbbr, score_voting: score });
  }

  return rows;
}

// ── Name normalization ────────────────────────────────────────────────────────

function stripParentheticals(name) {
  return name.replace(/\(.*?\)/g, "").trim();
}

function normalizeName(name) {
  let n = name.replace(/^(Rep\.|Sen\.)\s*/i, "").trim();
  n = stripParentheticals(n);
  n = n.replace(/\s+(Jr\.|Sr\.|III|IV|II|V)\.?$/i, "").trim();
  return n;
}

// ── Load legislators-current.json ─────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🗳  Throughline Common Cause Pipeline`);
  console.log(`   DRY RUN: ${DRY_RUN}`);
  console.log(`   PRIORITY ONLY: ${PRIORITY_ONLY}`);
  if (SINGLE_NAME) console.log(`   SINGLE: ${SINGLE_NAME}`);
  console.log("");

  if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH);

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

  // Load Common Cause data
  const ccData = loadCommonCause();
  console.log(`  Parsed ${ccData.length} scorecard rows from PDF\n`);

  // Merge by bioguide
  const merged = {};

  for (const row of ccData) {
    if (!row.fullName || !row.state) continue;
    if (SINGLE_NAME && !row.fullName.toLowerCase().includes(SINGLE_NAME.toLowerCase())) continue;

    const bioguide = resolveBioguide(legIndex, row.state, row.fullName);
    if (!bioguide) {
      fs.appendFileSync(LOG_PATH, `UNMATCHED: ${row.fullName} | ${row.state}\n`);
      continue;
    }
    merged[bioguide] = { score_voting: row.score_voting };
  }

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

    // Always write to score history
    await supabase.from("politician_score_history").insert({
      politician_id: pol.id,
      source: "Common Cause 2024",
      scored_at: new Date().toISOString(),
      ...scores,
    });

    if (pol.is_priority) {
      await supabase.from("score_review_queue").insert({
        politician_id: pol.id,
        source: "Common Cause Democracy Scorecard 2024",
        status: "pending",
        ...scores,
      });
      queued++;
    } else {
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
