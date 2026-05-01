const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const LEADERSHIP_NAMES = [
  'Mike Johnson', 'Hakeem Jeffries', 'John Thune', 'Chuck Schumer',
  'Steve Scalise', 'Katherine Clark', 'John Barrasso', 'Dick Durbin',
  'Tom Emmer', 'Pete Aguilar', 'John Cornyn', 'Patty Murray',
  'Elise Stefanik', 'James Clyburn', 'Mitch McConnell', 'Nancy Pelosi',
  'Kevin McCarthy', 'Steny Hoyer'
];

async function run() {
  const { data: politicians, error } = await supabase
    .from('politicians')
    .select('id, name, chamber, donor_alignment_score');

  if (error) { console.error(error); return; }

  const maxDAS = Math.max(...politicians.map(p => p.donor_alignment_score || 0));

  for (const p of politicians) {
    const chamberScore = p.chamber === 'Senate' ? 2 : 1;
    const leadershipBonus = LEADERSHIP_NAMES.includes(p.name) ? 2 : 0;
    const dasNormalized = maxDAS > 0 ? (p.donor_alignment_score || 0) / maxDAS : 0;
    const prominence_score = chamberScore + leadershipBonus + dasNormalized;

    await supabase
      .from('politicians')
      .update({ prominence_score })
      .eq('id', p.id);

    console.log(`${p.name}: ${prominence_score.toFixed(2)}`);
  }
  console.log('Done.');
}

run();
