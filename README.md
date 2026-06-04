# Project Patak 💧 ⚡
> A civic tech platform tracking scheduled and unannounced power/water utility outages in the Philippines.

Project Patak aggregates, normalizes, and maps public utility maintenance schedules and emergency repair notices. It bridges the gap between unstructured, scattered utility announcements and the public, helping communities monitor service reliability across Metro Manila.

---

## 🏗️ Architecture & Tech Stack

*   **Frontend**: [Nuxt 3](https://nuxt.com/) (Vue 3, Vite, Tailwind CSS)
*   **Map Integration**: [Leaflet.js](https://leafletjs.com/) with CartoDB Positron tiles for responsive spatial mapping.
*   **Database**: SQLite via `@libsql/client` (Turso compatible) featuring automatic schema migrations and initial seeding on startup.
*   **Scraper Engine**: Python 3 utilizing [Scrapling](https://github.com/scrapling/scrapling) (advanced TLS fingerprint impersonation to bypass WAF blockages), BeautifulSoup, and regex parsing.
*   **Automations**: GitHub Actions workflows executing scheduled cron triggers to keep the data updated.

---

## 📁 Repository Structure

```
├── .github/workflows/   # CI/CD & scraper automation cron jobs
├── app/                 # Nuxt Vue application views and assets
├── public/              # Static assets (PWA icons, etc.)
├── scripts/             # Python scraping & date/location parsing pipeline
├── server/
│   ├── api/             # Webhook and API data routes
│   └── utils/           # Libsql database client and auto-initializer
├── .env.example         # Environment template file
├── nuxt.config.ts       # Nuxt app settings & PWA config
└── package.json         # JS project dependencies
```

---

## ⚙️ Environment Configuration

Copy the template environment file to create your local configurations:

```bash
cp .env.example .env
```

Parameters in `.env`:
*   `TURSO_DATABASE_URL`: Set to `file:local.db` for local SQLite development, or point to a remote Turso DB (e.g., `libsql://...`).
*   `TURSO_AUTH_TOKEN`: Auth token for Turso cloud deployments.
*   `INGEST_SECRET`: A secure hash key protecting the `/api/ingest` webhook.

---

## 🚀 Setup & Installation

### 1. Web Application & Dashboard
Make sure to install dependencies and boot up the development server:

```bash
# Install dependencies
bun install   # or npm install / pnpm install

# Start the local development server (runs on http://localhost:3000)
bun run dev
```

> [!NOTE]
> When the Nuxt server starts up for the first time on `file:local.db`, it will automatically create all tables, indexes, and seed initial mock outages for Quezon City, Mandaluyong, and Pasig.

### 2. Python Scraper Setup
The scraper extracts current planned maintenance details directly from Meralco's official announcements.

```bash
# Navigate to workspace and create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install required parsing and scraping libraries
pip install -r scripts/requirements.txt

# Run the scraper against your local development server
export V_API_URL="http://localhost:3000/api/ingest"
export INGEST_SECRET="55650d4f9768ac8ac80a5cfbef7d464e68d3736bd4162b71271036c392a32ca9" # Default secret

python3 scripts/extract_and_parse.py
```

---

## 📡 API Reference

### `POST /api/ingest`
Webhook endpoint to register parsed outage events. Protected by `INGEST_SECRET`.
*   **Headers**: `Content-Type: application/json`
*   **Body Payload**:
    ```json
    {
      "secret": "your_ingest_secret",
      "providerSlug": "meralco",
      "rawText": "Raw advisory content text...",
      "parsed": {
        "status": "SCHEDULED",
        "reasonCategory": "MAINTENANCE",
        "startTimeISO": "2026-06-08T22:30:00.000Z",
        "endTimeISO": "2026-06-08T23:00:00.000Z",
        "municipality": "Makati City",
        "province": "Metro Manila",
        "region": "NCR",
        "affectedBreakdown": [
          { "barangay": "Guadalupe Nuevo", "streetsRaw": "J. P. Rizal St." }
        ]
      }
    }
    ```

### `GET /api/outages`
Retrieves all logged outages. Results are cached server-side for **5 minutes**.

### `GET /api/leaderboard`
Retrieves aggregated utility reliability index ratings for each municipality, sorting performance tiers. Results are cached server-side for **1 hour**.

### `POST /api/recalculate-metrics`
Recalculates reliability metrics (SAIFI and SAIDI indicators) across all municipality data.
