import { YYYYMMDD } from "@core/util";

export const DAILY_FEED_HOURS = [8, 12, 18] as const;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function getDailyFeedDate(now: Date): YYYYMMDD {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  return new YYYYMMDD(kst.toISOString().slice(0, 10).replaceAll("-", ""));
}

// Before the morning delivery, a manually created feed uses the morning slot.
export function getDailyFeedSlot(now: Date): 1 | 2 | 3 {
  const hour = new Date(now.getTime() + KST_OFFSET_MS).getUTCHours();
  if (hour >= DAILY_FEED_HOURS[2]) return 3;
  if (hour >= DAILY_FEED_HOURS[1]) return 2;
  return 1;
}

export function getDailyFeedExpiresAt(date: YYYYMMDD): Date {
  return new Date(`${date.add(1, "day").format()}T00:00:00+09:00`);
}
