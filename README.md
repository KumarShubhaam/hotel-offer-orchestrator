# Hotel Offer Orchestrator

Compares hotel listings from two mocked supplier APIs, de-duplicates them by name (cheapest price wins), and returns the best offer per hotel — orchestrated with [Temporal](https://temporal.io/) and cached in Redis for price-range filtering.

## Tech stack

- TypeScript + Express (all 3 services)
- Temporal.io (workflow orchestration)
- Redis (dedup cache + price filtering)
- Docker Compose (local multi-container run)

## Architecture

```
                 ┌─────────────┐        ┌─────────────┐
                 │ Supplier A  │        │ Supplier B  │
                 │ (mock API)  │        │ (mock API)  │
                 │  :3000      │        │  :3001      │
                 └──────┬──────┘        └──────┬──────┘
                        │  fetched in parallel by  │
                        │      Temporal activities  │
                        └───────────┬───────────────┘
                                    │
                         ┌──────────▼───────────┐
                         │ hotelComparisonWorkflow│
                         │  (Temporal Worker)     │
                         │  - dedupe by name      │
                         │  - cheaper price wins  │
                         │  - cache to Redis      │
                         └──────────┬────────────┘
                                    │
                         ┌──────────▼────────────┐
                         │   Aggregator API :4000 │
                         │   GET /api/hotels       │
                         └────────────────────────┘
```

**Services** (each is its own folder + Dockerfile):

- `Supplier A/` — mock hotel API, `GET /supplierA/hotels`, port 3000
- `Supplier B/` — mock hotel API, `GET /supplierB/hotels`, port 3001
- `Aggregator/` — Express API (`GET /api/hotels`) + a Temporal worker, both built from the same image but run as two separate docker-compose services (`aggregator-api`, `aggregator-worker`)

## API

### `GET /api/hotels?city=<city>`

Runs the Temporal workflow: fetches both suppliers in parallel, de-dupes by hotel name (case-insensitive), keeps the cheaper price when both suppliers list the same hotel, and returns everything as a flat array.

### `GET /api/hotels?city=<city>&minPrice=<min>&maxPrice=<max>`

Same as above, then filters by price range. The workflow always writes the deduped list to Redis (`hotels:{city}`, 300s TTL); when a price range is given, the Aggregator re-reads that Redis entry and filters in Node (falls back to the in-memory workflow result if Redis is unreachable).

**Response shape** (array, not wrapped):

```json
[
  {
    "name": "Taj Palace",
    "price": 5800,
    "supplier": "supplier-b",
    "commisionPct": 11
  }
]
```

### Mock supplier endpoints

- `GET /supplierA/hotels` → `Supplier A/src/data.ts`
- `GET /supplierB/hotels` → `Supplier B/src/data.ts`

Both return a bare array of `{ hotelId, name, price, city, commisionPct }`. Supplier B's mock data intentionally overlaps some of Supplier A's hotel names (different prices, and one exact-price tie) plus supplier-only hotels and a supplier-only city (Jaipur), to exercise the dedup logic.

## Running it (Docker Compose)

```powershell
docker compose up --build
```

This starts 8 containers: `postgresql`, `temporal` (auto-setup), `temporal-ui`, `redis`, `supplier-a`, `supplier-b`, `aggregator-api`, `aggregator-worker`. Give Temporal ~30-60s after startup to finish its schema setup before hitting the API — the Aggregator retries its Temporal connection (10 attempts, 2s apart) if it's not ready yet.

> **Note:** the Aggregator's supplier URLs are hardcoded to the docker-compose service hostnames (`http://supplier-a:3000/...`, `http://supplier-b:3001/...`), so the full stack currently only runs via docker-compose — running the three services standalone with `npm run dev` won't let the Aggregator reach the suppliers.

| Service           | Host port |
| ----------------- | --------- |
| `supplier-a`      | 3000      |
| `supplier-b`      | 3001      |
| `aggregator-api`  | 4000      |
| `temporal` (gRPC) | 7233      |
| `temporal-ui`     | 8080      |
| `redis`           | 6379      |

Stop everything with `docker compose down` (add `-v` to also drop the Postgres volume).

## Verifying it works

```powershell
curl "http://localhost:4000/api/hotels?city=delhi"
curl "http://localhost:4000/api/hotels?city=delhi&minPrice=5000&maxPrice=6000"
curl "http://localhost:4000/api/hotels?city=jaipur"   # Supplier-B-only city
redis-cli -h localhost GET hotels:delhi               # confirm the dedup cache write
```

Open `http://localhost:8080` for the Temporal UI to see the `hotelComparisonWorkflow` execution history.

## Postman

Import [postman/Hotel-Offer-Orchestrator.postman_collection.json](postman/Hotel-Offer-Orchestrator.postman_collection.json) — it ships with collection variables (`supplierABaseUrl`, `supplierBBaseUrl`, `aggregatorBaseUrl`) already pointing at the ports above.

## Per-service scripts

Each of `Supplier A/`, `Supplier B/`, `Aggregator/` has:

- `npm run dev` — `tsx watch src/index.ts` (Express app, hot reload)
- `npm run build` — `tsc` (emits to `dist/`)
- `npm run start` — `node dist/index.js` (compiled)

`Aggregator/` additionally has:

- `npm run dev:worker` — `tsx watch src/temporal/worker.ts`
- `npm run start:worker` — `node dist/temporal/worker.js`

## Environment variables (Aggregator)

| Variable           | Default                  | Purpose                                                                  |
| ------------------ | ------------------------ | ------------------------------------------------------------------------ |
| `REDIS_URL`        | `redis://localhost:6379` | Redis connection                                                         |
| `TEMPORAL_ADDRESS` | `localhost:7233`         | Temporal frontend address (used by both the API's client and the worker) |

Supplier URLs are intentionally **not** env vars — they're hardcoded in `Aggregator/src/temporal/activities/supplierActivities.ts` to match the docker-compose service names.
