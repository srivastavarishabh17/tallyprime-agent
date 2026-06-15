# TallyPrime Agent

A lightweight background agent that syncs data between **TallyPrime** (running locally) and the **Satyakiran Inventory Server** on a scheduled interval.

## What it does

Every 2 minutes the agent:

1. **Pull** — Fetches all ledgers from Tally via XML, maps them to the server format, and uploads them to the inventory server.
2. **Push** — Fetches pending tasks from the server (e.g. new customers/sales) and creates the corresponding entries in Tally.

## Architecture

```
TallyPrime (localhost:9000)
       ↕  XML over HTTP
  satyakiran-agent
       ↕  JSON over HTTPS
inventory.satyakiran.co.in/api/tally/integration
```

## Setup

### 1. Prerequisites

- Node.js >= 20
- TallyPrime running on the same machine with **HTTP XML server enabled** (default port 9000)

### 2. Configure

Edit `agent.config.json`:

```json
{
  "tally": {
    "host": "http://localhost:9000"
  },
  "server": {
    "api": "https://inventory.satyakiran.co.in/api/tally/integration",
    "token": "YOUR_AGENT_TOKEN",
    "device_id": "PC001",
    "company_id": 1
  },
  "syncInterval": "*/2 * * * *"
}
```

| Field | Description |
|---|---|
| `tally.host` | URL where TallyPrime's XML server is listening |
| `server.api` | Satyakiran inventory API endpoint |
| `server.token` | Agent auth token (get from admin panel) |
| `server.device_id` | Unique ID for this machine (e.g. `PC001`) |
| `server.company_id` | Tally company ID on the server |
| `syncInterval` | Cron expression for sync frequency |

### 3. Run (development)

```bash
npm install
npm run dev
```

### 4. Build & run (production)

```bash
npm run build
node dist/index.js
```

### 5. Build Windows executable

```bash
npm run package:win
```

This generates `AozoAgent.exe` — copy it alongside `agent.config.json` to the target PC and run it.

## API request format

Every sync call to the server follows this structure:

```json
{
  "device_id": "PC001",
  "company_id": 1,
  "module": "ledgers",
  "action": "push",
  "payload": {
    "data": [
      {
        "ledger_name": "ABC Traders",
        "parent": "Sundry Debtors",
        "opening_balance": 0,
        "gstin": "09ABCDE1234F1Z5",
        "mobile": "9876543210"
      }
    ]
  }
}
```

## Project structure

```
src/
├── index.ts              # Entry point
├── config.ts             # Loads and validates agent.config.json
├── config/
│   └── api.ts            # Re-exports from server/api
├── server/
│   └── api.ts            # HTTP calls to inventory server
├── sync/
│   ├── scheduler.ts      # Cron job runner
│   ├── pull.ts           # Tally → Server (ledgers)
│   └── push.ts           # Server → Tally (pending invoices)
├── tally/
│   ├── client.ts         # HTTP calls to TallyPrime
│   ├── requests.ts       # Tally XML request builders
│   └── parser.ts         # XML parser + ledger mapper
└── storage/
    └── state.json        # Persistent sync state
```
