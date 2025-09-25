import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '@/lib/db';
import { addMinutes } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, minutes = 5 } = await request.json();
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email } 
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the current task
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId: user.id }
    });

    if (!task || !task.scheduledStart || !task.scheduledEnd) {
      return NextResponse.json({ error: 'Task not found or not scheduled' }, { status: 404 });
    }

    // Snooze by shifting both start and end times
    const currentStart = new Date(task.scheduledStart);
    const currentEnd = new Date(task.scheduledEnd);
    const duration = currentEnd.getTime() - currentStart.getTime();
    
    const newStartTime = addMinutes(new Date(), minutes);
    const newEndTime = new Date(newStartTime.getTime() + duration);

    await prisma.task.update({
      where: { 
        id: taskId,
        userId: user.id
      },
      data: {
        scheduledStart: newStartTime,
        scheduledEnd: newEndTime,
        events: {
          create: {
            type: 'RESCHEDULED',
            reason: `Snoozed for ${minutes} minutes via notification`
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Task snoozed for ${minutes} minutes`,
      newStartTime: newStartTime.toISOString(),
      newEndTime: newEndTime.toISOString()
    });
  } catch (error) {
    console.error('Snooze task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}