export function trapezoid(
  x: number,
  a: number,
  b: number,
  c: number,
  d: number,
  floor = 0,
): number {
  let y: number;
  if (x < a || x > d) y = 0;
  else if (x < b) y = (x - a) / (b - a);
  else if (x <= c) y = 1;
  else y = (d - x) / (d - c);
  return Math.max(y, floor);
}
