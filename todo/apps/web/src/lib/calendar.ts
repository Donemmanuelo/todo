export type FreeBusyInterval = { start: Date; end: Date };

// Placeholder: return busy intervals for a user between start and end.
// In production, fetch from Google Calendar / Microsoft Graph.
export async function getUserFreeBusy(
  userId: string,
  start: Date,
  end: Date
): Promise<FreeBusyInterval[]> {
  // Demo: pretend there is a lunch block 12:00-13:00
  const lunchStart = new Date(start);
  lunchStart.setHours(12, 0, 0, 0);
  const lunchEnd = new Date(start);
  lunchEnd.setHours(13, 0, 0, 0);

  if (lunchEnd <= start || lunchStart >= end) return [];

  return [
    {
      start: lunchStart,
      end: lunchEnd,
    },
  ];
}

// Given busy intervals and work window, return available slots of at least minMinutes
export function findAvailableSlots(
  busy: FreeBusyInterval[],
  start: Date,
  end: Date,
  minMinutes: number
): FreeBusyInterval[] {
  const result: FreeBusyInterval[] = [];

  // Normalize and sort busy intervals
  const intervals = busy
    .map((b) => ({ start: new Date(Math.max(b.start.getTime(), start.getTime())), end: new Date(Math.min(b.end.getTime(), end.getTime())) }))
    .filter((b) => b.start < b.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let cursor = new Date(start);

  for (const b of intervals) {
    if (b.start > cursor) {
      const gapMinutes = (b.start.getTime() - cursor.getTime()) / (1000 * 60);
      if (gapMinutes >= minMinutes) {
        result.push({ start: new Date(cursor), end: new Date(b.start) });
      }
    }
    if (b.end > cursor) cursor = new Date(b.end);
  }

  if (cursor < end) {
    const gapMinutes = (end.getTime() - cursor.getTime()) / (1000 * 60);
    if (gapMinutes >= minMinutes) {
      result.push({ start: new Date(cursor), end: new Date(end) });
    }
  }

  return result;
}