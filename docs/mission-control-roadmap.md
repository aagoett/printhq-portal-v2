# PrintHQ Mission Control / Roadmap

Internal roadmap for PrintHQ execution.

## Why this page exists
PrintHQ needs a dedicated internal mission-control surface so roadmap status does not live in scattered chat threads, loose notes, or mixed dashboard UI. This page is for:
- phase sequencing
- active work
- blocked/watch items
- QA lane
- done / recently shipped
- links to relevant pages, commits, and deploy targets

## Core rule
**Estimator truth first. Intake discipline second. Customer polish third.**

If pricing truth is weak, every downstream feature becomes decorative noise.

## Phases

### Phase 1 — Internal operating system split
Separate the internal surfaces by job-to-be-done:
- Shop Floor = live execution
- Intake = CSR / quote creation
- CRM = account intelligence
- Quotes / Pricing = review and admin tools

### Phase 2 — Estimator truth + pricing control
Make route choice, worksheets, quantity breaks, and overrides operator-trustworthy.

### Phase 3 — Quote-to-job handoff + customer portal
Carry transcript, specs, files, approval status, and route intent cleanly into jobs and customer-visible states.

### Phase 4 — Production scale + stabilization
Add visible QA gates, deploy confidence, queue ownership, and exception handling so the product can run more live work safely.

## Workstreams
- CRM / Organizations
- Intake / Quote Creation
- Customer Portal
- Pricing / Estimator Truth
- Shop Floor / Execution
- QA / Stabilization

## Current known shipped anchors
- organizations + contacts scaffold
- customer portal shell / safe navigation split
- intake workspace split from the main dashboard

## Mission-control page acceptance criteria
- roadmap is phase-based, not just a long backlog
- active / blocked / QA / done are visible in one scan
- each workstream has links to relevant pages and recent commits
- deploy target is visible
- internal team can understand sequencing without extra explanation
