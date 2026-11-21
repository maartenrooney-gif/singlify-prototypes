import connectorsRaw from '../data/connectors.json';
import flowsRaw from '../data/flows.json';
import openItemsRaw from '../data/open-items.json';

export type Lane = 'member' | 'team' | 'singlify' | 'partner';
export const LANE_ORDER: Lane[] = ['member', 'team', 'singlify', 'partner'];

export interface Connector { name: string; category: string; does: string; step: string; route: string; buy: string }
export interface OpenItem { id: string; title: string; short: string; detail: string; where: string }
export interface Attachment {
  lane: Exclude<Lane, 'singlify'>;
  name?: string;
  text?: string;
  human?: string;
  manual?: boolean;
  col: number; // absolute column index (0-based) in the flow
}
export interface Stage { id: string; title: string; note?: string; colStart: number; span: number; attach: Attachment[] }
export interface Flow {
  key: string;
  stages: Stage[];
  cols: number;
  lanes: Lane[]; // lanes present, in display order
  bands?: { label: string; from: number; to: number }[]; // stage indexes
  notes: { item?: string; text?: string }[];
}

export const connectors = connectorsRaw.connectors as Connector[];
export const routes = connectorsRaw.routes as Record<string, string>;
export const choices = connectorsRaw.choices;
export const appExamples = connectorsRaw.appExamples;
export const useCases = connectorsRaw.useCases as Record<string, any>;
export const lanes = flowsRaw.lanes as Record<Lane, { label: string; sub: string }>;
export const humanSteps = flowsRaw.humanSteps as Record<string, { short: string; t: string; d: string }>;
export const openItems = openItemsRaw as OpenItem[];
export const openItem = (id: string): OpenItem => {
  const it = openItems.find((o) => o.id === id);
  if (!it) throw new Error(`Unknown open item: ${id}`);
  return it;
};

function resolveFlow(key: string): Flow {
  const def = (flowsRaw.flows as any)[key];
  let col = 0;
  const stages: Stage[] = def.stages.map((id: string) => {
    const s = (flowsRaw.stages as any)[id];
    if (!s) throw new Error(`Flow ${key}: unknown stage ${id}`);
    const counts: Record<string, number> = {};
    const attach: Attachment[] = s.attach.map((a: any) => {
      const i = (counts[a.lane] = (counts[a.lane] ?? -1) + 1);
      return { ...a, col: col + i };
    });
    const span = Math.max(1, ...Object.values(counts).map((n) => n + 1));
    const stage = { id, title: s.title, note: s.note, colStart: col, span, attach };
    col += span;
    return stage;
  });
  const present = new Set<Lane>(['singlify']);
  stages.forEach((s) => s.attach.forEach((a) => present.add(a.lane)));
  return {
    key, stages, cols: col,
    lanes: LANE_ORDER.filter((l) => present.has(l)),
    bands: def.bands, notes: def.notes ?? [],
  };
}

export const FLOW_KEYS = ['borrow', 'join', 'loan'] as const;
export const flows: Record<string, Flow> = Object.fromEntries(FLOW_KEYS.map((k) => [k, resolveFlow(k)]));

// ---- Build-time validation: fail loudly rather than ship inconsistent content ----
function validate() {
  const errors: string[] = [];
  const names = new Set(connectors.map((c) => c.name));
  for (const [id, s] of Object.entries(flowsRaw.stages as Record<string, any>)) {
    for (const a of s.attach) {
      if (a.lane === 'partner' && !names.has(a.name)) errors.push(`Stage ${id}: partner "${a.name}" is not in connectors.json`);
      if (a.lane === 'team' && !humanSteps[a.human]) errors.push(`Stage ${id}: unknown human step "${a.human}"`);
      if (a.lane !== 'team' && !a.text) errors.push(`Stage ${id}: ${a.lane} attachment has no text`);
    }
  }
  const humanTexts = new Set(Object.values(humanSteps).map((h) => h.t));
  for (const [k, uc] of Object.entries(useCases)) {
    for (const h of uc.human) {
      if (h.t !== 'Nothing at this stage' && !humanTexts.has(h.t)) errors.push(`Use case ${k}: human step "${h.t}" is not in flows.json humanSteps`);
    }
    for (const p of uc.plug) if (p.name !== 'CUApps' && !names.has(p.name)) errors.push(`Use case ${k}: unknown partner ${p.name}`);
  }
  for (const key of FLOW_KEYS) {
    const f = flows[key];
    for (const s of f.stages) {
      const cols = new Set(s.attach.filter((a) => a.lane === 'member').map((a) => a.col));
      if (s.attach.some((a) => a.lane === 'team' && cols.has(a.col))) {
        console.warn(`[swimlane] Stage ${s.id}: member and team cards share a column; member arrows will pass behind the team card.`);
      }
    }
    for (const n of f.notes) if (n.item) openItem(n.item);
  }
  for (const c of connectors) if (!routes[c.route]) errors.push(`Connector ${c.name}: unknown route ${c.route}`);
  if (errors.length) throw new Error('Content validation failed:\n- ' + errors.join('\n- '));
}
validate();

export const categories = ['All', ...Array.from(new Set(connectors.map((c) => c.category)))];
export const routeFilters = ['All', 'Included', 'Self-serve', 'Contract'];
