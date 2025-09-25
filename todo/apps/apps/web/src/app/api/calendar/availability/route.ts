import { NextRequest, NextResponse } from 'next/server';
import { getUserFreeBusy, findAvailableSlots } from '@/lib/calendar';
import { z } from 'zod';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const AvailabilityRequest = z.object({
  date: z.string(), // ISO date string
  timezone: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const tz = searchParams.get('timezone') || 'UTC';

  // TODO: Get userId from session
  const userId = 'placeholder-user-id';
  
  const target = dayjs(date).tz(tz);
  const workdayStart = target.hour(9).minute(0).second(0).toDate();
  const workdayEnd = target.hour(18).minute(0).second(0).toDate();

  try {
    // Get busy intervals from all connected calendars
    const busyIntervals = await getUserFreeBusy(userId, workdayStart, workdayEnd);
    
    // Find available slots
    const availableSlots = findAvailableSlots(
      busyIntervals,
      workdayStart,
      workdayEnd,
      15 // minimum 15 minutes
    );

    return NextResponse.json({
      date,
      timezone: tz,
      workHours: {
        start: workdayStart.toISOString(),
        end: workdayEnd.toISOString(),
      },
      busy: busyIntervals.map(interval => ({
        start: interval.start.toISOString(),
        end: interval.end.toISOString(),
      })),
      available: availableSlots.map(slot => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        duration: Math.floor((slot.end.getTime() - slot.start.getTime()) / (1000 * 60)), // minutes
      })),
      totalAvailableMinutes: availableSlots.reduce(
        (sum, slot) => sum + (slot.end.getTime() - slot.start.getTime()) / (1000 * 60),
        0
      ),
    });
  } catch (error) {
    console.error('Error fetching calendar availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar availability' },
      { status: 500 }
    );
  }
}