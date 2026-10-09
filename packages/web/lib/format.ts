/** YYYYMMDD → YYYY-MM-DD。 */
export function formatDate(date: number): string {
  const year = Math.floor(date / 10000);
  const month = String(Math.floor((date % 10000) / 100)).padStart(2, "0");
  const day = String(date % 100).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** YYYY-MM-DD（或 YYYYMMDD）→ YYYYMMDD。 */
export function toDateNumber(value: string): number {
  return Number(value.replace(/-/g, "").slice(0, 8));
}

export function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function formatMoney(value: number): string {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}

/** YYYYMMDD → 时间轴的 UTC 毫秒。 */
export function dateToUtc(date: number): number {
  const year = Math.floor(date / 10000);
  const month = Math.floor((date % 10000) / 100);
  const day = date % 100;
  return Date.UTC(year, month - 1, day);
}
