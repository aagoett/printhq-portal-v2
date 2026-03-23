import { ExternalLink, Link2, ListChecks, LucideIcon, Rocket, Target } from "lucide-react";
import InternalPageHeader from "@/components/InternalPageHeader";
import { phases, statusLegend, WorkstreamCard } from "./data";

const priorityStyles: Record<WorkstreamCard["priority"], string> = {
  P0: "bg-red-50 text-red-700 border-red-200",
  P1: "bg-amber-50 text-amber-700 border-amber-200",
  P2: "bg-slate-50 text-slate-700 border-slate-200",
};

function StatusPill({ status }: { status: WorkstreamCard["status"] }) {
  const style = statusLegend[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${style.color}`}
    >
      {style.label}
    </span>
  );
}

function PriorityPill({ priority }: { priority: WorkstreamCard["priority"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${priorityStyles[priority]}`}
    >
      {priority}
    </span>
  );
}

function LinkBadge({
  href,
  label,
  icon: Icon,
}: {
  href?: string;
  label: string;
  icon: LucideIcon;
}) {
  const isPlaceholder = !href || href.startsWith("(");
  return (
    <a
      href={isPlaceholder ? undefined : href}
      target={isPlaceholder ? undefined : "_blank"}
      rel="noreferrer"
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition ${
        isPlaceholder
          ? "cursor-not-allowed border-dashed border-gray-200 text-gray-400"
          : "border-gray-200 text-gray-700 hover:border-black hover:text-black"
      }`}
    >
      <Icon size={12} /> {isPlaceholder ? "TBD" : label}
    </a>
  );
}

export default function MissionControlPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <InternalPageHeader
        eyebrow="Mission Control"
        title="PrintHQ Execution Board"
        description="Internal-only roadmap of PrintHQ workstreams, phases, and acceptance criteria."
        breadcrumbs={[{ label: "Mission Control" }]}
        backHref="/dashboard"
        backLabel="Back to dashboard"
        icon={Rocket}
        sticky
      />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(statusLegend).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-xs font-semibold text-gray-500 capitalize">{key.replace("_", " ")}</p>
                <p className="text-sm text-gray-700">{value.label}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${value.color}`}
              >
                {value.label}
              </span>
            </div>
          ))}
        </div>

        {phases.map((phase) => {
          const statusCounts = phase.streams.reduce<Record<string, number>>((acc, ws) => {
            acc[ws.status] = (acc[ws.status] || 0) + 1;
            return acc;
          }, {});

          return (
            <section
              key={phase.id}
              className="rounded-3xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
                    {phase.horizon}
                  </p>
                  <h2 className="text-2xl font-bold text-gray-900">{phase.title}</h2>
                  <p className="mt-1 text-sm text-gray-600">{phase.summary}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
                  <span className="rounded-full bg-gray-100 px-3 py-1">{phase.streams.length} streams</span>
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <span key={status} className="rounded-full bg-gray-50 px-3 py-1 capitalize">
                      {status.replace("_", " ")}: {count}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 px-6 py-6 lg:grid-cols-2">
                {phase.streams.map((ws) => (
                  <article
                    key={`${phase.id}-${ws.stream}-${ws.title}`}
                    className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-[0.16em]">
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-700">{ws.stream}</span>
                          <PriorityPill priority={ws.priority} />
                          <StatusPill status={ws.status} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{ws.title}</h3>
                          {ws.summary && (
                            <p className="text-sm text-gray-600">{ws.summary}</p>
                          )}
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                            Owner: {ws.owner}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <LinkBadge href={ws.proofLink} label="Proof" icon={Link2} />
                        <LinkBadge href={ws.deployLink} label="Deploy" icon={ExternalLink} />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <Target size={16} /> Acceptance criteria
                        </div>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700">
                          {ws.acceptance.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-400" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <ListChecks size={16} /> Next actions
                        </div>
                        <ul className="mt-2 space-y-1 text-sm text-gray-700">
                          {ws.actions.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-400" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
