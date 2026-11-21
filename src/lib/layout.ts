// Swimlane geometry, in em units. Fixed card size makes the arrows computable at build time.
import type { Flow, Lane } from './data';
export const LABEL_W = 7.5;
export const COL_W = 12.6;
export const CARD_W = 11.4;
export const CARD_H = 11;
export const GAP = 3.4;
export const PITCH = CARD_H + GAP;
export const INSET = (COL_W - CARD_W) / 2;

export interface Arrow { d: string; kind: 'blue' | 'grey'; dashed: boolean }

export function layout(flow: Flow) {
  const row = (l: Lane) => flow.lanes.indexOf(l);
  const gridW = flow.cols * COL_W;
  const gridH = flow.lanes.length * CARD_H + (flow.lanes.length - 1) * GAP;
  const sRow = row('singlify');
  const arrows: Arrow[] = [];
  const sTop = sRow * PITCH, sBottom = sTop + CARD_H, sMid = sTop + CARD_H / 2;

  // Process spine: Singlify card to Singlify card
  flow.stages.slice(0, -1).forEach((s, i) => {
    const next = flow.stages[i + 1];
    const x1 = (s.colStart + s.span) * COL_W - INSET;
    const x2 = next.colStart * COL_W + INSET;
    arrows.push({ d: `M${x1} ${sMid} L${x2} ${sMid}`, kind: 'grey', dashed: false });
  });

  // Hand-offs: a pair of arrows, one each way, between Singlify and each attachment
  for (const s of flow.stages) for (const a of s.attach) {
    const r = row(a.lane);
    const cx = a.col * COL_W + COL_W / 2;
    const above = r < sRow;
    const aEdge = above ? r * PITCH + CARD_H : r * PITCH;
    const sEdge = above ? sTop : sBottom;
    const kind = a.lane === 'team' ? 'grey' : 'blue';
    const dashed = a.lane === 'team';
    // left arrow: Singlify asks; right arrow: result comes back
    arrows.push({ d: `M${cx - 0.7} ${sEdge} L${cx - 0.7} ${aEdge}`, kind, dashed });
    arrows.push({ d: `M${cx + 0.7} ${aEdge} L${cx + 0.7} ${sEdge}`, kind, dashed });
  }
  return { gridW, gridH, arrows, row };
}
