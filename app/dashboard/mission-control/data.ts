export type WorkstreamStatus =
  | "backlog"
  | "ready"
  | "in_progress"
  | "blocked"
  | "qa"
  | "done";

export type WorkstreamCard = {
  stream: string;
  title: string;
  priority: "P0" | "P1" | "P2";
  status: WorkstreamStatus;
  owner: string;
  summary?: string;
  acceptance: string[];
  actions: string[];
  proofLink?: string;
  deployLink?: string;
};

export type Phase = {
  id: string;
  title: string;
  horizon: string;
  summary: string;
  streams: WorkstreamCard[];
};

export const statusLegend: Record<WorkstreamStatus, { label: string; color: string; }> = {
  backlog: { label: "Backlog", color: "bg-gray-100 text-gray-700 border-gray-200" },
  ready: { label: "Ready", color: "bg-sky-50 text-sky-800 border-sky-200" },
  in_progress: { label: "In Progress", color: "bg-blue-50 text-blue-800 border-blue-200" },
  blocked: { label: "Blocked", color: "bg-red-50 text-red-700 border-red-200" },
  qa: { label: "QA", color: "bg-amber-50 text-amber-800 border-amber-200" },
  done: { label: "Done", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

export const phases: Phase[] = [
  {
    id: "now",
    title: "Phase 1 — Stabilize and prove the critical path",
    horizon: "Current sprint",
    summary: "Lock estimator truth, harden proof gates, and make the shop floor view operator-usable.",
    streams: [
      {
        stream: "Pricing",
        title: "Estimator worksheet + route comparison clarity",
        priority: "P0",
        status: "in_progress",
        owner: "althea",
        summary: "Expose why the route won, show worksheet math, and add sanity flags before quotes leave the nest.",
        acceptance: [
          "Route comparison visible (winner vs alt) with sheet size, n-up, and cost deltas",
          "Worksheet breakdown shows paper, press, setup, finishing, mailing, overs/waste",
          "Sanity/guardrail flags fire on abnormal unit costs or route swings",
        ],
        actions: [
          "Ship route comparison block into estimator output",
          "Render worksheet rows with per-component totals",
          "Add warning badges for odd per-piece math and silent fallbacks",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
      {
        stream: "Shop Floor",
        title: "Queue board default + due-risk visibility",
        priority: "P0",
        status: "ready",
        owner: "prism",
        summary: "Board-first view grouped by queue with late/due-today highlights and unassigned filter.",
        acceptance: [
          "Board view is default and grouped by current queue",
          "Board/Table toggle persists selection",
          "Late/due-today badges and unassigned filter available at top of board",
        ],
        actions: [
          "Stand up queue columns (Prepress, Press, Bindery, Mailing, Delivery, Hold)",
          "Add due pressure + rush chips on cards",
          "Surface unassigned + blocked counters above the board",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
      {
        stream: "Intake",
        title: "Dedicated intake surface & clear CTAs",
        priority: "P1",
        status: "in_progress",
        owner: "prism",
        summary: "Move CSR chat + bot intake + quick order into /dashboard/intake so dashboard stays floor-first.",
        acceptance: [
          "CSR chat + Bot Intake + Quick Order live on /dashboard/intake",
          "+ New Order CTA on /dashboard routes to intake (not mixed into shop floor)",
          "Intake modes: New Quote, Quick Order, Internal Job are explicit",
        ],
        actions: [
          "Verify intake workspace parity with dashboard modal",
          "Wire CTA on dashboard to intake",
          "Keep job creation + uploads flowing to same Supabase tables",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
      {
        stream: "Portal",
        title: "Customer portal clarity",
        priority: "P1",
        status: "ready",
        owner: "main",
        summary: "Home clarity, brand-forward hero, and separate entry points for quotes vs invoices.",
        acceptance: [
          "Quotes and invoices have distinct navigation targets",
          "Brand logo/hero sizing consistent (post BUG-0006 fix)",
          "Active jobs + quotes waiting counts stay accurate",
        ],
        actions: [
          "Add quotes/invoices quick links in home cards",
          "Keep hero/logo sizing consistent across tenants",
          "Check customer-visible counts vs Supabase queries",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
      {
        stream: "CRM",
        title: "Identity + org/contact hygiene",
        priority: "P1",
        status: "backlog",
        owner: "main",
        summary: "Tighten account/brand mapping and dedupe for cleaner jobs and billing.",
        acceptance: [
          "Profiles + organizations deduped and linked to brands",
          "Guest email flow maps back to existing profiles when present",
          "Customer class drives default pricing profile reliably",
        ],
        actions: [
          "Design org/contact merge rules",
          "Backfill customer_class defaults where missing",
          "Align orders/jobs brand linkage with CRM tables",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
      {
        stream: "QA/Stabilization",
        title: "Proof gating + due-date inline edit + pricing consistency",
        priority: "P0",
        status: "qa",
        owner: "bertha",
        summary: "Close the open P0/P1 hardening items from the bug tracker (BUG-0007/8/9).",
        acceptance: [
          "Per-item proof approval required before production (BUG-0007)",
          "Due date inline edit validates, saves, and logs audits (BUG-0008)",
          "Canonical pricing totals consistent list vs drilldown (BUG-0009)",
        ],
        actions: [
          "Finish strict proof gating per item and add audit log",
          "Harden due-date edit flow and validation",
          "Normalize invoice/quote source of truth for totals",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
    ],
  },
  {
    id: "next",
    title: "Phase 2 — Workflow clarity & quote/job integrity",
    horizon: "Next up",
    summary: "Clarify intake status model, clean quote outputs, and make the board actionable by queue.",
    streams: [
      {
        stream: "Intake",
        title: "Intake status model",
        priority: "P1",
        status: "ready",
        owner: "main",
        summary: "Every intake sits in Needs Info → Quote Ready → Quote Sent → Approved → Converted/Closed.",
        acceptance: [
          "Status chips visible in intake workspace",
          "Quote Sent/Approved states sync to quote pipeline",
          "Closed Lost keeps transcript + files attached",
        ],
        actions: [
          "Add intake_status column and UI chips",
          "Wire status transitions to quotes/jobs",
          "Add quick filters by status",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
      {
        stream: "Pricing",
        title: "Quote breakdown + PDF clarity",
        priority: "P1",
        status: "ready",
        owner: "althea",
        summary: "Make quote outputs defendable with route rationale and worksheet excerpts.",
        acceptance: [
          "Quote PDF shows winner vs alt route context",
          "Line items align with worksheet totals",
          "Warnings/badges surface any assumptions",
        ],
        actions: [
          "Inject comparison summary into quote view/PDF",
          "Reuse worksheet rows for quote breakdown",
          "Add flagging for missing specs/assumptions",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
      {
        stream: "Shop Floor",
        title: "Job/Item board actions by queue",
        priority: "P1",
        status: "backlog",
        owner: "woody",
        summary: "Card-level owner assignment, rush, and next-step actions without opening drilldown.",
        acceptance: [
          "Assign/claim from board",
          "Rush + due badges editable inline",
          "Queue filters + per-queue counts stay live",
        ],
        actions: [
          "Add inline owner select on cards",
          "Add rush toggle + due picker",
          "Refine queue filters and counters",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
      {
        stream: "CRM",
        title: "Customer/brand merge + approvals pipeline",
        priority: "P2",
        status: "backlog",
        owner: "main",
        summary: "Clean merges, quote approval tracking, and linkages back to CRM records.",
        acceptance: [
          "Merge flow for duplicate customers/brands",
          "Quote approval state stored on CRM record",
          "Emails map back to primary org/contact",
        ],
        actions: [
          "Design merge UX + safety rails",
          "Store approval decisions on org/contact",
          "Normalize email -> org/contact resolution",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
      {
        stream: "QA/Stabilization",
        title: "Audit + alerts",
        priority: "P2",
        status: "backlog",
        owner: "bertha",
        summary: "Alerting on failed writes, proof mismatches, and SLA breaches.",
        acceptance: [
          "Audit log coverage for job/item/quote writes",
          "Alerts for failed proof gating / storage errors",
          "SLA breach notifications for due-today/late",
        ],
        actions: [
          "Define audit schema and retention",
          "Hook Supabase triggers to notification channel",
          "Add SLA breach watcher",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
    ],
  },
  {
    id: "later",
    title: "Phase 3 — Scale & automation",
    horizon: "Later",
    summary: "Systemize CRM, automate ops, and prep for customer-facing extensions.",
    streams: [
      {
        stream: "Portal",
        title: "Customer self-serve upgrades",
        priority: "P2",
        status: "backlog",
        owner: "prism",
        summary: "Let customers reorder from history, request proofs, and view asset library.",
        acceptance: [
          "Reorder from prior jobs/quotes",
          "Proof request/approval self-serve",
          "Asset library surfaced in portal",
        ],
        actions: [
          "Design reorder flow from history",
          "Expose proofs/messages cleanly",
          "Add asset library surfacing",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
      {
        stream: "Intake",
        title: "Automation hooks",
        priority: "P2",
        status: "backlog",
        owner: "woody",
        summary: "Auto-extract specs from uploads and map to estimator fields.",
        acceptance: [
          "PDF extraction of trim/page count feeds intake",
          "Auto-suggest estimator fields from transcript",
          "Transcript/specs save alongside quote/job",
        ],
        actions: [
          "Wire PDF parser for trim/page count",
          "Map Q&A to estimator payload",
          "Persist transcript/specs on job record",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
      {
        stream: "Pricing",
        title: "Catalog/admin surfaces",
        priority: "P2",
        status: "backlog",
        owner: "woody",
        summary: "Paper catalog import/update, pricing overrides, and preset management.",
        acceptance: [
          "Paper catalog import/update flows",
          "Customer-specific pricing overrides surfaced",
          "Preset/route defaults manageable by admins",
        ],
        actions: [
          "Build catalog import/update UI",
          "Expose overrides with audit",
          "Preset + route default admin panel",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
      {
        stream: "QA/Stabilization",
        title: "Reliability budget",
        priority: "P2",
        status: "backlog",
        owner: "bertha",
        summary: "Chaos drills, backups, and env drift detection.",
        acceptance: [
          "Backups + restore drills scheduled",
          "Env drift detection between prod/stage",
          "Incident runbooks stored with proof links",
        ],
        actions: [
          "Schedule chaos/backups cadence",
          "Create drift checks",
          "Publish incident/runbook index",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
      {
        stream: "CRM",
        title: "Lifecycle + revenue ops",
        priority: "P2",
        status: "backlog",
        owner: "main",
        summary: "Pipeline reporting, upsell signals, and SLA monitoring for customers.",
        acceptance: [
          "Quote-to-win + job cycle time reports",
          "Upsell signals from product mix",
          "SLA monitors for key customers",
        ],
        actions: [
          "Define reporting queries",
          "Add mix/upsell signal logic",
          "Wire SLA monitors to alerts",
        ],
        proofLink: "(proof link)",
        deployLink: "(deploy link)",
      },
    ],
  },
];
