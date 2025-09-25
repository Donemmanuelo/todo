import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { SmartScheduler } from '@/lib/smart-scheduler';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await request.json();
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

    // First, postpone the task (clear its schedule)
    await prisma.task.update({
      where: { 
        id: taskId,
        userId: user.id
      },
      data: {
        status: 'PENDING',
        scheduledStart: null,
        scheduledEnd: null,
        events: {
          create: {
            type: 'POSTPONED',
            reason: 'Postponed via notification action'
          }
        }
      }
    });

    // Try to reschedule it for later today or tomorrow
    const scheduler = new SmartScheduler();
    const rescheduled = await scheduler.scheduleTask(taskId);

    return NextResponse.json({ 
      success: true, 
      message: rescheduled 
        ? 'Task postponed and rescheduled for later' 
        : 'Task postponed - please reschedule manually',
      rescheduled
    });
  } catch (error) {
    console.error('Postpone task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}