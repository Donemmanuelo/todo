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

    const { taskId, minutes = 15 } = await request.json();
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

    if (!task || !task.scheduledEnd) {
      return NextResponse.json({ error: 'Task not found or not scheduled' }, { status: 404 });
    }

    // Extend the end time
    const newEndTime = addMinutes(new Date(task.scheduledEnd), minutes);

    await prisma.task.update({
      where: { 
        id: taskId,
        userId: user.id
      },
      data: {
        scheduledEnd: newEndTime,
        events: {
          create: {
            type: 'RESCHEDULED',
            reason: `Extended by ${minutes} minutes via notification`
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Task extended by ${minutes} minutes`,
      newEndTime: newEndTime.toISOString()
    });
  } catch (error) {
    console.error('Extend task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}