export type DeptInfo = {
  id: string;
  name: string;
  position: 'before-press' | 'after-finishing' | 'end';
  color_index?: number;
};

export function deriveRoute(
  qty: number,
  size: string,
  finishing: string[],
  extraDepts: DeptInfo[] = []
): string[] {
  const w = parseFloat(size?.split('x')?.[0]) || 0;
  const h = parseFloat(size?.split('x')?.[1]) || 0;
  const maxDim = Math.max(w, h);

  let press = 'Digital press';
  if (maxDim > 13) press = 'Wide format';
  else if (qty > 1000) press = 'Offset press';

  const beforePress = extraDepts.filter(d => d.position === 'before-press').map(d => d.name);
  const afterFinishing = extraDepts.filter(d => d.position === 'after-finishing').map(d => d.name);
  const endStages = extraDepts.filter(d => d.position === 'end').map(d => d.name);

  const stages: string[] = ['Prepress'];
  stages.push(...beforePress);
  stages.push(press);
  if (finishing && finishing.length > 0) stages.push('Finishing');
  stages.push(...afterFinishing);
  if (endStages.length > 0) stages.push(...endStages);
  else stages.push('Ship / Pickup');

  return stages;
}

const FIXED_COLORS: Record<string, { bg: string; text: string }> = {
  'Prepress':      { bg: '#FAEEDA', text: '#633806' },
  'Digital press': { bg: '#E6F1FB', text: '#0C447C' },
  'Offset press':  { bg: '#E6F1FB', text: '#0C447C' },
  'Wide format':   { bg: '#E6F1FB', text: '#0C447C' },
  'Finishing':     { bg: '#FAECE7', text: '#712B13' },
  'Ship / Pickup': { bg: '#F1EFE8', text: '#444441' },
};

const COLOR_RAMPS = [
  { bg: '#FAEEDA', text: '#633806' },
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#FAECE7', text: '#712B13' },
  { bg: '#FBEAF0', text: '#72243E' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#F1EFE8', text: '#444441' },
  { bg: '#EAF3DE', text: '#27500A' },
  { bg: '#FCEBEB', text: '#791F1F' },
];

export { COLOR_RAMPS };

export function getStageColor(label: string, depts: DeptInfo[] = []): { bg: string; text: string } {
  if (FIXED_COLORS[label]) return FIXED_COLORS[label];
  const dept = depts.find(d => d.name === label);
  if (dept && dept.color_index !== undefined) return COLOR_RAMPS[dept.color_index] || COLOR_RAMPS[6];
  return COLOR_RAMPS[6];
}
