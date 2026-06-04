import os
import sys
import re
import json
import requests
import logging
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("patak")

TURSO_API_URL = os.environ.get("V_API_URL")
INGEST_SECRET = os.environ.get("INGEST_SECRET")

if not all([TURSO_API_URL, INGEST_SECRET]):
    log.error("Missing critical environment tokens. Exiting.")
    sys.exit(1)

TARGET_URL = "https://www.meralco.com.ph/residential/news-advisories/maintenance-schedule"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-PH,en;q=0.9",
}


# ── Strategy 1: Scrapling stealth browser ──────────────────────────────────

def strategy_scrapling() -> list[str]:
    """Full stealth browser render — handles JS-heavy pages, bypasses basic bot checks."""
    try:
        from scrapling import Fetcher
        log.info("Strategy 1: Scrapling stealth fetch...")
        page = Fetcher.get(TARGET_URL)
        if page.status != 200:
            log.warning(f"Scrapling returned status {page.status}")
            return []

        # Primary selector — update this when Meralco changes their DOM
        cards = [el.get_all_text().strip() for el in page.css(".views-col") if el.get_all_text().strip()]
        if cards:
            log.info(f"Strategy 1 found {len(cards)} cards via primary selector.")
            return cards[:5]

        # Fallback selector within Scrapling — broader grab
        cards = [el.get_all_text().strip() for el in page.css(".views-row, .advisory-item, .outage-notice, article.advisory") if el.get_all_text().strip()]
        if cards:
            log.info(f"Strategy 1 found {len(cards)} cards via fallback selector.")
            return cards[:5]

        log.warning("Strategy 1: No advisory elements matched any selector.")
        return []
    except Exception as e:
        log.warning(f"Strategy 1 failed: {e}")
        return []


# ── Strategy 2: Raw HTTP + BeautifulSoup ──────────────────────────────────

def strategy_bs4() -> list[str]:
    """Lightweight HTTP request + HTML parsing — faster, no browser overhead."""
    try:
        log.info("Strategy 2: Raw HTTP + BeautifulSoup...")
        res = requests.get(TARGET_URL, headers=HEADERS, timeout=15)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")

        # Attempt known selectors in order of specificity
        selectors = [
            {"class": "views-col"},
            {"class": "views-row"},
            {"class": "advisory-card-text"},
            {"class": "advisory-item"},
            {"class": "outage-notice"},
        ]
        for attrs in selectors:
            tags = soup.find_all(True, attrs)
            if tags:
                texts = [t.get_text(separator="\n", strip=True) for t in tags if t.get_text(strip=True)]
                if texts:
                    log.info(f"Strategy 2 found {len(texts)} items with {attrs}.")
                    return texts[:5]

        log.warning("Strategy 2: No known selectors matched.")
        return []
    except Exception as e:
        log.warning(f"Strategy 2 failed: {e}")
        return []


# ── Strategy 3: Keyword-density text fallback ─────────────────────────────

def strategy_text_fallback() -> list[str]:
    """
    Last resort — fetch the page as plain text, split into paragraphs, and
    return any that contain at least two outage-related keywords.
    Useful when the site restructures its DOM entirely.
    """
    OUTAGE_KEYWORDS = {
        "scheduled", "interruption", "maintenance", "outage", "power",
        "water", "barangay", "brgy", "restoration", "advisory",
    }
    try:
        log.info("Strategy 3: Keyword-density text fallback...")
        res = requests.get(TARGET_URL, headers=HEADERS, timeout=15)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")
        # Strip scripts and styles before extracting text
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        full_text = soup.get_text(separator="\n")

        candidates = []
        for para in full_text.split("\n\n"):
            para = para.strip()
            if len(para) < 60:
                continue
            lower = para.lower()
            hits = sum(1 for kw in OUTAGE_KEYWORDS if kw in lower)
            if hits >= 2:
                candidates.append(para)

        if candidates:
            log.info(f"Strategy 3 found {len(candidates)} candidate paragraphs.")
            return candidates[:5]

        log.warning("Strategy 3: No keyword-dense paragraphs found.")
        return []
    except Exception as e:
        log.warning(f"Strategy 3 failed: {e}")
        return []


def scrape_portal() -> list[str]:
    """Run strategies in order, return first non-empty result. Fail loudly if all miss."""
    for strategy in [strategy_scrapling, strategy_bs4, strategy_text_fallback]:
        result = strategy()
        if result:
            return result
    log.error("All scraping strategies returned zero advisories. Pipeline failure.")
    sys.exit(1)  # Triggers GitHub Actions failure notification


# ── Regex pattern library ─────────────────────────────────────────────────

# Matches: "May 15, 2025, 8:00 AM to 5:00 PM" / "June 3 from 10AM–3PM" etc.
DATE_RANGE_RE = re.compile(
    r"(?P<start>"
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
        r"\s+\d{1,2}(?:,\s*\d{4})?"
        r"(?:[,\s]+\d{1,2}:\d{2}\s*(?:AM|PM))?"
    r")"
    r"\s*(?:to|–|-|until)\s*"
    r"(?P<end>"
        r"(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
        r"\s+\d{1,2}(?:,\s*\d{4})?\s*)?"
        r"\d{1,2}:\d{2}\s*(?:AM|PM)"
    r")",
    re.IGNORECASE,
)

# Matches: "Barangay Holy Spirit", "Brgy. Batasan Hills", "Bgy Commonwealth"
BARANGAY_RE = re.compile(
    r"\b(?:Barangay|Brgy\.?|Bgy\.?)\s+([A-Z][A-Za-z\s\-]+?)(?=,|;|\.|and\s+(?:Barangay|Brgy)|$)",
    re.IGNORECASE,
)

# Matches street/compound mentions after a barangay heading
STREETS_RE = re.compile(
    r"(?:including|along|covering|portions?\s+of|namely)[:\s]+"
    r"([A-Z][A-Za-z0-9\s,\.'\-]+?)(?=\.|;|\n|Barangay|Brgy|$)",
    re.IGNORECASE,
)

# Reason classification keywords
EMERGENCY_KEYWORDS = {"emergency", "typhoon", "storm", "fault", "damage", "unannounced", "forced"}
MAINTENANCE_KEYWORDS = {"maintenance", "scheduled", "upgrade", "improvement", "installation", "inspection"}

# Known municipality names in NCR — extend for other regions as needed
NCR_MUNICIPALITIES = {
    "quezon city", "manila", "makati", "pasig", "taguig", "mandaluyong",
    "san juan", "marikina", "pasay", "parañaque", "las piñas", "muntinlupa",
    "caloocan", "malabon", "navotas", "valenzuela", "pateros",
}


def classify_reason(text: str) -> tuple[str, str]:
    """Returns (status, reasonCategory) based on keyword presence."""
    lower = text.lower()
    emergency_hits = sum(1 for kw in EMERGENCY_KEYWORDS if kw in lower)
    maintenance_hits = sum(1 for kw in MAINTENANCE_KEYWORDS if kw in lower)
    if emergency_hits > maintenance_hits:
        return "UNANNOUNCED", "EMERGENCY"
    return "SCHEDULED", "MAINTENANCE"


def extract_dates_multiple(text: str) -> list[tuple[datetime, datetime]]:
    """Extract all start and end datetime pairs from advisory text."""
    results = []
    
    # Check standard DATE_RANGE_RE
    for match in DATE_RANGE_RE.finditer(text):
        try:
            start_dt = dateparser.parse(match.group("start"), dayfirst=False)
            end_raw = match.group("end")
            if not any(c.isalpha() for c in end_raw.split()[0]):
                base_date = start_dt.strftime("%B %d, %Y") if start_dt else ""
                end_dt = dateparser.parse(f"{base_date} {end_raw}", dayfirst=False)
            else:
                end_dt = dateparser.parse(end_raw, dayfirst=False)
            results.append((start_dt, end_dt))
        except Exception:
            pass
            
    if results:
        return results
        
    # Fallback: search for time ranges with optional date
    time_range_re = re.compile(
        r"between\s+(?P<start_time>\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s+and\s+(?P<end_time>\d{1,2}(?::\d{2})?\s*(?:AM|PM))"
        r"(?:\s*\([^)]*?(?P<date>\d{2}/\d{2}/\d{2}|\w+\s+\d{1,2},\s*\d{4})\))?",
        re.IGNORECASE
    )
    
    general_date_re = re.compile(
        r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
        r"\s+\d{1,2}(?:,\s*\d{4})?",
        re.IGNORECASE
    )
    general_date_match = general_date_re.search(text)
    default_date = general_date_match.group(0) if general_date_match else None
    
    for m in time_range_re.finditer(text):
        start_time_str = m.group("start_time")
        end_time_str = m.group("end_time")
        date_str = m.group("date") or default_date
        
        if date_str:
            try:
                start_dt = dateparser.parse(f"{date_str} {start_time_str}", dayfirst=False)
                end_dt = dateparser.parse(f"{date_str} {end_time_str}", dayfirst=False)
                if end_dt < start_dt:
                    end_dt += timedelta(days=1)
                results.append((start_dt, end_dt))
            except Exception:
                pass
                
    return results


def extract_municipality(text: str) -> str:
    """
    Match against NCR municipality list first (fast, deterministic).
    Falls back to regex-based City name extraction, then to spaCy GPE entities.
    """
    lower = text.lower()
    matched = [m for m in NCR_MUNICIPALITIES if m in lower]
    if matched:
        # Return longest match to resolve "Manila" vs "Mandaluyong" ambiguity
        return max(matched, key=len).title()

    # Pattern match fallback: e.g. "Batangas City" -> "Batangas"
    city_match = re.search(r"\b([A-Z][A-Za-z\s\-]+?)\s+City\b", text)
    if city_match:
        return city_match.group(1).strip().title()

    # spaCy fallback for provincial advisories
    try:
        import spacy
        nlp = spacy.load("en_core_web_sm")
        doc = nlp(text[:500])  # cap at 500 chars to stay fast
        gpe_entities = [ent.text for ent in doc.ents if ent.label_ == "GPE"]
        if gpe_entities:
            return gpe_entities[0]
    except Exception:
        pass

    return "Unknown"


def extract_areas(text: str) -> list[dict]:
    """
    Returns a list of { barangay, streetsRaw } dicts.
    Pairs each matched barangay with any streets mentioned in the
    following sentence fragment.
    """
    areas = []
    barangay_matches = list(BARANGAY_RE.finditer(text))

    for i, bm in enumerate(barangay_matches):
        barangay_name = bm.group(1).strip().title()
        # Slice text between this barangay match and the next (or end of string)
        segment_start = bm.end()
        segment_end = barangay_matches[i + 1].start() if i + 1 < len(barangay_matches) else len(text)
        segment = text[segment_start:segment_end]

        streets_match = STREETS_RE.search(segment)
        streets_raw = streets_match.group(1).strip() if streets_match else ""

        areas.append({"barangay": barangay_name, "streetsRaw": streets_raw})

    # Guarantee at least one area entry so the ingest webhook always has something
    if not areas:
        areas = [{"barangay": "Unknown", "streetsRaw": text[:200]}]

    return areas


def parse_advisory(raw_text: str) -> list[dict]:
    """
    Main parse entrypoint. Returns a list of structured dicts matching the
    ingest webhook's expected parsed payload shape, or an empty list on failure.
    """
    try:
        status, reason = classify_reason(raw_text)
        municipality = extract_municipality(raw_text)
        areas = extract_areas(raw_text)

        date_ranges = extract_dates_multiple(raw_text)
        if not date_ranges:
            log.warning("Could not extract any date range — skipping advisory.")
            return []

        results = []
        for start_dt, end_dt in date_ranges:
            results.append({
                "status": status,
                "reasonCategory": reason,
                "startTimeISO": start_dt.isoformat(),
                "endTimeISO": end_dt.isoformat(),
                "municipality": municipality,
                "province": "Metro Manila", # extend via lookup table for other regions
                "region": "NCR",
                "affectedBreakdown": areas,
            })
        return results
    except Exception as e:
        log.error(f"Parser hard failure: {e}")
        return []


# ── Ingest ────────────────────────────────────────────────────────────────

def ship_to_backend(data: dict, raw_text: str) -> None:
    payload = {
        "secret": INGEST_SECRET,
        "providerSlug": "meralco",
        "rawText": raw_text,
        "parsed": data,
    }
    res = requests.post(TURSO_API_URL, json=payload, headers={"Content-Type": "application/json"})
    res.raise_for_status()
    log.info(f"Ingest status: {res.status_code} — ID: {res.json().get('registeredId', 'n/a')}")


if __name__ == "__main__":
    raw_cards = scrape_portal()
    ingested = 0
    total_parsed = 0
    for card in raw_cards:
        parsed_list = parse_advisory(card)
        if parsed_list:
            total_parsed += len(parsed_list)
            for parsed in parsed_list:
                try:
                    ship_to_backend(parsed, card)
                    ingested += 1
                except Exception as e:
                    log.error(f"Failed to ingest: {e}")
    log.info(f"Pipeline complete. {ingested}/{total_parsed} advisories ingested (from {len(raw_cards)} raw cards).")
    if ingested == 0:
        log.error("Zero advisories ingested after parsing. Check regex patterns.")
        sys.exit(1)
