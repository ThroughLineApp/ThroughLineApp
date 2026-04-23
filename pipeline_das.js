// pipeline_das.js
// ── Throughline DAS Recalculation Pipeline ────────────────────────────────────
//
// NEVER commit this file to GitHub.
// Run: node pipeline_das.js
//
// What this does:
//   1. Loads all 538 politicians from Supabase
//   2. Loads all throughline_events grouped by politician_id
//   3. Calculates a raw score per politician:
//        - Count of events where donation_amount > 50,000
//        - Average donation_amount across all their events
//        - Raw score = (high_donation_event_count * 2) + (avg_donation / 10000)
//   4. Converts raw scores to percentile rank 0–100 across all 538
//        - Percentile = (number of politicians with a lower raw score / total) * 100
//   5. Updates donor_alignment_score on each politician with their new percentile
//   6. Logs each politician name + new score
//   7. Logs summary at end
//
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HIGH_DONATION_THRESHOLD = 50000;
const BATCH_SIZE = 50; // rows per update batch

async function run() {
  console.log('─────────────────────────────────────────────────');
  console.log('  THROUGHLINE DAS RECALCULATION PIPELINE');
  console.log('  Method: percentile rank across all 538');
  console.log('─────────────────────────────────────────────────\n');

  // ── Step 1: Load all politicians ───────────────────────────────────────────
  console.log('Loading politicians...');
  const { data: politicians, error: polErr } = await supabase
    .from('politicians')
    .select('id, name, donor_alignment_score');

  if (polErr) { console.error('Failed to load politicians:', polErr.message); process.exit(1); }
  console.log(`  Loaded ${politicians.length} politicians\n`);

  // ── Step 2: Load all throughline_events ────────────────────────────────────
  console.log('Loading throughline_events...');
  const { data: events, error: evtErr } = await supabase
    .from('throughline_events')
    .select('politician_id, donation_amount');

  if (evtErr) { console.error('Failed to load events:', evtErr.message); process.exit(1); }
  console.log(`  Loaded ${events.length} events\n`);

  // ── Step 3: Calculate raw score per politician ─────────────────────────────
  // Group events by politician_id
  const eventsByPolitician = {};
  for (const e of events) {
    if (!e.politician_id) continue;
    if (!eventsByPolitician[e.politician_id]) {
      eventsByPolitician[e.politician_id] = [];
    }
    eventsByPolitician[e.politician_id].push(e.donation_amount || 0);
  }

  // Build raw score map: politician id → raw score
  const rawScores = {};
  for (const pol of politicians) {
    const amounts = eventsByPolitician[pol.id] || [];

    const highDonationCount = amounts.filter(a => a > HIGH_DONATION_THRESHOLD).length;
    const avgDonation = amounts.length > 0
      ? amounts.reduce((sum, a) => sum + a, 0) / amounts.length
      : 0;

    // Raw score: weight high-donation events heavily, add avg donation influence
    rawScores[pol.id] = (highDonationCount * 2) + (avgDonation / 10000);
  }

  // ── Step 4: Convert raw scores to percentile rank 0–100 ───────────────────
  // Percentile = fraction of politicians with a strictly lower raw score × 100
  const allRawValues = politicians.map(p => rawScores[p.id]);

  const percentileScores = {};
  for (const pol of politicians) {
    const myScore = rawScores[pol.id];
    const countBelow = allRawValues.filter(v => v < myScore).length;
    const percentile = Math.round((countBelow / politicians.length) * 100);
    // No events = no data. null is more honest than 0.
    percentileScores[pol.id] = (eventsByPolitician[pol.id] || []).length === 0 ? null : percentile;
  }

  // ── Step 5: Update politicians in Supabase ─────────────────────────────────
  console.log('Updating donor_alignment_score for all politicians...\n');

  // Sort by name for readable logs
  const sorted = [...politicians].sort((a, b) => a.name.localeCompare(b.name));

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  // Process in batches to avoid hammering the DB
  for (let i = 0; i < sorted.length; i += BATCH_SIZE) {
    const batch = sorted.slice(i, i + BATCH_SIZE);

    for (const pol of batch) {
      const newScore = percentileScores[pol.id];
      const oldScore = pol.donor_alignment_score;

      // Log every politician
      const events_count = (eventsByPolitician[pol.id] || []).length;
      console.log(
        `  ${pol.name.padEnd(35)} ` +
        `old: ${String(oldScore ?? '—').padStart(3)}  ` +
        `new: ${String(newScore).padStart(3)}  ` +
        `events: ${events_count}`
      );

      // Skip if score hasn't changed
      if (oldScore === newScore) { unchanged++; continue; }

      const { error: upErr } = await supabase
        .from('politicians')
        .update({ donor_alignment_score: newScore })
        .eq('id', pol.id);

      if (upErr) {
        console.error(`    ✗ Update failed for ${pol.name}: ${upErr.message}`);
        failed++;
      } else {
        updated++;
      }
    }
  }

  // ── Step 6: Summary ────────────────────────────────────────────────────────
  const withEvents    = politicians.filter(p => (eventsByPolitician[p.id] || []).length > 0).length;
  const withHighDon   = politicians.filter(p => (eventsByPolitician[p.id] || []).some(a => a > HIGH_DONATION_THRESHOLD)).length;

  console.log('\n─────────────────────────────────────────────────');
  console.log('  DAS RECALCULATION COMPLETE');
  console.log(`  Politicians total:         ${politicians.length}`);
  console.log(`  With any events:           ${withEvents}`);
  console.log(`  With high-donation events: ${withHighDon}`);
  console.log(`  Scores updated:            ${updated}`);
  console.log(`  Scores unchanged:          ${unchanged}`);
  console.log(`  Update failures:           ${failed}`);
  console.log('─────────────────────────────────────────────────');
}

run().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
