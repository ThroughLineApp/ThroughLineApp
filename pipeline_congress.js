// pipeline_congress.js
// ── Throughline Congress Pipeline ─────────────────────────────────────────────
//
// NEVER commit this file to GitHub.
// Run: node pipeline_congress.js
//      node pipeline_congress.js --single "Bernie Sanders"
//
// What this does:
//   1. Loads Phase 1 base 50 politicians from Supabase by name
//   2. Skips any politician where bioguide_id is null or 'NONE'
//   3. For each valid politician: resolves GovTrack person ID, fetches up to
//      200 votes (2 pages of 100), upserts into bill_votes, and updates
//      bill_name_enriched on matching throughline_events
//   4. 500ms delay between each politician
//
// Data sources:
//   GovTrack  — member votes (free, no key)
//   Congress.gov API v3 — enrichment (CONGRESS_API_KEY in .env.local)
//
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const path  = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const { createClient } = require('@supabase/supabase-js');

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DELAY_MS     = 500;   // ms between politicians — do not remove

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Phase 1 — Base 50 politicians ─────────────────────────────────────────────
// Match these names exactly against the politicians table.
// Politicians with bioguide_id = null or 'NONE' are skipped gracefully.
const PHASE_1_NAMES = [
  'Donald Trump',
  'Barack Obama',
  'Joe Biden',
  'Bill Clinton',
  'George W. Bush',
  'Hillary Clinton',
  'Kamala Harris',
  'Bernie Sanders',
  'Elizabeth Warren',
  'Nancy Pelosi',
  'Mitch McConnell',
  'Alexandria Ocasio-Cortez',
  'Ted Cruz',
  'Marco Rubio',
  'Rand Paul',
  'Mike Pence',
  'Lindsey Graham',
  'Chuck Schumer',
  'Jim Jordan',
  'Matt Gaetz',
  'Marjorie Taylor Greene',
  'Lauren Boebert',
  'Paul Ryan',
  'John Boehner',
  'Newt Gingrich',
  'Dick Cheney',
  'Al Gore',
  'Hakeem Jeffries',
  'Kevin McCarthy',
  'Mike Johnson',
  'Adam Schiff',
  'Jamie Raskin',
  'Ilhan Omar',
  'Rashida Tlaib',
  'Josh Hawley',
  'J.D. Vance',
  'Ron DeSantis',
  'Gavin Newsom',
  'Nikki Haley',
  'Tulsi Gabbard',
  'Steve Bannon',
  'Liz Cheney',
  'Adam Kinzinger',
  'Mitt Romney',
  'Thomas Massie',
  'Tim Scott',
  'Cory Booker',
  'Pramila Jayapal',
  'Eric Swalwell',
  'Steve Scalise',
];

// ── HTTP helper ───────────────────────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Throughline/1.0' } }, (res) => {
      let raw = '';
      res.on('data', chunk => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, data: null });
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── GovTrack: resolve bioguide → numeric person ID ────────────────────────────
// GovTrack does not support filtering by bioguideid directly.
// Search by last name (q=), find the result whose bioguideid matches,
// then extract the numeric ID from the link field:
//   link = "https://www.govtrack.us/congress/members/bernard_sanders/400357"
async function resolveGovtrackId(bioguideId, fullName) {
  const lastName = fullName.trim().split(/\s+/).pop();
  const url = `https://www.govtrack.us/api/v2/person?q=${encodeURIComponent(lastName)}&format=json&limit=20`;
  const res = await httpsGet(url);
  if (res.status !== 200 || !res.data?.objects?.length) return null;
  const match = res.data.objects.find(p => p.bioguideid === bioguideId);
  if (!match?.link) return null;
  const id = parseInt(match.link.split('/').pop(), 10);
  return isNaN(id) ? null : id;
}

// ── GovTrack: fetch one page of votes ─────────────────────────────────────────
// GET https://www.govtrack.us/api/v2/vote_voter?person={govtrackId}&limit=100&offset={n}
// Each object: { vote: { question, result, id }, option: { value }, created }
async function fetchVotePage(govtrackId, offset) {
  const url = `https://www.govtrack.us/api/v2/vote_voter?person=${govtrackId}&limit=100&offset=${offset}&format=json`;
  const res = await httpsGet(url);
  if (res.status !== 200 || !res.data?.objects) return [];
  return res.data.objects;
}

// ── Upsert votes into bill_votes ──────────────────────────────────────────────
async function upsertVotes(politicianId, bioguideId, voteObjects) {
  if (!voteObjects.length) return;

  const allMapped = voteObjects.map(obj => {
    const voteId = obj.vote ? `${obj.vote.congress}-${obj.vote.chamber}-${obj.vote.number}` : null;
    return {
      politician_id:    politicianId,
      bioguide_id:      bioguideId,
      govtrack_vote_id: voteId,
      bill_title:       obj.vote?.question || null,
      vote_position:    obj.option?.value,
      voted_at:         obj.vote?.created || null,
      source_url:       'https://www.govtrack.us/congress/votes',
    };
  });

  console.log(`    rows before filter: ${allMapped.length}`);
  const rows = allMapped.filter(r => r.govtrack_vote_id !== null);
  console.log(`    rows after filter:  ${rows.length}`);
  console.log(`    first row:`, JSON.stringify(rows[0] || allMapped[0], null, 2));

  if (!rows.length) {
    console.error('    bill_votes: 0 rows after filter — govtrack_vote_id may be undefined');
    console.error('    sample raw object:', JSON.stringify(voteObjects[0], null, 2));
    return;
  }

  console.log(`    upserting ${rows.length} rows to bill_votes...`);
  const { data: upsertData, error } = await supabase
    .from('bill_votes')
    .upsert(rows, { onConflict: 'govtrack_vote_id,bioguide_id', ignoreDuplicates: true });

  if (error) {
    console.error('    bill_votes upsert FAILED — full error:', JSON.stringify(error, null, 2));
  } else {
    console.log(`    upsert succeeded — data:`, JSON.stringify(upsertData));
  }
}

// ── Update throughline_events with enriched bill name ─────────────────────────
// For each vote, find matching throughline_events rows by:
//   politician_id + vote_date + (bill_name ILIKE '%Cloture%' OR '%PN%')
// and set bill_name_enriched = vote.question
async function enrichEvents(politicianId, voteObjects) {
  let totalUpdated = 0;

  for (const obj of voteObjects) {
    const question = obj.vote.question;
    const voteDate = obj.vote.created ? obj.vote.created.split('T')[0] : null;
    if (!question || !voteDate) continue;

    // Match events on the same date with procedural bill names
    const { data: matches, error } = await supabase
      .from('throughline_events')
      .select('id')
      .eq('politician_id', politicianId)
      .eq('vote_date', voteDate)
      .is('bill_name_enriched', null)
      .or('bill_name.ilike.%Cloture%,bill_name.ilike.%PN%');

    if (error || !matches?.length) continue;

    const ids = matches.map(m => m.id);
    const { error: upErr } = await supabase
      .from('throughline_events')
      .update({ bill_name_enriched: question })
      .in('id', ids);

    if (!upErr) totalUpdated += ids.length;
  }

  return totalUpdated;
}

// ── Process one politician ────────────────────────────────────────────────────
async function processPolitician(name) {
  const { data: politician, error: dbErr } = await supabase
    .from('politicians')
    .select('id, name, bioguide_id')
    .ilike('name', `%${name}%`)
    .limit(1)
    .maybeSingle();

  if (dbErr || !politician) {
    console.log(`  [${name}] Not found in DB — skipping`);
    return { skipped: true };
  }

  // Skip if no valid bioguide ID
  if (!politician.bioguide_id || politician.bioguide_id === 'NONE') {
    console.log(`  [${politician.name}] bioguide_id = ${politician.bioguide_id || 'null'} — skipping`);
    return { skipped: true };
  }

  // Step 1: resolve GovTrack person ID
  const govtrackId = await resolveGovtrackId(politician.bioguide_id, politician.name);
  if (!govtrackId) {
    console.log(`  [${politician.name}] GovTrack ID not found for bioguide ${politician.bioguide_id} — skipping`);
    return { skipped: true };
  }

  // Step 2: fetch up to 200 votes (2 pages of 100)
  const page1 = await fetchVotePage(govtrackId, 0);
  const page2 = await fetchVotePage(govtrackId, 100);
  const allVotes = [...page1, ...page2];

  if (!allVotes.length) {
    console.log(`  [${politician.name}] 0 votes fetched — skipping`);
    return { skipped: false, votesFetched: 0, eventsUpdated: 0 };
  }

  // Step 3: upsert into bill_votes
  await upsertVotes(politician.id, politician.bioguide_id, allVotes);

  // Step 4: update throughline_events with enriched bill names
  const eventsUpdated = await enrichEvents(politician.id, allVotes);

  console.log(`  [${politician.name}] ${allVotes.length} votes fetched, ${eventsUpdated} events updated`);
  return { skipped: false, votesFetched: allVotes.length, eventsUpdated };
}

// ── Main run ───────────────────────────────────────────────────────────────────
async function run(targetName) {
  console.log('─────────────────────────────────────────────────');
  console.log('  THROUGHLINE CONGRESS PIPELINE');
  if (targetName) {
    console.log(`  Mode:  --single "${targetName}"`);
  } else {
    console.log(`  Mode:  full run — ${PHASE_1_NAMES.length} Phase 1 politicians`);
  }
  console.log(`  Delay: ${DELAY_MS}ms between politicians`);
  console.log('─────────────────────────────────────────────────\n');

  const namesToProcess = targetName ? [targetName] : PHASE_1_NAMES;

  let totalPoliticians = 0;
  let totalVotes       = 0;
  let totalUpdated     = 0;
  let totalSkipped     = 0;

  for (const name of namesToProcess) {
    try {
      const result = await processPolitician(name);
      if (result.skipped) {
        totalSkipped++;
      } else {
        totalPoliticians++;
        totalVotes   += result.votesFetched || 0;
        totalUpdated += result.eventsUpdated || 0;
      }
    } catch (err) {
      console.warn(`  [${name}] Unexpected error: ${err.message}`);
      totalSkipped++;
    }

    await sleep(DELAY_MS);
  }

  console.log('\n─────────────────────────────────────────────────');
  console.log('  PIPELINE COMPLETE');
  console.log(`  Politicians processed: ${totalPoliticians}`);
  console.log(`  Total votes fetched:   ${totalVotes}`);
  console.log(`  Total events updated:  ${totalUpdated}`);
  console.log(`  Skipped:               ${totalSkipped}`);
  console.log('─────────────────────────────────────────────────');
}

// ── Entry point ───────────────────────────────────────────────────────────────
const singleIdx = process.argv.indexOf('--single');
const targetName = singleIdx !== -1 ? process.argv[singleIdx + 1] : null;

if (singleIdx !== -1 && !targetName) {
  console.error('Usage: node pipeline_congress.js --single "Bernie Sanders"');
  process.exit(1);
}

run(targetName).catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
