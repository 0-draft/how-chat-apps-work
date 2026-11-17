export function clamp(i: number, count: number): number {
  return Math.max(0, Math.min(count - 1, i));
}

export function stepFromHash(hash: string, id: string): number | undefined {
  const m = new RegExp(`^#${id}-(\\d+)$`).exec(hash);
  return m?.[1] ? Number(m[1]) - 1 : undefined;
}

export function activeCard(tops: number[], line: number): number | undefined {
  let found: number | undefined;
  tops.forEach((top, i) => {
    if (top <= line) found = i;
  });
  return found;
}
