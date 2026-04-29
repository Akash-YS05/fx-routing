# Foreign Exchange Routing Engine

A production-style fintech app simulating how platforms optimize cross-border payment routing under cost, speed, and reliability constraints. Built with Next.js App Router, PostgreSQL, Prisma, TypeScript, and shadcn/ui

## What this app does

Given a transaction request, the engine compares multiple payment rails and selects the optimal route by balancing:

- Total cost (flat fee + percent fee + FX markup impact)
- Settlement speed
- Reliability

It returns the selected route, full rail comparison, and a human-readable explanation.

## Key Observation of the Simulations
For most mid-sized transfers, Local Collection or Partner Rail usually wins because they keep total friction (fees + FX markup impact) lower while still settling reasonably fast; SWIFT tends to appear as the reliability leader but is often not selected unless constraints prioritize reliability or stricter corridor behavior. 

## Stack

- Next.js 16 (App Router + route handlers)
- TypeScript
- PostgreSQL
- Prisma ORM
- shadcn/ui

## Project structure

- `app/api/route/route.ts` - POST API for route optimization
- `app/api/route/simulate/route.ts` - POST API for 1000-tx simulation
- `components/fx-routing/route-dashboard.tsx` - dashboard UI
- `db/prisma.ts` - Prisma client singleton
- `lib/controllers/route-controller.ts` - orchestration layer
- `lib/services/fx-rate-service.ts` - FX engine + volatility + cache
- `lib/services/decision-engine.ts` - scoring and route selection
- `lib/services/transaction-service.ts` - persistence and simulation summary
- `lib/services/explanation-service.ts` - explanation layer
- `lib/services/rail-service.ts` - rail loading from DB
- `lib/constants/fx.ts` - scoring weights and constants
- `prisma/schema.prisma` - schema
- `prisma/seed.ts` - seed script for rails

## Decision logic

For each active rail:

1. Pull current fluctuated FX rate
2. Apply rail-specific markup
3. Compute converted amount
4. Add fees (`flatFee + amount * percentFee`)
5. Estimate settlement time
6. Compute weighted score:

`score = w1 * normalizedCost + w2 * normalizedTime + w3 * (1 - reliability)`

Weights by priority:

- `cheap`: cost-heavy
- `fast`: time-heavy
- `balanced`: mixed

Optional constraints:

- `maxTime`
- `maxFeePercent`

If all routes violate constraints, engine returns the lowest-score route with disqualification reasons.

## Advanced features implemented

1. **FX volatility simulation**
   - Each request adds controlled random variation (bps range)
2. **What-if analysis**
   - Client can pass `whatIfShockPercent` to stress test rates by +/-X%
3. **Profit calculation**
   - Returns `platformMarginSource` per rail
4. **FX cache with expiry**
   - Stores rates in `FxRate` with TTL
5. **Basic anomaly detection**
   - Flags rails with unusually high fee percent vs cohort average

## API contract

### `POST /api/route`

Request:

```json
{
  "amount": 1000,
  "sourceCurrency": "USD",
  "destinationCurrency": "INR",
  "priority": "balanced",
  "constraints": {
    "maxTime": 36,
    "maxFeePercent": 2.0
  },
  "whatIfShockPercent": 0.5
}
```

Response includes:

- `selectedRoute`
- `comparisons`
- `explanation`
- `metadata`

### `POST /api/route/simulate`

Runs batch simulation (default 1000 transactions) and returns:

- chosen rail count
- average selected cost per rail

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment

```bash
copy .env.example .env
```

3. Run migrations and generate Prisma client

```bash
npm run prisma:migrate
npm run prisma:generate
```

4. Seed rails

```bash
npm run prisma:seed
```

5. Start app

```bash
npm run dev
```

## Tradeoffs

- Uses deterministic static base rates + simulated volatility instead of live FX provider to keep demo reproducible and self-contained.
- Score normalization is min-max per request, which improves comparability but can be sensitive to outliers in tiny rail sets.
- Cache TTL is short and in DB for clarity; high-throughput systems would combine Redis and market data snapshots.
