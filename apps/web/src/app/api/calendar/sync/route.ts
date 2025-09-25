import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { GoogleCalendarService } from '@/lib/google-calendar';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, action } = await req.json();

    // Get the task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { user: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Initialize Google Calendar service with user's tokens
    const calendarService = new GoogleCalendarService(
      (session.user as any).accessToken,
      (session.user as any).refreshToken
    );

    let result;
    switch (action) {
      case 'create':
        // Create calendar event for the task
        result = await calendarService.createEvent({
          title: task.title,
          description: task.description || undefined,
          scheduledStart: task.scheduledStart || undefined,
          scheduledEnd: task.scheduledEnd || undefined,
          estimatedDurationMinutes: task.estimatedDurationMinutes,
        });

        // Store the calendar event ID in the task
        await prisma.task.update({
          where: { id: taskId },
          data: { 
            emailMessageId: result.id, // Using emailMessageId to store calendar event ID
            status: 'SCHEDULED',
          },
        });
        break;

      case 'update':
        if (!task.emailMessageId) {
          return NextResponse.json({ error: 'No calendar event linked to this task' }, { status: 400 });
        }
        
        result = await calendarService.updateEvent(task.emailMessageId, {
          summary: task.title,
          description: task.description,
          start: {
            dateTime: task.scheduledStart?.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: task.scheduledEnd?.toISOString(),
            timeZone: 'UTC',
          },
        });
        break;

      case 'delete':
        if (!task.emailMessageId) {
          return NextResponse.json({ error: 'No calendar event linked to this task' }, { status: 400 });
        }
        
        await calendarService.deleteEvent(task.emailMessageId);
        
        // Remove the calendar event ID from the task
        await prisma.task.update({
          where: { id: taskId },
          data: { emailMessageId: null },
        });
        
        result = { deleted: true };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync with calendar' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Initialize Google Calendar service
    const calendarService = new GoogleCalendarService(
      (session.user as any).accessToken,
      (session.user as any).refreshToken
    );

    // Get calendar events
    const events = await calendarService.getEvents(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    // Get free/busy information
    const freeBusy = await calendarService.getFreeBusy(
      startDate ? new Date(startDate) : new Date(),
      endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    return NextResponse.json({
      events,
      freeBusy,
    });
  } catch (error) {
    console.error('Calendar fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}