import { AlertTriangle, Bot, Briefcase, Building2, CheckCircle2, CircleDashed, ClipboardCheck, Gauge, Globe, Layers3, LayoutDashboard, Link2, Rocket, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const PRINTHQ_REPO_URL = 'https://github.com/aagoett/printhq-portal-v2';
export const PRINTHQ_DEPLOY_URL = 'https://printhq-portal-v2.vercel.app';

export type MissionLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type WorkstreamCard = {
  key: string;
  label: string;
  icon: LucideIcon;
  phase: string;
  status: 'active' | 'next' | 'watch' | 'qa' | 'done';
  objective: string;
  now: string[];
  risks?: string[];
  links?: MissionLink[];
};

export type MissionPhase = {
  key: string;
  label: string;
  theme: string;
  goal: string;
  exitCriteria: string[];
  workstreams: string[];
};

export const missionSummary = {
  title: 'PrintHQ Mission Control',
  strapline: 'Run PrintHQ like an internal build-and-ship operation, not a loose pile of features.',
  operatingRule: 'Estimator truth first. Intake discipline second. Customer polish only after internal execution stays reliable.',
};

export const missionPhases: MissionPhase[] = [
  {
    key: 'phase-1',
    label: 'Phase 1 · Internal operating system split',
    theme: 'Separate the surfaces so staff stop context-switching between intake, production, and reference work.',
    goal: 'Make Shop Floor, Intake, Quotes, CRM, and admin surfaces feel like distinct tools with clear intent.',
    exitCriteria: [
      'Shop Floor dashboard is execution-first and queue-driven.',
      'Intake has dedicated quote / quick-order / internal-job modes.',
      'CRM / Organizations lives as a separate account system, not buried under customers.',
    ],
    workstreams: ['intake', 'portal', 'crm', 'shop-floor'],
  },
  {
    key: 'phase-2',
    label: 'Phase 2 · Estimator truth + pricing control',
    theme: 'Lock the math before scaling operator workflow or customer self-service.',
    goal: 'Expose route comparisons, worksheet logic, pricing profiles, overrides, and quote-ready outputs operators can defend.',
    exitCriteria: [
      'Winning route is explained with line-item cost visibility.',
      'Quantity break behavior is stable and reviewable.',
      'Customer-specific pricing overrides are manageable without hidden math.',
    ],
    workstreams: ['pricing', 'intake'],
  },
  {
    key: 'phase-3',
    label: 'Phase 3 · Quote-to-job handoff + customer portal',
    theme: 'Carry clean intake data into approvals, jobs, files, and customer communication.',
    goal: 'Turn draft quotes into approved work without losing transcript, specs, artwork, or route intent.',
    exitCriteria: [
      'Quotes move cleanly into jobs and production review.',
      'Portal exposes the right customer-safe status, messages, and approvals.',
      'Internal and customer states stay aligned.',
    ],
    workstreams: ['portal', 'intake', 'shop-floor'],
  },
  {
    key: 'phase-4',
    label: 'Phase 4 · Production scale + stabilization',
    theme: 'Run the plant off the software without it becoming fragile.',
    goal: 'Tighten queue ownership, exception handling, QA gates, and deploy confidence so PrintHQ can take more live work.',
    exitCriteria: [
      'Queue board highlights late, blocked, and unassigned work fast.',
      'QA / stabilization has a visible gate before calling a milestone done.',
      'Release trail links code, deploys, and operator-facing change impact.',
    ],
    workstreams: ['shop-floor', 'qa'],
  },
];

export const missionWorkstreams: WorkstreamCard[] = [
  {
    key: 'crm',
    label: 'CRM / Organizations',
    icon: Building2,
    phase: 'Phase 1',
    status: 'active',
    objective: 'Turn PrintHQ into an account system with organizations, contacts, and relationship context.',
    now: [
      'Organizations + contacts scaffold exists and needs progression into detail views and activity timelines.',
      'Keep account ownership, buyer mapping, and follow-up planning separate from raw customer rows.',
    ],
    risks: ['If CRM stays shallow, sales context dies between quotes and follow-up.'],
    links: [
      { label: 'Organizations', href: '/dashboard/organizations' },
      { label: 'CRM plan', href: `${PRINTHQ_REPO_URL}/blob/main/CRM_PLAN.md`, external: true },
      { label: 'CRM scaffold commit', href: `${PRINTHQ_REPO_URL}/commit/5291747`, external: true },
    ],
  },
  {
    key: 'intake',
    label: 'Intake / Quote Creation',
    icon: Bot,
    phase: 'Phase 1 → Phase 2',
    status: 'active',
    objective: 'Move vague inbound requests into structured, estimate-ready work without trashing the shop-floor screen.',
    now: [
      'Dedicated intake workspace exists with New Quote, Quick Order, and Internal Job modes.',
      'CSR chat, structured builder, and multi-item quick order need to stay aligned around one intake status model.',
    ],
    risks: ['If intake status is loose, quotes and jobs become ambiguous handoffs instead of controlled work.'],
    links: [
      { label: 'Intake workspace', href: '/dashboard/intake' },
      { label: 'Dashboard split spec', href: `${PRINTHQ_REPO_URL}/blob/main/docs/printhq-dashboard-split.md`, external: true },
      { label: 'Intake/portal framing commit', href: `${PRINTHQ_REPO_URL}/commit/7de5a9b`, external: true },
    ],
  },
  {
    key: 'portal',
    label: 'Customer Portal',
    icon: Globe,
    phase: 'Phase 3',
    status: 'next',
    objective: 'Expose customer-safe jobs, quotes, invoices, and messages without leaking internal production noise.',
    now: [
      'Portal shell and customer-safe navigation are in place.',
      'Next step is preserving quote approval and production status fidelity as internal workflows harden.',
    ],
    links: [
      { label: 'Customer dashboard', href: '/dashboard' },
      { label: 'Portal shell commit', href: `${PRINTHQ_REPO_URL}/commit/953a039`, external: true },
      { label: 'Customer jobs feed commit', href: `${PRINTHQ_REPO_URL}/commit/64df7d8`, external: true },
    ],
  },
  {
    key: 'pricing',
    label: 'Pricing / Estimator Truth',
    icon: Gauge,
    phase: 'Phase 2',
    status: 'active',
    objective: 'Make route choice, quantity breaks, stock logic, and customer overrides inspectable enough for operators to trust.',
    now: [
      'Estimator, pricing profiles, and override plumbing exist.',
      'Next is worksheet-level visibility, route comparison clarity, and sanity warnings before scaling customer polish.',
    ],
    risks: ['Bad quote math contaminates every downstream workflow and destroys trust.'],
    links: [
      { label: 'Estimator', href: '/dashboard/pricing/estimator' },
      { label: 'Pricing admin', href: '/dashboard/pricing' },
      { label: 'Mission-control roadmap doc', href: `${PRINTHQ_REPO_URL}/blob/main/docs/mission-control-roadmap.md`, external: true },
    ],
  },
  {
    key: 'shop-floor',
    label: 'Shop Floor / Execution',
    icon: LayoutDashboard,
    phase: 'Phase 1 → Phase 4',
    status: 'active',
    objective: 'Run live production by queue, ownership, and due risk instead of letting the dashboard act like a junk drawer.',
    now: [
      'Dashboard is being repositioned into a production-first command center.',
      'Need board/table control, due-risk scan, blocked work, and queue-based management shortcuts.',
    ],
    risks: ['If Shop Floor keeps intake clutter, operators lose signal and managers miss exceptions.'],
    links: [
      { label: 'Shop Floor dashboard', href: '/dashboard' },
      { label: 'Jobs', href: '/dashboard/jobs' },
      { label: 'Dashboard split spec', href: `${PRINTHQ_REPO_URL}/blob/main/docs/printhq-dashboard-split.md`, external: true },
    ],
  },
  {
    key: 'qa',
    label: 'QA / Stabilization',
    icon: ShieldCheck,
    phase: 'Phase 4',
    status: 'watch',
    objective: 'Stop calling things done before route logic, job handoff, and deploy behavior survive real use.',
    now: [
      'Track validation, regression checks, and release readiness as a visible lane.',
      'Tie QA to deploys and shipped commits so ops can audit what changed and why.',
    ],
    risks: ['No visible QA lane means fragile releases and silent regressions in revenue-critical flows.'],
    links: [
      { label: 'Deploy target', href: PRINTHQ_DEPLOY_URL, external: true },
      { label: 'Repo commits', href: `${PRINTHQ_REPO_URL}/commits/main`, external: true },
    ],
  },
];

export const missionLanes = {
  active: [
    'Finish the mission-control / roadmap surface so execution status is explicit.',
    'Keep Intake, CRM, and Shop Floor separated by job-to-be-done instead of one bloated dashboard.',
    'Push estimator transparency before customer-facing polish.',
  ],
  blocked: [
    'Final bleed / gutter / imposition defaults still need product-level policy, not assumptions.',
    'Paper catalog import shape and markup governance are not yet treated as locked operational truth.',
    'Quote-to-job integrity still depends on tightening the acceptance path and carried metadata.',
  ],
  qa: [
    'Validate route winners against known print jobs and edge quantities.',
    'Regression-check customer-safe portal states after internal navigation or status changes.',
    'Audit queue views for late, blocked, unassigned, and due-today visibility before rollout.',
  ],
  done: [
    'Organizations + contacts module scaffold landed.',
    'Customer portal shell and safe navigation were split from internal surfaces.',
    'Dedicated Intake workspace was created so shop-floor ops can stop wearing CSR clutter.',
  ],
};

export const missionReleaseLinks: MissionLink[] = [
  { label: 'Production deploy', href: PRINTHQ_DEPLOY_URL, external: true },
  { label: 'GitHub repo', href: PRINTHQ_REPO_URL, external: true },
  { label: 'Recent commits', href: `${PRINTHQ_REPO_URL}/commits/main`, external: true },
  { label: 'Mission Control route', href: '/dashboard/mission-control' },
];

export const missionStatusMeta = {
  active: { label: 'Active now', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: Rocket },
  next: { label: 'Next up', className: 'bg-violet-50 text-violet-700 border-violet-200', icon: CircleDashed },
  watch: { label: 'Blocked / watch', className: 'bg-amber-50 text-amber-800 border-amber-200', icon: AlertTriangle },
  qa: { label: 'QA lane', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ClipboardCheck },
  done: { label: 'Done', className: 'bg-gray-100 text-gray-700 border-gray-200', icon: CheckCircle2 },
};

export const missionBoardSummary = [
  {
    label: 'Phases',
    value: missionPhases.length,
    note: 'Internal roadmap stages from surface split to stabilized production scale.',
    icon: Layers3,
  },
  {
    label: 'Workstreams',
    value: missionWorkstreams.length,
    note: 'Named tracks covering CRM, Intake, Portal, Pricing, Shop Floor, and QA.',
    icon: Briefcase,
  },
  {
    label: 'Release trail',
    value: '4 links',
    note: 'Pages, repo commits, and deploy entry points tied to the roadmap.',
    icon: Link2,
  },
];
