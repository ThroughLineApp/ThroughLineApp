# import_pac_data_house.py
# Downloads FEC bulk PAC-to-candidate data for House members and loads into Supabase.
# Mirrors import_pac_data.py exactly but filters to House politicians only.
# Writes INSERT-only to pac_donors — does NOT touch existing Senate rows.
# Run: python import_pac_data_house.py
# NEVER commit this file to GitHub

import urllib.request
import zipfile
import io
import csv
import json
import urllib.parse
import http.client
import ssl
import os
from collections import defaultdict

def load_env(path=".env.local"):
    """Minimal .env.local parser — reads KEY=VALUE lines, ignores comments."""
    env = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, _, val = line.partition("=")
                    env[key.strip()] = val.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return env

_env = load_env()

SUPABASE_URL  = _env.get("NEXT_PUBLIC_SUPABASE_URL",  "https://busiguukyesnvgriktbu.supabase.co")
SUPABASE_ANON = _env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
SUPABASE_SVC  = _env.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_SVC:
    print("WARNING: SUPABASE_SERVICE_ROLE_KEY not found in .env.local — inserts will fail RLS")
    SUPABASE_SVC = SUPABASE_ANON  # fallback (will likely still fail RLS)

# FEC itpas2.txt column indices (pipe-delimited, 22 cols)
# [0]  CMTE_ID        — PAC/committee making the contribution
# [1]  AMNDT_IND
# [2]  RPT_TP
# [3]  TRANSACTION_PGI — election cycle, e.g. "P2024"
# [4]  IMAGE_NUM
# [5]  TRANSACTION_TP  — type: 24K, 24C, 24E, 24Z, etc.
# [6]  ENTITY_TP
# [7]  NAME            — recipient campaign name
# [8]  CITY
# [9]  STATE
# [10] ZIP_CODE
# [11] EMPLOYER
# [12] OCCUPATION
# [13] TRANSACTION_DT  — date MMDDYYYY
# [14] TRANSACTION_AMT — amount
# [15] OTHER_ID
# [16] CAND_ID         — FEC candidate ID, e.g. "H8TX07100"
# [17] TRAN_ID
# [18] FILE_NUM
# [19] MEMO_CD
# [20] MEMO_TEXT
# [21] SUB_ID

CATCODE5_TO_DIMENSION = {
    "E1100": "climate", "E1110": "climate", "E1120": "climate",
    "E1140": "climate", "E1150": "climate", "E1160": "climate",
    "E1200": "climate", "E1210": "climate",
    "E1500": "climate", "E1510": "climate", "E1520": "climate",
    "E1600": "climate", "E1610": "climate", "E1620": "climate",
    "H4300": "healthcare", "H4400": "healthcare", "H4500": "healthcare",
    "H2100": "healthcare", "H3700": "healthcare",
    "D2000": "foreign", "D3000": "foreign", "D5000": "foreign",
    "J6100": "guns", "J6200": "guns",
    "F2500": "economic", "F2600": "economic", "F2700": "economic",
    "F1100": "economic", "F2000": "economic",
    "G7000": "criminal",
    "H5100": "education", "H5300": "education",
    "C6000": "tech", "C6200": "tech", "C5120": "tech",
    "C4100": "tech", "C4300": "tech",
    "B2000": "housing", "F4600": "housing", "F4100": "housing",
}

CATCODE3_TO_DIMENSION = {
    "F07": "economic", "F03": "economic", "F04": "economic",
    "F05": "economic", "F06": "economic", "F09": "economic",
    "F10": "economic", "F11": "economic", "F13": "economic",
    "H01": "healthcare", "H02": "healthcare", "H03": "healthcare",
    "H04": "healthcare",
    "E01": "climate", "E04": "climate", "E08": "climate",
    "E09": "climate", "E10": "climate", "E12": "climate",
    "E07": "climate",
    "D01": "foreign", "D02": "foreign", "D03": "foreign",
    "W04": "education", "W08": "education",
    "Q12": "guns", "Q13": "guns",
    "C02": "housing",
    "B12": "tech", "B13": "tech", "B09": "tech", "B08": "tech",
    "Q16": "voting", "Z02": "voting",
    "P01": "economic", "P02": "economic", "P03": "economic",
    "P04": "economic", "P05": "economic",
}

STATE_MAP = {
    "alabama":"AL","alaska":"AK","arizona":"AZ","arkansas":"AR",
    "california":"CA","colorado":"CO","connecticut":"CT","delaware":"DE",
    "florida":"FL","georgia":"GA","hawaii":"HI","idaho":"ID",
    "illinois":"IL","indiana":"IN","iowa":"IA","kansas":"KS",
    "kentucky":"KY","louisiana":"LA","maine":"ME","maryland":"MD",
    "massachusetts":"MA","michigan":"MI","minnesota":"MN","mississippi":"MS",
    "missouri":"MO","montana":"MT","nebraska":"NE","nevada":"NV",
    "new hampshire":"NH","new jersey":"NJ","new mexico":"NM","new york":"NY",
    "north carolina":"NC","north dakota":"ND","ohio":"OH","oklahoma":"OK",
    "oregon":"OR","pennsylvania":"PA","rhode island":"RI","south carolina":"SC",
    "south dakota":"SD","tennessee":"TN","texas":"TX","utah":"UT",
    "vermont":"VT","virginia":"VA","washington":"WA","west virginia":"WV",
    "wisconsin":"WI","wyoming":"WY"
}

NAME_SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "jr.", "sr.", "esq"}

def strip_suffix(name):
    parts = name.strip().split()
    while parts and parts[-1].lower().rstrip(".") in NAME_SUFFIXES:
        parts.pop()
    return " ".join(parts)

def map_catcode_to_dimension(catcode):
    if not catcode:
        return None
    catcode = catcode.strip()
    if catcode in CATCODE5_TO_DIMENSION:
        return CATCODE5_TO_DIMENSION[catcode]
    prefix = catcode[:3]
    if prefix in CATCODE3_TO_DIMENSION:
        return CATCODE3_TO_DIMENSION[prefix]
    return None

def parse_date(mmddyyyy):
    """Convert MMDDYYYY → YYYY-MM-DD, return '' on failure."""
    s = mmddyyyy.strip()
    if len(s) == 8:
        return f"{s[4:8]}-{s[0:2]}-{s[2:4]}"
    return ""

def download_zip(url):
    print(f"  Downloading {url}...")
    with urllib.request.urlopen(url) as response:
        return response.read()

def supabase_request(method, path, data=None, key=None):
    """key defaults to SUPABASE_ANON for reads, pass SUPABASE_SVC for writes."""
    if key is None:
        key = SUPABASE_ANON
    parsed = urllib.parse.urlparse(SUPABASE_URL)
    host = parsed.netloc
    ctx = ssl.create_default_context()
    conn = http.client.HTTPSConnection(host, context=ctx)
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    body = json.dumps(data).encode() if data else None
    conn.request(method, f"/rest/v1/{path}", body=body, headers=headers)
    resp = conn.getresponse()
    result = resp.read()
    conn.close()
    return resp.status, result

def load_house_politicians():
    """Load only House members from Supabase."""
    print("Loading House politicians from Supabase...")
    status, data = supabase_request(
        "GET",
        "politicians?select=id,name,bioguide_id,state,chamber,slug&is_current=eq.true&chamber=eq.House&limit=600",
        key=SUPABASE_ANON
    )
    politicians = json.loads(data)
    print(f"  Loaded {len(politicians)} House politicians")
    return politicians

def load_fec_candidate_ids():
    """
    Download FEC candidate master for multiple cycles (2020, 2022, 2024).
    Only indexes House candidates (office = H, FEC ID prefix = H).
    Returns candidates_by_key (last_state_H → cand_id) and fec_ids dict.
    """
    candidates_by_key = {}
    fec_ids = {}

    cycles = [
        ("2024", "https://cg-519a459a-0ea3-42c2-b7bc-fa1143481f74.s3-us-gov-west-1.amazonaws.com/bulk-downloads/2024/cn24.zip"),
        ("2022", "https://cg-519a459a-0ea3-42c2-b7bc-fa1143481f74.s3-us-gov-west-1.amazonaws.com/bulk-downloads/2022/cn22.zip"),
        ("2020", "https://cg-519a459a-0ea3-42c2-b7bc-fa1143481f74.s3-us-gov-west-1.amazonaws.com/bulk-downloads/2020/cn20.zip"),
    ]

    for cycle_label, url in cycles:
        print(f"Downloading FEC candidate master ({cycle_label})...")
        try:
            zip_bytes = download_zip(url)
        except Exception as e:
            print(f"  Skipping {cycle_label}: {e}")
            continue

        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            filename = z.namelist()[0]
            with z.open(filename) as f:
                reader = csv.reader(io.TextIOWrapper(f, encoding="latin-1"), delimiter="|")
                count = 0
                for row in reader:
                    if len(row) < 6:
                        continue
                    cand_id = row[0].strip()
                    name    = row[1].strip()
                    office  = row[5].strip()
                    state   = row[4].strip()

                    # House only — FEC office "H", candidate ID prefix "H"
                    if office != "H":
                        continue
                    if not cand_id.startswith("H"):
                        continue

                    if cand_id not in fec_ids:
                        fec_ids[cand_id] = {"name": name, "state": state, "office": office}
                    last_raw = name.split(",")[0].strip().lower()
                    key = f"{last_raw}_{state}_H"
                    if key not in candidates_by_key:
                        candidates_by_key[key] = cand_id
                        count += 1
        print(f"  Added {count} new House entries from {cycle_label}")

    print(f"  Total FEC House candidates indexed: {len(fec_ids)}")
    return candidates_by_key, fec_ids

def match_politicians_to_fec(politicians, fec_by_key, fec_by_id):
    matched = {}
    unmatched = []

    for pol in politicians:
        # This script is House-only — skip any non-House entries defensively
        if pol["chamber"] != "House":
            continue

        raw_state = pol["state"]
        if len(raw_state) > 2:
            state = STATE_MAP.get(raw_state.lower(), raw_state[:2].upper())
        else:
            state = raw_state.upper()

        # Build a list of last name candidates to try
        name_parts = pol["name"].split()
        last_candidates = []

        # Strip trailing suffixes
        suffixes = {"jr.", "sr.", "ii", "iii", "iv", "jr", "sr"}
        clean_parts = [p for p in name_parts if p.lower().rstrip(".") not in suffixes]

        # Try full last word
        last_candidates.append(clean_parts[-1].lower())

        # Try compound: last two words joined (e.g. "Ocasio-Cortez")
        if len(clean_parts) >= 2:
            last_candidates.append(f"{clean_parts[-2]} {clean_parts[-1]}".lower())

        # Try hyphenated variants
        for candidate in list(last_candidates):
            if "-" in candidate:
                last_candidates.append(candidate.replace("-", " "))
                last_candidates.append(candidate.replace("-", ""))

        fec_cand_id = None
        for last in last_candidates:
            key = f"{last}_{state}_H"
            fec_cand_id = fec_by_key.get(key)
            if fec_cand_id:
                break

        if fec_cand_id:
            # Guard: only accept H-prefixed FEC IDs for House members
            if not fec_cand_id.startswith("H"):
                unmatched.append(f"{pol['name']} (FEC ID {fec_cand_id} is not H-prefix, skipping)")
                continue
            existing = matched.get(fec_cand_id)
            if not existing:
                matched[fec_cand_id] = pol
        else:
            unmatched.append(f"{pol['name']} (tried: {last_candidates[0]}, state: {state})")

    print(f"  Matched {len(matched)} of {len(politicians)} House politicians to FEC IDs")
    if unmatched[:10]:
        print(f"  Sample unmatched:")
        for u in unmatched[:10]:
            print(f"    {u}")
    return matched

def load_pac_contributions(matched_politicians):
    """
    Download 2024 PAC-to-candidate bulk file and extract contributions
    to our matched House politicians only.
    """
    print("Downloading PAC contributions (pas224.zip) — 24MB, takes ~30 seconds...")
    zip_bytes = download_zip(
        "https://cg-519a459a-0ea3-42c2-b7bc-fa1143481f74.s3-us-gov-west-1.amazonaws.com/bulk-downloads/2024/pas224.zip"
    )
    contributions = []
    skipped_type = 0

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        filename = z.namelist()[0]
        print(f"  File inside zip: {filename}")
        with z.open(filename) as f:
            reader = csv.reader(io.TextIOWrapper(f, encoding="latin-1"), delimiter="|")
            for row in reader:
                if len(row) < 17:
                    continue

                pac_id      = row[0].strip()   # CMTE_ID
                trans_type  = row[5].strip()    # TRANSACTION_TP
                fec_cand_id = row[16].strip()   # CAND_ID
                cycle_raw   = row[3].strip()    # e.g. "P2024"
                date_raw    = row[13].strip()   # MMDDYYYY
                amount_raw  = row[14].strip()   # TRANSACTION_AMT

                # Only direct contributions / coordinated / in-kind
                if trans_type not in ("24K", "24C", "24E", "24Z"):
                    skipped_type += 1
                    continue

                # Extra guard: only House candidate IDs
                if not fec_cand_id.startswith("H"):
                    continue

                pol = matched_politicians.get(fec_cand_id)
                if not pol:
                    continue

                try:
                    amount = float(amount_raw)
                except (ValueError, TypeError):
                    amount = 0
                if amount <= 0:
                    continue

                # Normalize "P2024", "G2024", "R2022" → just the 4-digit year
                cycle = cycle_raw[-4:] if len(cycle_raw) >= 4 and cycle_raw[-4:].isdigit() else cycle_raw
                date_iso = parse_date(date_raw)

                contributions.append({
                    "politician_id": pol["id"],
                    "pac_id":        pac_id,
                    "amount":        amount,
                    "date_raw":      date_iso,
                    "catcode":       "",
                    "dimension":     None,
                    "cycle":         cycle,
                })

    print(f"  Found {len(contributions)} PAC contributions to our House politicians")
    print(f"  Skipped {skipped_type} rows with other transaction types")
    return contributions

def save_to_supabase(contributions):
    if not contributions:
        print("No contributions to save.")
        return

    # Aggregate by politician + pac (one row per unique PAC→politician relationship)
    by_key = defaultdict(lambda: {
        "total": 0, "count": 0, "date": "",
        "politician_id": "", "pac_id": "", "catcode": "",
        "dimension": None, "cycle": ""
    })
    for c in contributions:
        key = f"{c['politician_id']}_{c['pac_id']}"
        by_key[key]["total"]         += c["amount"]
        by_key[key]["count"]         += 1
        by_key[key]["politician_id"]  = c["politician_id"]
        by_key[key]["pac_id"]         = c["pac_id"]
        by_key[key]["catcode"]        = c["catcode"]
        by_key[key]["dimension"]      = c["dimension"]
        by_key[key]["cycle"]          = c["cycle"]
        # Keep the most recent date
        if c["date_raw"] > by_key[key]["date"]:
            by_key[key]["date"] = c["date_raw"]

    rows = []
    for d in by_key.values():
        rows.append({
            "politician_id":      d["politician_id"],
            "pac_id":             d["pac_id"],
            "catcode":            d["catcode"],
            "dimension":          d["dimension"],
            "total_amount":       round(d["total"], 2),
            "contribution_count": d["count"],
            "cycle":              d["cycle"],
            "latest_date":        d["date"],
        })

    print(f"  Saving {len(rows)} aggregated House PAC donor records to Supabase...")
    BATCH = 100
    saved = 0
    errors = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i:i+BATCH]
        status, result = supabase_request("POST", "pac_donors", batch, key=SUPABASE_SVC)
        if status in (200, 201):
            saved += len(batch)
        else:
            errors += len(batch)
            print(f"  Insert error (batch {i//BATCH}): {result[:300]}")
    print(f"  Saved {saved} rows, {errors} errors")

def main():
    print("=" * 55)
    print("  THROUGHLINE PAC DATA IMPORTER — HOUSE")
    print("=" * 55)
    politicians = load_house_politicians()
    candidates_by_key, fec_ids = load_fec_candidate_ids()
    matched = match_politicians_to_fec(politicians, candidates_by_key, fec_ids)
    contributions = load_pac_contributions(matched)
    save_to_supabase(contributions)
    print("\n" + "=" * 55)
    print("  DONE")
    print("=" * 55)

if __name__ == "__main__":
    main()
