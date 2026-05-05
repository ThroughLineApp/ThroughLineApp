// recalculate_das.js
// ── Throughline DAS Recalculation Script ──────────────────────────────────────
//
// LOCAL ONLY — do not commit to GitHub.
// Run from project root: node recalculate_das.js
//
// What this does:
//   1. Loads all 538 current politicians from Supabase
//   2. For each: queries throughline_events for event count + corruption sum,
//      and pac_donors for avg donation amount
//   3. Recalculates donor_alignment_score using a log-scale formula that
//      prevents ceiling-capping and reserves 100 for "proven corrupt"
//   4. Writes the new DAS (or null if no events) back to politicians table
//   5. Logs old vs new for every politician
//
// Formula components:
//   corruptionScore — log10 scale, max 60 pts
//   fundingScore    — avg donation tiers, max 15 pts (unchanged)
//   volumeScore     — log10 of event count, max 25 pts
//   das             — sum, hard cap at 99
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('ERROR: Missing Supabase credentials in .env.local');
  console.error('  Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const dbRead  = createClient(SUPABASE_URL, ANON_KEY);
const dbWrite = createClient(SUPABASE_URL, SERVICE_KEY);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── DAS formula ───────────────────────────────────────────────────────────────

function calculateDAS(corruptionRaw, eventCount, avgDonation) {
  // Corruption component — log scale, max 60 points
  const corruptionScore = Math.min(60, Math.round(Math.log10(corruptionRaw + 1) * 20));

  // Funding transparency — unchanged tiers, max 15 points
  let fundingScore;
  if (avgDonation < 50)       fundingScore = 0;
  else if (avgDonation < 500) fundingScore = 7;
  else                        fundingScore = 15;

  // Volume component — more matched events = higher suspicion, max 25 points
  const volumeScore = Math.min(25, Math.round(Math.log10(eventCount + 1) * 10));

  const rawScore = corruptionScore + fundingScore + volumeScore;
  const das = Math.min(99, Math.round(rawScore)); // hard cap at 99 — 100 reserved for "proven corrupt"

  return { das, corruptionScore, fundingScore, volumeScore };
}

// ── Load all current politicians ──────────────────────────────────────────────

async function loadPoliticians() {
  console.log('Loading current politicians from Supabase...');
  const { data, error } = await dbRead
    .from('politicians')
    .select('id, name, donor_alignment_score')
    .eq('is_current', true)
    .order('name');

  if (error) throw new Error(`Failed to load politicians: ${error.message}`);
  console.log(`  Loaded ${data.length} politicians.\n`);
  return data;
}

// ── Get event stats for one politician ───────────────────────────────────────

async function getEventStats(politicianId) {
  const { data, error } = await dbRead
    .from('throughline_events')
    .select('corruption_contribution')
    .eq('politician_id', politicianId);

  if (error) {
    console.warn(`  Event query failed for ${politicianId}: ${error.message}`);
    return { eventCount: 0, corruptionRaw: 0 };
  }

  const rows = data || [];
  const eventCount   = rows.length;
  const corruptionRaw = rows.reduce((s, r) => s + (r.corruption_contribution ?? 0), 0);
  return { eventCount, corruptionRaw };
}

// ── Get avg pac_donor amount for one politician ───────────────────────────────

async function getAvgDonation(politicianId) {
  const { data, error } = await dbRead
    .from('pac_donors')
    .select('total_amount')
    .eq('politician_id', politicianId)
    .not('total_amount', 'is', null);

  if (error) {
    console.warn(`  pac_donors query failed for ${politicianId}: ${error.message}`);
    return 0;
  }

  const rows = data || [];
  if (rows.length === 0) return 0;
  const total = rows.reduce((s, r) => s + (r.total_amount ?? 0), 0);
  return total / rows.length;
}

// ── Write new DAS to politicians table ────────────────────────────────────────

async function writeDAS(politicianId, das) {
  const { error } = await dbWrite
    .from('politicians')
    .update({ donor_alignment_score: das })
    .eq('id', politicianId);

  if (error) {
    console.warn(`  DAS write failed for ${politicianId}: ${error.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  console.log('='.repeat(60));
  console.log('recalculate_das.js — Throughline DAS Recalculation');
  console.log('='.repeat(60));

  const politicians = await loadPoliticians();

  let nulled    = 0;
  let updated   = 0;
  let errors    = 0;
  let increased = 0;
  let decreased = 0;
  let unchanged = 0;

  console.log('Processing politicians...\n');

  for (let i = 0; i < politicians.length; i++) {
    const pol    = politicians[i];
    const oldDAS = pol.donor_alignment_score;

    const { eventCount, corruptionRaw } = await getEventStats(pol.id);
    const avgDonation = await getAvgDonation(pol.id);

    let newDAS;
    let label;

    if (eventCount === 0) {
      // No events — null out stale score
      newDAS = null;
      nulled++;
      label = 'NULL';

      process.stdout.write(
        `  [${String(i + 1).padStart(3)}/${politicians.length}] ${pol.name.padEnd(35)} ` +
        `old=${String(oldDAS ?? '--').padStart(3)}  new=--  events=   0  ${label}\n`
      );
    } else {
      const { das, corruptionScore, fundingScore, volumeScore } = calculateDAS(
        corruptionRaw,
        eventCount,
        avgDonation
      );
      newDAS = das;
      updated++;

      if (oldDAS == null)        { label = 'NEW';       }
      else if (das > oldDAS)     { label = '↑ UP';   increased++; }
      else if (das < oldDAS)     { label = '↓ DOWN'; decreased++; }
      else                       { label = '= SAME'; unchanged++; }

      process.stdout.write(
        `  [${String(i + 1).padStart(3)}/${politicians.length}] ${pol.name.padEnd(35)} ` +
        `old=${String(oldDAS ?? '--').padStart(3)}  new=${String(das).padStart(2)}  ` +
        `events=${String(eventCount).padStart(4)}  corr=${corruptionRaw.toFixed(1).padStart(8)}  ` +
        `(corruption=${corruptionScore} funding=${fundingScore} volume=${volumeScore})  ${label}\n`
      );
    }

    await writeDAS(pol.id, newDAS);

    await sleep(100);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const mins    = Math.floor(elapsed / 60);
  const secs    = elapsed % 60;

  console.log('\n' + '='.repeat(60));
  console.log('DONE');
  console.log(`  Time:              ${mins}m ${secs}s`);
  console.log(`  Politicians:       ${politicians.length}`);
  console.log(`  Updated with DAS:  ${updated}`);
  console.log(`    ↑ Increased:     ${increased}`);
  console.log(`    ↓ Decreased:     ${decreased}`);
  console.log(`    = Unchanged:     ${unchanged}`);
  console.log(`  Nulled (no data):  ${nulled}`);
  console.log(`  Errors:            ${errors}`);
  console.log('='.repeat(60));
}

main().catch(e => {
  console.error('\nFATAL:', e.message);
  process.exit(1);
});
