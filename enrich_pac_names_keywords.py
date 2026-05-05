# enrich_pac_names_keywords.py
# Enriches pac_donors.dimension for rows where dimension IS NULL and pac_name IS NOT NULL
# Uses keyword matching against pac_name (already stored in DB — no FEC API calls needed)
# Updates dimension using the Supabase service role key
# Run: python enrich_pac_names_keywords.py
# NEVER commit this file or any .env file to GitHub

import urllib.request
import json
import urllib.parse
import http.client
import ssl
from collections import defaultdict

SUPABASE_URL = "https://busiguukyesnvgriktbu.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1c2lndXVreWVzbnZncmlrdGJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIwNTQ1MiwiZXhwIjoyMDg4NzgxNDUyfQ.vl-t12YAo8Lzx8aI2y1F3Ppie1nfxhFXJHl_uSeawpU"

# Ordered keyword map — first match wins
# Specific company/org names first, then generic keywords
KEYWORD_MAP = [
    # ── Specific well-known names (more specific → first) ──────────────────────
    ("exxon",               "climate"),
    ("chevron",             "climate"),
    ("halliburton",         "climate"),
    ("schlumberger",        "climate"),
    ("conocophillips",      "climate"),
    ("phillips 66",         "climate"),
    ("valero",              "climate"),
    ("marathon petroleum",  "climate"),
    ("kinder morgan",       "climate"),
    ("enbridge",            "climate"),
    ("williams companies",  "climate"),
    ("dominion energy",     "climate"),
    ("duke energy",         "climate"),
    ("nextera",             "climate"),
    ("entergy",             "climate"),
    ("exelon",              "climate"),
    ("southern company",    "climate"),
    ("lockheed",            "foreign"),
    ("raytheon",            "foreign"),
    ("boeing",              "foreign"),
    ("northrop",            "foreign"),
    ("general dynamics",    "foreign"),
    ("l3harris",            "foreign"),
    ("leidos",              "foreign"),
    ("bae systems",         "foreign"),
    ("unitedhealth",        "healthcare"),
    ("elevance",            "healthcare"),
    ("humana",              "healthcare"),
    ("cigna",               "healthcare"),
    ("aetna",               "healthcare"),
    ("blue cross",          "healthcare"),
    ("anthem",              "healthcare"),
    ("centene",             "healthcare"),
    ("molina",              "healthcare"),
    ("davita",              "healthcare"),
    ("cvs",                 "healthcare"),
    ("mckesson",            "healthcare"),
    ("cardinal health",     "healthcare"),
    ("medtronic",           "healthcare"),
    ("boston scientific",   "healthcare"),
    ("stryker",             "healthcare"),
    ("goldman",             "economic"),
    ("jpmorgan",            "economic"),
    ("citigroup",           "economic"),
    ("wells fargo",         "economic"),
    ("blackstone",          "economic"),
    ("blackrock",           "economic"),
    ("deloitte",            "economic"),
    ("comcast",             "tech"),
    ("charter communications", "tech"),
    ("at&t",                "tech"),
    ("verizon",             "tech"),
    ("t-mobile",            "tech"),
    ("google",              "tech"),
    ("amazon",              "tech"),
    ("microsoft",           "tech"),
    ("facebook",            "tech"),
    ("meta ",               "tech"),
    ("home depot",          "housing"),
    ("lennar",              "housing"),
    ("dr horton",           "housing"),
    ("pulte",               "housing"),
    ("toll brothers",       "housing"),
    ("nra",                 "guns"),
    ("second amendment",    "guns"),
    ("gun owners",          "guns"),
    ("afl-cio",             "economic"),
    ("teamster",            "economic"),
    ("chamber of commerce", "economic"),
    # ── Additional specific orgs from unmatched audit ──────────────────────────
    ("altria",              "economic"),
    ("am general",          "foreign"),
    ("amentum",             "foreign"),
    ("general atomics",     "foreign"),
    ("iap worldwide",       "foreign"),
    ("environment america", "climate"),
    ("hess corp",           "climate"),
    ("hess pac",            "climate"),
    ("petrochemical",       "climate"),
    ("petrochem",           "climate"),
    ("novartis",            "healthcare"),
    ("ophthalmol",          "healthcare"),
    ("oncol",               "healthcare"),
    ("hanger inc",          "healthcare"),
    ("prosthetic",          "healthcare"),
    ("orthotics",           "healthcare"),
    ("ericsson",            "tech"),
    ("bentley systems",     "tech"),
    ("fraternity",          "education"),
    ("sorority",            "education"),
    ("milk producers",      "economic"),
    ("sorghum",             "economic"),
    ("grain",               "economic"),
    ("dairy",               "economic"),
    ("poultry",             "economic"),
    ("crowe pac",           "economic"),
    ("fidelity corp",       "economic"),
    ("postal",              "economic"),
    ("garney",              "housing"),
    ("hdr, inc",            "housing"),
    ("justice pac",         "criminal"),
    ("association for justice", "criminal"),
    ("squire patton",       "criminal"),
    ("butler snow",         "criminal"),
    ("sunrun",              "climate"),
    ("tenaska",             "climate"),
    ("transcanada",         "climate"),
    ("public service enterprise", "climate"),
    ("vanguard group",      "economic"),
    ("usaa",                "economic"),
    ("berkley corp",        "economic"),
    ("surety",              "economic"),
    ("qc holdings",         "economic"),
    ("united airlines",     "economic"),
    ("yelp",                "tech"),
    # ── Generic keywords ───────────────────────────────────────────────────────
    # economic
    ("bank",                "economic"),
    ("financial",           "economic"),
    ("capital",             "economic"),
    ("invest",              "economic"),
    ("fund",                "economic"),
    ("asset",               "economic"),
    ("equity",              "economic"),
    ("insurance",           "economic"),
    ("mortgage",            "economic"),
    ("loan",                "economic"),
    ("credit",              "economic"),
    ("wall street",         "economic"),
    ("securities",          "economic"),
    ("trading",             "economic"),
    ("labor",               "economic"),
    ("union",               "economic"),
    ("workers",             "economic"),
    ("farm",                "economic"),
    ("agricult",            "economic"),
    ("cattle",              "economic"),
    # healthcare
    ("health",              "healthcare"),
    ("medical",             "healthcare"),
    ("hospital",            "healthcare"),
    ("pharma",              "healthcare"),
    ("drug",                "healthcare"),
    ("biotech",             "healthcare"),
    ("clinic",              "healthcare"),
    ("dental",              "healthcare"),
    ("vision",              "healthcare"),
    ("patient",             "healthcare"),
    ("physician",           "healthcare"),
    ("nurse",               "healthcare"),
    ("surgery",             "healthcare"),
    ("hmo",                 "healthcare"),
    # climate
    ("energy",              "climate"),
    ("oil",                 "climate"),
    ("gas",                 "climate"),
    ("coal",                "climate"),
    ("electric",            "climate"),
    ("utility",             "climate"),
    ("solar",               "climate"),
    ("wind",                "climate"),
    ("pipeline",            "climate"),
    ("petroleum",           "climate"),
    ("mining",              "climate"),
    ("power",               "climate"),
    ("nuclear",             "climate"),
    ("refin",               "climate"),
    # criminal
    ("law enforcement",     "criminal"),
    ("police",              "criminal"),
    ("prison",              "criminal"),
    ("correction",          "criminal"),
    ("sheriff",             "criminal"),
    ("security",            "criminal"),
    ("defense contractor",  "criminal"),
    # immigration
    ("border",              "immigration"),
    ("immigration",         "immigration"),
    ("homeland",            "immigration"),
    # foreign
    ("defense",             "foreign"),
    ("aerospace",           "foreign"),
    ("military",            "foreign"),
    ("veteran",             "foreign"),
    ("navy",                "foreign"),
    ("army",                "foreign"),
    ("air force",           "foreign"),
    # education
    ("education",           "education"),
    ("school",              "education"),
    ("university",          "education"),
    ("college",             "education"),
    ("teacher",             "education"),
    ("student",             "education"),
    # freedom
    ("liberty",             "freedom"),
    ("freedom",             "freedom"),
    ("civil",               "freedom"),
    ("aclu",                "freedom"),
    ("rights",              "freedom"),
    # guns
    ("gun",                 "guns"),
    ("rifle",               "guns"),
    ("firearm",             "guns"),
    ("ammunition",          "guns"),
    ("weapon",              "guns"),
    # housing
    ("real estate",         "housing"),
    ("housing",             "housing"),
    ("construction",        "housing"),
    ("builder",             "housing"),
    ("developer",           "housing"),
    ("realty",              "housing"),
    # tech
    ("technology",          "tech"),
    ("tech",                "tech"),
    ("software",            "tech"),
    ("internet",            "tech"),
    ("telecom",             "tech"),
    ("broadband",           "tech"),
    ("wireless",            "tech"),
    ("cyber",               "tech"),
    ("semiconductor",       "tech"),
    # voting — narrow terms only; never "political"/"pac"/"campaign"
    # because every PAC name contains "POLITICAL ACTION COMMITTEE"
    ("voter registration",  "voting"),
    ("voting rights",       "voting"),
    ("election integrity",  "voting"),
    ("electoral",           "voting"),
    ("ballot initiative",   "voting"),
    ("democracy",           "voting"),
]

def map_name_to_dimension(name):
    if not name:
        return None
    lower = name.lower()
    for keyword, dimension in KEYWORD_MAP:
        if keyword in lower:
            return dimension
    return None

def supabase_request(method, path, data=None, params=None, return_json=False):
    parsed = urllib.parse.urlparse(SUPABASE_URL)
    host = parsed.netloc
    ctx = ssl.create_default_context()
    conn = http.client.HTTPSConnection(host, context=ctx)
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    if return_json:
        headers["Prefer"] = "return=representation"
    full_path = f"/rest/v1/{path}"
    if params:
        full_path += "?" + urllib.parse.urlencode(params)
    body = json.dumps(data).encode() if data else None
    conn.request(method, full_path, body=body, headers=headers)
    resp = conn.getresponse()
    result = resp.read()
    conn.close()
    if return_json:
        return resp.status, json.loads(result) if result else []
    return resp.status, result

def fetch_rows_to_enrich():
    """Fetch pac_donors rows where dimension IS NULL or dimension='voting' (false positives from prior run),
    and pac_name IS NOT NULL. Paginated."""
    all_rows = []
    for dim_filter in ["is.null", "eq.voting"]:
        offset = 0
        page_size = 1000
        label = "NULL" if dim_filter == "is.null" else "'voting' (resetting false positives)"
        print(f"  Fetching rows with dimension={label}...")
        while True:
            status, rows = supabase_request(
                "GET", "pac_donors",
                params={
                    "select":    "id,pac_name",
                    "dimension": dim_filter,
                    "pac_name":  "not.is.null",
                    "limit":     str(page_size),
                    "offset":    str(offset),
                },
                return_json=True,
            )
            if status not in (200, 206) or not rows:
                break
            all_rows.extend(rows)
            if len(rows) < page_size:
                break
            offset += page_size
    print(f"  Total rows to process: {len(all_rows)}")
    return all_rows

def update_row(row_id, dimension):
    status, _ = supabase_request(
        "PATCH", "pac_donors",
        data={"dimension": dimension},
        params={"id": f"eq.{row_id}"},
    )
    return status in (200, 201, 204)

def main():
    print("=" * 55)
    print("  THROUGHLINE PAC KEYWORD DIMENSION ENRICHER")
    print("=" * 55)

    rows = fetch_rows_to_enrich()
    print()

    if not rows:
        print("  Nothing to do — no null-dimension rows with pac_name found.")
        return

    per_dimension = defaultdict(int)
    updated = 0
    skipped = 0
    errors = 0

    for i, row in enumerate(rows):
        row_id  = row["id"]
        pac_name = row.get("pac_name") or ""
        dimension = map_name_to_dimension(pac_name)

        if not dimension:
            # If this row was previously mis-tagged as 'voting', reset it to NULL
            # so it doesn't pollute the pipeline
            update_row(row_id, None)
            skipped += 1
            continue

        ok = update_row(row_id, dimension)
        if ok:
            updated += 1
            per_dimension[dimension] += 1
            if updated <= 5 or updated % 500 == 0:
                print(f"  [{i+1}/{len(rows)}] {pac_name[:60]} -> {dimension}")
        else:
            errors += 1
            print(f"  ERROR updating id={row_id} pac_name={pac_name[:40]}")

    print("\n" + "=" * 55)
    print("  RESULTS")
    print("=" * 55)
    print(f"  Total rows processed : {len(rows)}")
    print(f"  Updated              : {updated}")
    print(f"  Skipped (no match)   : {skipped}")
    print(f"  Errors               : {errors}")
    print(f"\n  Per dimension:")
    for dim in sorted(per_dimension):
        print(f"    {dim:<15} {per_dimension[dim]:>6}")

    # Print sample unmatched names to help refine keywords
    unmatched_names = []
    for row in rows:
        if not map_name_to_dimension(row.get("pac_name") or ""):
            unmatched_names.append((row.get("pac_name") or "").strip())
    unique_unmatched = sorted(set(unmatched_names))
    print(f"\n  Sample unmatched names (first 30):")
    for n in unique_unmatched[:30]:
        print(f"    {n[:80]}")

    print("\n" + "=" * 55)
    print("  DONE")
    print("=" * 55)

if __name__ == "__main__":
    main()
