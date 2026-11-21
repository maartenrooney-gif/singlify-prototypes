// Swimlane geometry, in em units. Lane bands are contiguous; each lane is as tall as its tallest
// card plus padding for the arrows. Card sizes are fixed per kind so arrows are computed at build time.
import type { Flow, Lane } from './data';

export const LABEL_W = 8;
export const COL_W = 12.4;
export const CARD_W = 11.2;
export const S_INSET = 1.1; // Singlify cards are narrower, leaving room for the spine arrow
export const PAD = 2.1; // space above and below cards inside a lane (arrows live here)
export const CARD_H: Record<Lane, number> = { member: 5.6, team: 10.6, singlify: 7.8, partner: 6.4 };

export interface Arrow { d: string; kind: 'blue' | 'grey'; dashed: boolean; spine?: boolean }

export function layout(flow: Flow) {
  const laneH = flow.lanes.map((l) => CARD_H[l] + 2 * PAD);
  const top = laneH.map((_, i) => laneH.slice(0, i).reduce((a, b) => a + b, 0));
  const row = (l: Lane) => flow.lanes.indexOf(l);
  const cardTop = (l: Lane) => top[row(l)] + PAD;
  const cardBottom = (l: Lane) => cardTop(l) + CARD_H[l];
  const gridW = flow.cols * COL_W;
  const gridH = laneH.reduce((a, b) => a + b, 0);
  const sRow = row('singlify');
  const arrows: Arrow[] = [];
  const sMid = cardTop('singlify') + CARD_H.singlify / 2;

  // Process spine: Singlify card to Singlify card
  flow.stages.slice(0, -1).forEach((s, i) => {
    const next = flow.stages[i + 1];
    const x1 = (s.colStart + s.span) * COL_W - S_INSET + 0.1;
    const x2 = next.colStart * COL_W + S_INSET - 0.1;
    arrows.push({ d: `M${x1} ${sMid} L${x2} ${sMid}`, kind: 'grey', dashed: false, spine: true });
  });

  // Hand-offs: a pair of arrows, one each way, between Singlify and each attachment
  for (const s of flow.stages) for (const a of s.attach) {
    const above = row(a.lane) < sRow;
    const cx = a.col * COL_W + COL_W / 2;
    const aEdge = above ? cardBottom(a.lane) : cardTop(a.lane);
    const sEdge = above ? cardTop('singlify') : cardBottom('singlify');
    const kind = a.lane === 'team' ? 'grey' : 'blue';
    const dashed = a.lane === 'team';
    // left: Singlify asks; right: the result comes back
    arrows.push({ d: `M${cx - 0.55} ${sEdge} L${cx - 0.55} ${aEdge}`, kind, dashed });
    arrows.push({ d: `M${cx + 0.55} ${aEdge} L${cx + 0.55} ${sEdge}`, kind, dashed });
  }
  return { gridW, gridH, laneH, arrows, row };
}
