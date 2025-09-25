import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId1, taskId2 } = await request.json();
    if (!taskId1 || !taskId2) {
      return NextResponse.json({ error: 'Both task IDs required' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email } 
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get both tasks
    const [task1, task2] = await Promise.all([
      prisma.task.findUnique({
        where: { id: taskId1, userId: user.id }
      }),
      prisma.task.findUnique({
        where: { id: taskId2, userId: user.id }
      })
    ]);

    if (!task1 || !task2) {
      return NextResponse.json({ error: 'One or both tasks not found' }, { status: 404 });
    }

    if (!task1.scheduledStart || !task1.scheduledEnd || !task2.scheduledStart || !task2.scheduledEnd) {
      return NextResponse.json({ error: 'Both tasks must be scheduled to swap' }, { status: 400 });
    }

    // Swap the scheduled times
    const temp1Start = task1.scheduledStart;
    const temp1End = task1.scheduledEnd;

    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId1 },
        data: {
          scheduledStart: task2.scheduledStart,
          scheduledEnd: task2.scheduledEnd,
          events: {
            create: {
              type: 'RESCHEDULED',
              reason: `Swapped schedule with another task`
            }
          }
        }
      }),
      prisma.task.update({
        where: { id: taskId2 },
        data: {
          scheduledStart: temp1Start,
          scheduledEnd: temp1End,
          events: {
            create: {
              type: 'RESCHEDULED',
              reason: `Swapped schedule with another task`
            }
          }
        }
      })
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Tasks swapped successfully'
    });
  } catch (error) {
    console.error('Swap tasks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}