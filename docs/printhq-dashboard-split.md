# PrintHQ dashboard / intake / shop floor split

## Goal
Stop using `/dashboard` as a junk drawer.

PrintHQ has three different jobs happening today:
1. **CSR intake / quoting** — gather specs, qualify the request, produce a quote, convert to order/job.
2. **Shop floor control** — run live work by queue, surface bottlenecks, due risk, and ownership.
3. **Back-office references** — quotes, customers, invoices, pricing admin, settings.

Those should not share the same primary screen. The current dashboard mixes conversational intake, manual bot intake, KPI intent, and queue operations in one stack. That creates context switching and makes the top CTA ambiguous.

## Recommended route split

### 1) `/dashboard` = Shop Floor Command Center
Use this for production control only.

**Primary user:** production leads, managers, internal staff checking floor status.

**Not on this page:**
- CSR chat intake
- manual quote-building workbench
- long form order creation
- pricing admin controls

### 2) `/dashboard/intake` = CSR Intake / New Quote
Use this as the dedicated front door for any new work request.

**Primary user:** CSR / estimator / sales support.

This page owns:
- conversational intake
- quick structured intake form
- attachment drop zone
- customer/brand selection
- quote proposal generation
- conversion to quote / quick order / internal job

### 3) `/dashboard/quotes` = Quote Pipeline
Use this for quote follow-up and conversion, not first-touch intake.

**Primary user:** CSR / sales.

### 4) `/dashboard/jobs/[id]` = Job Command View
Use this as the detailed execution screen once work exists.

---

# IA update

## Left nav (internal)
Order matters. This should match actual workflow.

1. **Shop Floor** → `/dashboard`
2. **Intake** → `/dashboard/intake`
3. **Quotes** → `/dashboard/quotes`
4. **Jobs** → optional list route later if created
5. **Customers** → `/dashboard/customers`
6. **Estimator** → `/dashboard/pricing/estimator`
7. **Pricing** → `/dashboard/pricing`
8. **Invoices** → `/dashboard/invoices`
9. **Settings** → `/dashboard/settings`

## Top-level mental model
- **Shop Floor = what is moving now**
- **Intake = what is being scoped/sold now**
- **Quotes = what is waiting on approval**
- **Estimator/Pricing = tools/admin**

That separation is the whole win.

---

# 1) `/dashboard` — shop floor command center

## Page objective
Answer 5 questions fast:
1. What is due today / late / at risk?
2. Where is work stacking up?
3. Which queue is blocked?
4. Who owns what?
5. What needs escalation right now?

## Recommended screen structure

### A. Header strip
- Title: **Shop Floor**
- Subtitle: `Live production status across Prepress, Press, Bindery, Mailing, Delivery.`
- Right side actions:
  - `Open Intake`
  - `New Internal Job`

Do **not** make `+ New Order` the only top-right action. That is intake language, not floor language.

### B. KPI row (top, 5-6 cards)
These are operational KPIs, not sales vanity metrics.

1. **Due Today**
2. **Late Jobs**
3. **Blocked / Waiting**
4. **In Prepress Review**
5. **On Press Today**
6. **Unassigned Jobs**

Each card should include:
- count
- micro context (`+2 vs yesterday`, `3 need art approval`, etc. if available later)
- click-through filter behavior

### C. “Today’s Attention” strip
One horizontal band directly under KPIs.

Three priority buckets:
- **Red:** late / hard blocked / due within SLA breach window
- **Amber:** due today / awaiting handoff / missing owner
- **Blue:** recently entered production / needs assignment

This lets a manager scan exceptions before diving into the board.

### D. Queue board (main surface)
This should replace the current giant mixed job table as the primary view.

#### Recommended columns
- Prepress
- Press
- Bindery
- Mailing
- Delivery / Pickup
- Hold / Waiting on Customer

#### Card structure per job item
Each card should show:
- job title
- customer / brand
- qty
- due status badge
- current step
- owner
- flags: proof needed, stock issue, file issue, mailing data, rush
- one-line next action

#### Card color logic
- red left border = late / blocked
- amber = due today / rush
- blue = active normal work
- gray = waiting on customer / external dependency

#### Default sorting inside queue
1. late
2. due today
3. rush
4. due tomorrow
5. everything else by created time

### E. Secondary table toggle
Keep the existing table as a **toggle view**, not the default.

Toggle:
- `Board`
- `Table`

Board should be default because the floor is queue-driven, not spreadsheet-driven.

### F. Bottom utility row / filters
Filters should live above board/table, not mixed into the page body.

Recommended filters:
- queue
- assigned owner
- due window
- status risk
- brand/customer
- rush only
- unassigned only

## Dashboard content that should be removed from `/dashboard`
Move these out:
- CSR Chat panel
- Bot Intake panel
- quote-building controls
- customer-selection-first workflows

Those belong on Intake.

---

# 2) `/dashboard/intake` — CSR intake / new quote surface

## Page objective
Take an inbound request from vague to quote-ready fast.

## Page structure

### A. Header
- Title: **Intake & New Quote**
- Subtitle: `Turn calls, emails, uploads, and walk-ins into structured quotes or jobs.`
- Primary actions are embedded in the action rail, not duplicated everywhere.

### B. Action rail (top)
Three explicit entry actions:

#### `+ New Quote`
Use when:
- customer is price shopping
- specs are still being clarified
- work should enter a quote pipeline before production

Creates:
- intake record / transcript
- draft quote
- optional follow-up task

#### `+ Quick Order`
Use when:
- repeat job
- known SKU/template
- customer already approved pricing or has contract pricing
- operator wants minimal friction

Creates:
- order + job directly
- skips formal quote approval step unless forced by settings

#### `+ Internal Job`
Use when:
- house jobs
- samples
- reprints not billed externally
- signage, test prints, maintenance labels, sales kits

Creates:
- job record with internal cost tracking
- no customer-facing quote by default

## Action model behavior
These are not just labels. Each mode should change the UI.

### Mode 1: New Quote
Show:
- customer / brand
- CSR chat intake
- attachment upload
- structured spec capture
- quantities
- estimator proposals
- send/save quote options

CTA stack:
- `Save Draft Quote`
- `Generate PDF Quote`
- `Send to Customer`

### Mode 2: Quick Order
Show:
- customer lookup
- template/SKU picker
- quantity + due date
- pricing summary
- file upload
- production route preview

CTA stack:
- `Create Order`
- `Create Order & Open Job`

This path should aggressively collapse optional fields.

### Mode 3: Internal Job
Show:
- requesting department
- job title
- queue target
- due date
- internal notes
- optional cost estimate

CTA stack:
- `Create Internal Job`

No customer quote language.

## Intake page layout
Use a two-column layout.

### Left column = conversation / intake workspace
- CSR chat thread
- transcript
- upload tray
- extracted file facts (size, page count, pages, orientation)
- clarifying question history

### Right column = structured job state
Sticky summary card:
- customer
- brand
- product
- size
- qtys
- stock
- finishing
- mailing
- turnaround
- pricing profile / customer override badge
- confidence / missing info state

Under the summary:
- proposal cards by quantity
- selected action CTA block

## Required intake status model
Every intake should visibly sit in one of these states:
- Needs Info
- Quote Ready
- Quote Sent
- Approved
- Converted to Job
- Closed Lost

That status model matters more than fancy chat bubbles.

---

# 3) Action model details

## `+ New Quote`
**Intent:** sell and scope.

**Default output:** quote.

**Best for:**
- custom work
- uncertain specs
- customer approval required
- multi-option pricing

**Fields emphasized:**
- product
- quantities
- stock/coating/finishing
- art readiness
- mailing details
- target in-hands date

**Success state:** quote saved and optionally sent.

## `+ Quick Order`
**Intent:** reduce CSR friction on known work.

**Default output:** job/order.

**Best for:**
- repeat orders
- contract customers
- standard SKUs
- reorder from prior quote/job

**Fields emphasized:**
- existing customer
- prior item/template
- quantity
- due date
- artwork attachment

**Success state:** job lands in the first production queue immediately.

## `+ Internal Job`
**Intent:** operational work, not sales work.

**Default output:** internal job.

**Best for:**
- samples
- internal signage
- maintenance labels
- sales kits
- test runs

**Fields emphasized:**
- department owner
- priority
- queue destination
- due date
- internal notes
- billable = no

**Success state:** work appears on the floor without contaminating the quote pipeline.

---

# 4) Queue board and KPI layout

## KPI hierarchy
Top row should tell the floor manager whether the day is healthy.

### Primary KPIs
- Due Today
- Late
- Blocked
- Unassigned
- In Production
- Completed Today

### Secondary KPIs (smaller row or right rail)
- Average turnaround by queue
- Proofs awaiting approval
- Jobs missing files
- Jobs missing stock assignment
- Mailing jobs pending data

## Queue board grouping rules
Board should group by **current production queue**, not overall job status label.

Bad grouping:
- Pending Review
- In Production
- Complete

Good grouping:
- Prepress
- Press
- Bindery
- Mailing
- Delivery
- Hold

## Card density rules
One card = one actionable production unit.
That likely means **job item**, not just top-level job.

Cards need:
- strong title
- small metadata
- visible due pressure
- owner avatar/initials
- one-click open

## Empty state behavior
If a queue has no work:
- show zero count
- no giant empty paragraph
- keep board stable

## Manager shortcuts on board
Each queue column header should support:
- count
- due today count
- late count
- filter to queue-only

Optional later:
- bulk assign
- drag between queues

---

# 5) Nav / IA changes in plain English

## Current problem
The current internal experience says “Shop Floor,” but the first things shown are intake tools. That is mixed intent and weak information architecture.

## Fix
- `/dashboard` becomes **operations-first**
- `/dashboard/intake` becomes **sales/CSR-first**
- Quotes remain a separate pipeline
- Estimator remains a tool, not the intake homepage

## Recommended labels
- `Shop Floor`
- `Intake`
- `Quotes`
- `Customers`
- `Estimator`
- `Pricing`
- `Invoices`
- `Settings`

If space is tight, collapse Pricing under Estimator later. Do not collapse Intake into Shop Floor.

---

# Fast implementation plan

## Phase 1 — low-risk restructure
1. Add `Intake` nav item.
2. Create `/dashboard/intake` route.
3. Move `CsrChatPanel` and `BotIntakePanel` there.
4. Change `/dashboard` header/actions to shop-floor language.
5. Add KPI row above queue content.
6. Add `Board/Table` toggle, even if first version uses lightweight grouped lists.

## Phase 2 — production-first polish
1. Group items by queue.
2. Add risk badges and due buckets.
3. Add queue counts and blocked counts.
4. Make unassigned and late filters one click.

## Phase 3 — pipeline tightening
1. Formalize intake statuses.
2. Add quote conversion states.
3. Add quick-order shortcut from prior quotes/jobs.
4. Add internal-job-specific fields and reports.

---

# Acceptance criteria

## `/dashboard`
- shows floor KPIs first
- shows queue-driven work next
- does not show quote/intake workbenches inline
- supports manager scan in under 10 seconds

## `/dashboard/intake`
- supports quote-first, quick-order, and internal-job modes
- keeps transcript and structured spec state together
- makes estimator proposal + conversion path obvious

## Action model
- each top action has a distinct outcome
- labels match real operator intent
- internal work does not pollute quote pipeline

## Nav
- internal users can understand where to go without training
- workflow order is obvious from nav order

---

# Blunt recommendation
Do **not** keep trying to make one page serve CSR intake and live floor control. That is the design bug.

Split the surfaces:
- **Dashboard = run the plant**
- **Intake = scope and sell the work**
- **Quotes = manage approvals/conversion**

That is the clean line.
