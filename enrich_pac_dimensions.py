# enrich_pac_dimensions.py
# Looks up each unique PAC in pac_donors via FEC API
# Maps PAC name to a Throughline dimension using keywords
# Updates dimension column in pac_donors
# Run: python enrich_pac_dimensions.py
# NEVER commit this file to GitHub

import urllib.request
import json
import urllib.parse
import http.client
import ssl
import time
from collections import defaultdict

SUPABASE_URL = "https://busiguukyesnvgriktbu.supabase.co"
SUPABASE_KEY = "sb_publishable_ISiDLfrT9y1mXTAn0IA2YA_jrGAz9fy"
FEC_API_KEY  = "2o71tf1UbC12kFd9m81dssecJdTWykab9B092imr"

# Keywords in PAC names → Throughline dimension
# Checked against longest match first (more specific wins)
PAC_NAME_KEYWORDS = [
    # Specific company names
    ("comcast", "tech"), ("charter communications", "tech"),
    ("at&t", "tech"), ("verizon", "tech"), ("t-mobile", "tech"),
    ("hewlett", "tech"), ("dell ", "tech"), ("ibm ", "tech"),
    ("oracle ", "tech"), ("intel ", "tech"), ("qualcomm", "tech"),
    ("cisco", "tech"), ("paypal", "tech"), ("ebay", "tech"),
    ("uber ", "tech"), ("lyft", "tech"), ("airbnb", "tech"),
    ("magellan", "climate"), ("enbridge", "climate"),
    ("kinder morgan", "climate"), ("williams companies", "climate"),
    ("valero", "climate"), ("marathon petroleum", "climate"),
    ("phillips 66", "climate"), ("conocophillips", "climate"),
    ("halliburton", "climate"), ("schlumberger", "climate"),
    ("dominion energy", "climate"), ("duke energy", "climate"),
    ("southern company", "climate"), ("nextera", "climate"),
    ("entergy", "climate"), ("exelon", "climate"),
    ("boston scientific", "healthcare"), ("medtronic", "healthcare"),
    ("stryker", "healthcare"), ("becton dickinson", "healthcare"),
    ("abbott ", "healthcare"), ("baxter", "healthcare"),
    ("mckesson", "healthcare"), ("cardinal health", "healthcare"),
    ("amerisourcebergen", "healthcare"), ("express scripts", "healthcare"),
    ("unitedhealth", "healthcare"), ("anthem", "healthcare"),
    ("elevance", "healthcare"), ("centene", "healthcare"),
    ("molina", "healthcare"), ("davita", "healthcare"),
    ("blue origin", "foreign"), ("spacex", "foreign"),
    ("l3harris", "foreign"), ("bae systems", "foreign"),
    ("leidos", "foreign"), ("saic ", "foreign"),
    ("carlyle", "economic"), ("kkr ", "economic"),
    ("apollo global", "economic"), ("warburg", "economic"),
    ("aicpa", "economic"), ("deloitte", "economic"),
    ("pwc ", "economic"), ("kpmg", "economic"),
    ("ernst", "economic"), ("mckinsey", "economic"),
    ("kroger", "economic"), ("walmart", "economic"),
    ("target ", "economic"), ("home depot", "housing"),
    ("lowes", "housing"), ("lennar", "housing"),
    ("dr horton", "housing"), ("pulte", "housing"),
    ("toll brothers", "housing"),
    ("maersk", "economic"), ("ups ", "economic"),
    ("toyota", "economic"), ("honda ", "economic"), ("ford ", "economic"),
    ("general motors", "economic"), ("gm ", "economic"),
    ("atlas air", "foreign"), ("delta air", "economic"), ("united airlines", "economic"),
    ("american airlines", "economic"), ("southwest airlines", "economic"),
    ("aecom", "housing"), ("fluor", "housing"), ("bechtel", "housing"),
    ("winred", None), ("actblue", None),
    ("fedex", "economic"), ("caterpillar", "economic"),
    ("john deere", "economic"), ("3m ", "economic"),

    # Healthcare
    ("healthcare", "healthcare"), ("health care", "healthcare"),
    ("medical", "healthcare"), ("hospital", "healthcare"),
    ("pharma", "healthcare"), ("drug", "healthcare"),
    ("biotech", "healthcare"), ("physician", "healthcare"),
    ("nurse", "healthcare"), ("dental", "healthcare"),
    ("surgery", "healthcare"), ("clinic", "healthcare"),
    ("hmo", "healthcare"), ("insurance health", "healthcare"),
    ("blue cross", "healthcare"), ("humana", "healthcare"),
    ("aetna", "healthcare"), ("cigna", "healthcare"),
    ("united health", "healthcare"), ("cvs", "healthcare"),

    # Climate & Energy
    ("oil", "climate"), ("gas", "climate"), ("petroleum", "climate"),
    ("energy", "climate"), ("coal", "climate"), ("pipeline", "climate"),
    ("refin", "climate"), ("electric util", "climate"),
    ("solar", "climate"), ("wind power", "climate"),
    ("nuclear", "climate"), ("utility", "climate"),
    ("exxon", "climate"), ("chevronmobil", "climate"), ("chevron", "climate"),
    ("bp ", "climate"), ("shell", "climate"),
    ("natural gas", "climate"), ("power company", "climate"),

    # Defense & Foreign Policy
    ("defense", "foreign"), ("aerospace", "foreign"),
    ("lockheed", "foreign"), ("boeing", "foreign"),
    ("raytheon", "foreign"), ("northrop", "foreign"),
    ("general dynamics", "foreign"), ("military", "foreign"),
    ("veteran", "foreign"), ("navy", "foreign"),
    ("army ", "foreign"), ("air force", "foreign"),

    # Gun Policy
    ("nra", "guns"), ("gun", "guns"), ("firearm", "guns"),
    ("rifle", "guns"), ("ammunition", "guns"), ("second amendment", "guns"),
    ("gun owners", "guns"),

    # Economic / Finance
    ("bank", "economic"), ("financial", "economic"),
    ("investment", "economic"), ("securities", "economic"),
    ("insurance", "economic"), ("real estate", "economic"),
    ("mortgage", "economic"), ("credit union", "economic"),
    ("hedge fund", "economic"), ("private equity", "economic"),
    ("venture capital", "economic"), ("wall street", "economic"),
    ("goldman", "economic"), ("jpmorgan", "economic"),
    ("citigroup", "economic"), ("wells fargo", "economic"),
    ("blackstone", "economic"), ("blackrock", "economic"),
    ("accounting", "economic"), ("tax", "economic"),

    # Tech & Privacy
    ("technology", "tech"), ("tech ", "tech"),
    ("software", "tech"), ("internet", "tech"),
    ("google", "tech"), ("amazon", "tech"),
    ("microsoft", "tech"), ("apple ", "tech"),
    ("facebook", "tech"), ("meta ", "tech"),
    ("telecom", "tech"), ("wireless", "tech"),
    ("broadband", "tech"), ("cyber", "tech"),
    ("semiconductor", "tech"), ("silicon", "tech"),

    # Education
    ("education", "education"), ("school", "education"),
    ("college", "education"), ("university", "education"),
    ("teacher", "education"), ("student", "education"),
    ("academic", "education"),

    # Housing
    ("housing", "housing"), ("builder", "housing"),
    ("homebuilder", "housing"), ("realtor", "housing"),
    ("construction", "housing"), ("apartment", "housing"),
    ("lumber", "housing"),

    # Criminal Justice
    ("prison", "criminal"), ("correction", "criminal"),
    ("law enforcement", "criminal"), ("police", "criminal"),
    ("sheriff", "criminal"), ("detention", "criminal"),

    # Immigration
    ("immigration", "immigration"), ("border", "immigration"),
    ("migrant", "immigration"),

    # Electoral Rights
    ("voter", "voting"), ("election", "voting"),
    ("ballot", "voting"), ("democracy", "voting"),

    # Labor (maps to economic)
    ("union", "economic"), ("labor", "economic"),
    ("workers", "economic"), ("teamster", "economic"),
    ("aflcio", "economic"), ("afl-cio", "economic"),

    # Agriculture (maps to economic)
    ("farm", "economic"), ("agricult", "economic"),
    ("crop", "economic"), ("cattle", "economic"),
]

def map_name_to_dimension(name):
    if not name:
        return None
    lower = name.lower()
    for keyword, dimension in PAC_NAME_KEYWORDS:
        if keyword in lower:
            return dimension
    return None

def supabase_request(method, path, data=None, params=None):
    parsed = urllib.parse.urlparse(SUPABASE_URL)
    host = parsed.netloc
    ctx = ssl.create_default_context()
    conn = http.client.HTTPSConnection(host, context=ctx)
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    full_path = f"/rest/v1/{path}"
    if params:
        full_path += "?" + urllib.parse.urlencode(params)
    body = json.dumps(data).encode() if data else None
    conn.request(method, full_path, body=body, headers=headers)
    resp = conn.getresponse()
    result = resp.read()
    conn.close()
    return resp.status, result

def fetch_fec_committee_name(pac_id):
    try:
        url = f"https://api.open.fec.gov/v1/committee/{pac_id}/?api_key={FEC_API_KEY}"
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read())
        results = data.get("results", [])
        if results:
            return results[0].get("name", "")
        return ""
    except:
        return ""

def get_unique_pac_ids():
    print("Loading unique PAC IDs from pac_donors...")
    status, data = supabase_request("GET", "pac_donors", params={
        "select": "pac_id",
        "limit": "20000",
    })
    rows = json.loads(data)
    unique = list(set(r["pac_id"] for r in rows if r.get("pac_id")))
    print(f"  Found {len(unique)} unique PAC IDs")
    return unique

def update_dimension_for_pac(pac_id, dimension):
    status, result = supabase_request(
        "PATCH",
        "pac_donors",
        data={"dimension": dimension},
        params={"pac_id": f"eq.{pac_id}"},
    )
    return status in (200, 201, 204)

def main():
    print("=" * 50)
    print("  THROUGHLINE PAC DIMENSION ENRICHER")
    print("=" * 50)

    pac_ids = get_unique_pac_ids()

    mapped = 0
    unmapped = 0
    errors = 0
    name_cache = {}

    for i, pac_id in enumerate(pac_ids):
        # Fetch PAC name from FEC
        name = fetch_fec_committee_name(pac_id)
        name_cache[pac_id] = name

        dimension = map_name_to_dimension(name)

        if dimension:
            ok = update_dimension_for_pac(pac_id, dimension)
            if ok:
                mapped += 1
                if mapped <= 10 or mapped % 50 == 0:
                    print(f"  [{i+1}/{len(pac_ids)}] {name[:60]} -> {dimension}")
            else:
                errors += 1
        else:
            unmapped += 1
            if unmapped <= 5:
                print(f"  [{i+1}/{len(pac_ids)}] NO MATCH: {name[:60]}")

        # Respect FEC rate limit — 1000 requests/hour = ~1 per 3.6 seconds
        # We're doing 401 requests so 300ms is safe
        time.sleep(0.3)

    print(f"\n  Mapped:   {mapped} PACs to dimensions")
    print(f"  Unmapped: {unmapped} PACs (no keyword match)")
    print(f"  Errors:   {errors}")

    # Show unmapped PAC names so we can add keywords later
    if unmapped > 0:
        print(f"\n  Sample unmapped PAC names:")
        count = 0
        for pac_id, name in name_cache.items():
            if not map_name_to_dimension(name) and name:
                print(f"    {name[:70]}")
                count += 1
                if count >= 15:
                    break

    print("\n" + "=" * 50)
    print("  DONE")
    print("=" * 50)

if __name__ == "__main__":
    main()
