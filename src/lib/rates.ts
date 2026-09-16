export interface RateEntry {
  dayRate: number | null;
  startDate: Date | string;
}

/** The rate in effect on the given date: the most recent entry whose startDate is on or before it. */
export function rateAt(rates: RateEntry[], date: Date | string): number | null {
  const target = new Date(date).getTime();
  let current: number | null | undefined;
  for (const r of rates) {
    if (new Date(r.startDate).getTime() <= target) {
      current = r.dayRate;
    } else {
      break;
    }
  }
  return current ?? null;
}

/** The rate in effect right now, for display purposes (e.g. admin lists). */
export function currentRate(rates: RateEntry[]): number | null {
  return rateAt(rates, new Date());
}
