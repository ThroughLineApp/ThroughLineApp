// pages/sitemap.xml.js
// Dynamic sitemap — pulls all politician slugs from Supabase so Google
// indexes every profile page automatically as the database grows.
//
// Next.js serves this as /sitemap.xml via getServerSideProps.
// Vercel will cache it per-request. No manual updates needed.

import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://throughline.app";

// Static pages that always exist
const STATIC_PAGES = [
  { path: "",        priority: "1.0", changefreq: "daily"   },
  { path: "/quiz",   priority: "0.9", changefreq: "monthly" },
];

function buildSitemap(staticPages, politicians) {
  const staticEntries = staticPages.map(
    ({ path, priority, changefreq }) => `
  <url>
    <loc>${SITE_URL}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  );

  const politicianEntries = politicians.map(
    ({ slug }) => `
  <url>
    <loc>${SITE_URL}/politician/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...politicianEntries].join("")}
</urlset>`;
}

export default function Sitemap() {
  // This component never renders — getServerSideProps sends the XML directly
  return null;
}

export async function getServerSideProps({ res }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Fetch all slugs — only the slug column, nothing else needed
  const { data: politicians, error } = await supabase
    .from("politicians")
    .select("slug")
    .eq("is_current", true)
    .not("slug", "is", null);

  if (error) {
    console.error("Sitemap: Supabase error", error);
  }

  const sitemap = buildSitemap(STATIC_PAGES, politicians ?? []);

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate"); // cache 24h
  res.write(sitemap);
  res.end();

  return { props: {} };
}
