export const DAY_MS = 86_400_000;
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

export function koreaDate(value: Date | string): string {
  return new Date(new Date(value).getTime() + KOREA_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}
