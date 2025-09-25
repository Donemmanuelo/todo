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

    // Find user
    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email } 
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, taskId } = body;

    const scheduler = new SmartScheduler();

    if (action === 'scheduleAll') {
      // Schedule all pending tasks
      const result = await scheduler.scheduleAllPendingTasks(user.id);
      
      return NextResponse.json({
        message: `Scheduled ${result.scheduled} tasks successfully`,
        scheduled: result.scheduled,
        failed: result.failed
      });
    } else if (action === 'scheduleTask' && taskId) {
      // Schedule a specific task
      const success = await scheduler.scheduleTask(taskId);
      
      if (success) {
        return NextResponse.json({
          message: 'Task scheduled successfully',
          success: true
        });
      } else {
        return NextResponse.json({
          message: 'Could not find available time slot',
          success: false
        });
      }
    } else if (action === 'getDaySchedule') {
      // Get today's schedule
      const schedule = await scheduler.getDaySchedule(user.id);
      
      return NextResponse.json({
        schedule,
        date: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Scheduling error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user
    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email } 
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const scheduler = new SmartScheduler();
    const scheduleDate = date ? new Date(date) : new Date();
    const schedule = await scheduler.getDaySchedule(user.id, scheduleDate);

    return NextResponse.json({
      schedule,
      date: scheduleDate.toISOString()
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
