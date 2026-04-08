'use client';

import { getStageColor, type DeptInfo } from '@/lib/routing';

export default function RouteBadge({ stages, depts = [] }: { stages: string[]; depts?: DeptInfo[] }) {
  if (!stages || stages.length === 0) return null;
  return (
    <div className="flex items-center gap-0 flex-wrap my-1">
      {stages.map((s, i) => {
        const c = getStageColor(s, depts);
        return (
          <div key={i} className="flex items-center">
            <span className="whitespace-nowrap text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>{s}</span>
            {i < stages.length - 1 && <span className="text-[11px] text-gray-400 mx-1">→</span>}
          </div>
        );
      })}
    </div>
  );
}
