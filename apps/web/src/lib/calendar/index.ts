import { getGoogleFreeBusy, FreeBusyInterval } from './google-calendar';
import { getMicrosoftFreeBusy, mergeIntervals } from './microsoft-graph';
import { prisma } from '@/lib/db';

export type { FreeBusyInterval };

/**
 * Gets combined free/busy information from all connected calendars
 */
export async function getUserFreeBusy(
  userId: string,
  timeMin: Date,
  timeMax: Date
): Promise<FreeBusyInterval[]> {
  const allIntervals: FreeBusyInterval[] = [];

  // Check which calendar providers the user has connected
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { provider: true }
  });

  const providers = new Set(accounts.map(a => a.provider));
  
  // Fetch from all connected calendars in parallel
  const promises: Promise<FreeBusyInterval[]>[] = [];
  
  if (providers.has('google')) {
    promises.push(getGoogleFreeBusy(userId, timeMin, timeMax));
  }
  
  if (providers.has('azure-ad')) {
    promises.push(getMicrosoftFreeBusy(userId, timeMin, timeMax));
  }

  // Wait for all calendar fetches
  const results = await Promise.allSettled(promises);
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allIntervals.push(...result.value);
    }
  }

  // Merge overlapping intervals from different calendars
  return mergeIntervals(allIntervals);
}

/**
 * Find available time slots for scheduling tasks
 */
export function findAvailableSlots(
  busyIntervals: FreeBusyInterval[],
  workdayStart: Date,
  workdayEnd: Date,
  minDuration: number = 15 // minimum slot duration in minutes
): FreeBusyInterval[] {
  const availableSlots: FreeBusyInterval[] = [];
  
  // Sort busy intervals
  const sorted = [...busyIntervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  
  let currentStart = workdayStart;
  
  for (const busy of sorted) {
    // Skip if busy period is before current start
    if (busy.end <= currentStart) continue;
    
    // Skip if busy period is after workday end
    if (busy.start >= workdayEnd) break;
    
    // Add available slot before this busy period
    if (busy.start > currentStart) {
      const slotEnd = busy.start < workdayEnd ? busy.start : workdayEnd;
      const duration = (slotEnd.getTime() - currentStart.getTime()) / (1000 * 60);
      
      if (duration >= minDuration) {
        availableSlots.push({
          start: currentStart,
          end: slotEnd
        });
      }
    }
    
    // Move current start to end of busy period
    currentStart = busy.end > currentStart ? busy.end : currentStart;
  }
  
  // Add final slot if there's time after last busy period
  if (currentStart < workdayEnd) {
    const duration = (workdayEnd.getTime() - currentStart.getTime()) / (1000 * 60);
    if (duration >= minDuration) {
      availableSlots.push({
        start: currentStart,
        end: workdayEnd
      });
    }
  }
  
  return availableSlots;
}

/**
 * Check if a specific time slot is available
 */
export function isSlotAvailable(
  slot: FreeBusyInterval,
  busyIntervals: FreeBusyInterval[]
): boolean {
  for (const busy of busyIntervals) {
    // Check for any overlap
    if (
      (slot.start >= busy.start && slot.start < busy.end) || // Slot starts during busy
      (slot.end > busy.start && slot.end <= busy.end) || // Slot ends during busy
      (slot.start <= busy.start && slot.end >= busy.end) // Slot encompasses busy
    ) {
      return false;
    }
  }
  return true;
}