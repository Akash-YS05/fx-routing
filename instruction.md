You are a senior full-stack engineer with experience in fintech systems.

Build a production-style application called **Smart FX Routing Engine** using:

* Next.js (App Router)
* Node.js (backend via route handlers)
* PostgreSQL (with Prisma ORM)
* TypeScript
* UI: shadcn/ui

The system simulates how fintech companies optimize cross-border payments by selecting the best payment route based on cost, FX rates, and settlement time.

---

## Core Goal

Given a transaction, compute the optimal payment route across multiple rails and explain the decision.

---

## Features

### 1. API Layer (Next.js Route Handlers)

Create:
POST /api/route

Request:

* amount: number
* sourceCurrency: string (e.g. USD)
* destinationCurrency: string (INR default)
* priority: "cheap" | "fast" | "balanced"

---

### 2. Payment Rails

Model at least 3 rails:

* SWIFT
* Local Collection
* Partner Rail

Each rail must include:

* flatFee
* percentFee
* fxMarkup
* avgSettlementTimeHours
* reliabilityScore (0–1)

Store in PostgreSQL.

---

### 3. FX Rate Engine

Create a service that:

* Returns FX rates (mock or API)
* Adds controlled randomness (simulate market fluctuation)
* Applies rail-specific markup

---

### 4. Decision Engine (CORE LOGIC)

For each rail:

* Convert currency
* Apply FX markup
* Add fees
* Compute total cost
* Estimate settlement time

Implement scoring:

score = w1 * cost + w2 * time + w3 * (1 - reliability)

Weights:

* cheap → cost-heavy
* fast → time-heavy
* balanced → mixed

Support constraints:

* optional maxTime
* optional maxFeePercent

Return best route + full comparison.

---

### 5. Database (Prisma)

Models:

* Rail
* Transaction (store past simulations)
* FxRate (optional cache)

---

### 6. UI (IMPORTANT)

Build a clean dashboard using shadcn:

#### A. Input Panel

* amount
* currency
* priority selector

#### B. Output Panel

* Selected route (highlighted)
* Cost breakdown
* Time estimate
* Explanation (human-readable)

#### C. Comparison Table

* All rails side-by-side
* cost, time, score

---

### 7. Explanation Layer (CRITICAL)

Return reasoning like:

"This route was selected because it minimizes total cost while staying within acceptable settlement time. Although SWIFT is more reliable, its higher fees make it less optimal."

---

### 8. Advanced Features (implement at least 2)

* FX volatility simulation (rates change per request)
* What-if analysis (change rate by ±X%)
* Profit calculation (platform margin)
* Caching FX rates with expiry
* Basic anomaly detection (flag unusually high cost)

---

### 9. Code Quality Requirements

* Use TypeScript everywhere
* Modular structure:

  * /lib (services, logic)
  * /db (Prisma)
  * /app/api (routes)
* No hardcoded logic inside route handlers
* Clear separation: controller vs service vs model

---

### 10. Deliverables

* Full working app
* Seed script for rails
* README with:

  * architecture explanation
  * decision logic breakdown
  * tradeoffs

---

## Important Constraints

* Do NOT build a simple CRUD app
* Focus on decision-making logic and system design
* Code should resemble real fintech backend systems
* Avoid unnecessary UI complexity; prioritize clarity, however dont create a generic and dull UI, it should be sharp and appealing.

---

## Stretch Goal (if possible)

Simulate 1000 transactions and show:

* which rail gets chosen most
* average cost per route

Show as a pretty well formatted table in UI.

---

Generate the full project step-by-step:

1. Folder structure
2. Prisma schema
3. Core services (FX + decision engine)
4. API route
5. UI components
6. Sample data + test scenarios

go small step by step, give a brief update on the work done, and a github commitn message for the particular updates.
