// ── feedUtils.js ──────────────────────────────────────────────────────────────
// Helper functions for the Throughline feed system.
// Imported by pages/feed.jsx and pages/api/feed.js

/**
 * Format a dollar amount for display.
 * $1,234 → "$1.2K" | $1,234,567 → "$1.2M"
 */
export function formatAmount(n) {
  if (!n && n !== 0) return "$—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}K`;
  return `$${abs.toLocaleString()}`;
}

/**
 * Format a dollar amount with more precision for cards.
 * 142000 → "$142,000"
 */
export function formatAmountFull(n) {
  if (!n && n !== 0) return "$—";
  return `$${Math.abs(n).toLocaleString()}`;
}

/**
 * Extract top 3 dimension names from quiz results object.
 * quizResults shape: { economic: 12, healthcare: -4, climate: 8, ... }
 * Returns the 3 dimensions with the highest absolute scores.
 */
export function getTopIssues(quizResults) {
  if (!quizResults || typeof quizResults !== "object") return [];
  return Object.entries(quizResults)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 3)
    .map(([dim]) => dim);
}

/**
 * Static zip-to-state lookup (two-digit prefix heuristic).
 * Full lookup table for all US state prefixes.
 * Returns state abbreviation or null if unknown.
 */
export function zipToState(zip) {
  if (!zip || zip.length < 3) return null;
  const prefix = parseInt(zip.slice(0, 3), 10);

  const ranges = [
    [[0, 0], null],
    [[1, 99], "MA"],
    [[100, 149], "NY"],
    [[150, 196], "PA"],
    [[197, 199], "DE"],
    [[200, 205], "DC"],
    [[206, 212], "MD"],
    [[214, 219], "MD"],
    [[220, 246], "VA"],
    [[247, 268], "WV"],
    [[270, 289], "NC"],
    [[290, 299], "SC"],
    [[300, 319], "GA"],
    [[320, 339], "FL"],
    [[340, 340], "AA"], // Military
    [[350, 369], "AL"],
    [[370, 385], "TN"],
    [[386, 397], "MS"],
    [[398, 399], "GA"],
    [[400, 418], "KY"],
    [[420, 427], "KY"],
    [[430, 458], "OH"],
    [[460, 479], "IN"],
    [[480, 499], "MI"],
    [[500, 528], "IA"],
    [[530, 549], "WI"],
    [[550, 567], "MN"],
    [[570, 577], "SD"],
    [[580, 588], "ND"],
    [[590, 599], "MT"],
    [[600, 629], "IL"],
    [[630, 658], "MO"],
    [[660, 679], "KS"],
    [[680, 693], "NE"],
    [[700, 714], "LA"],
    [[716, 729], "AR"],
    [[730, 749], "OK"],
    [[750, 799], "TX"],
    [[800, 816], "CO"],
    [[820, 831], "WY"],
    [[832, 838], "ID"],
    [[840, 847], "UT"],
    [[850, 865], "AZ"],
    [[870, 884], "NM"],
    [[889, 898], "NV"],
    [[900, 961], "CA"],
    [[970, 979], "OR"],
    [[980, 994], "WA"],
    [[995, 999], "AK"],
    [[967, 968], "HI"],
  ];

  for (const [[lo, hi], state] of ranges) {
    if (prefix >= lo && prefix <= hi) return state;
  }
  return null;
}

/**
 * Dimension display labels.
 */
export const DIMENSION_LABELS = {
  economic: "Economy",
  healthcare: "Healthcare",
  climate: "Climate",
  criminal: "Criminal Justice",
  immigration: "Immigration",
  foreign: "Foreign Policy",
  education: "Education",
  freedom: "Civil Liberties",
  guns: "Gun Policy",
  housing: "Housing",
  tech: "Tech & Privacy",
  voting: "Voting Rights",
};

/**
 * Dimension color map.
 */
export const DIMENSION_COLORS = {
  economic: "#C9A84C",
  healthcare: "#E05C4B",
  climate: "#4CAF7D",
  criminal: "#5B9CF6",
  immigration: "#9B8FF5",
  foreign: "#7C4CC9",
  education: "#C98E4C",
  freedom: "#2DD4BF",
  guns: "#E05C4B",
  housing: "#78C94C",
  tech: "#4C8EC9",
  voting: "#C94C9E",
};

/**
 * Map a party abbreviation to a display color.
 */
export function partyColor(party) {
  if (!party) return "#9A9488";
  const p = party.toUpperCase();
  if (p === "D" || p === "DEM" || p === "DEMOCRAT") return "#5B9CF6";
  if (p === "R" || p === "REP" || p === "REPUBLICAN") return "#E05C4B";
  return "#9B8FF5";
}

/**
 * DAS score → color
 */
export function dasColor(score) {
  if (score === null || score === undefined) return "#9A9488";
  if (score <= 33) return "#4CAF7D";
  if (score <= 66) return "#C9A84C";
  return "#E05C4B";
}
