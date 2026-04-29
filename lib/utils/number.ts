export function roundTo(num: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(num * factor) / factor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function toPercent(decimalValue: number): number {
  return decimalValue * 100;
}
