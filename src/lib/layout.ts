import type { Sequence } from "./sequences/types";

export const COL_W = 128;
export const HEAD_H = 60;
export const ROW_H = 44;
export const PAD = 20;
export const SELF_LABEL_W = 96;

export interface ArrowGeom {
  x1: number;
  x2: number;
  y: number;
  self: boolean;
}

export interface Layout {
  width: number;
  height: number;
  columns: Map<string, number>;
  arrows: ArrowGeom[];
}

export function layout(seq: Sequence): Layout {
  const columns = new Map<string, number>();
  for (const [i, a] of seq.actors.entries()) columns.set(a.id, PAD + COL_W * i + COL_W / 2);

  const arrows = seq.steps.map((s, i): ArrowGeom => {
    const x1 = columns.get(s.from);
    const x2 = columns.get(s.to);
    if (x1 === undefined || x2 === undefined) {
      throw new Error(`${seq.id}: step ${i} references an unknown actor`);
    }
    const y = HEAD_H + PAD + ROW_H * i + ROW_H / 2;
    if (s.kind === "lost") return { x1, x2: x1 + (x2 - x1) * 0.55, y, self: false };
    return { x1, x2, y, self: s.from === s.to };
  });

  const last = seq.actors.at(-1)?.id;
  const selfOnLast = seq.steps.some((s) => s.kind === "self" && s.from === last);

  return {
    width: PAD * 2 + COL_W * seq.actors.length + (selfOnLast ? SELF_LABEL_W : 0),
    height: HEAD_H + PAD * 2 + ROW_H * seq.steps.length,
    columns,
    arrows,
  };
}
