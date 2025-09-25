import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

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

    // Update task to completed
    await prisma.task.update({
      where: { 
        id: taskId,
        userId: user.id // Ensure user can only update their own tasks
      },
      data: {
        status: 'COMPLETED',
        events: {
          create: {
            type: 'COMPLETED',
            reason: 'Completed via notification action'
          }
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Task completed successfully' });
  } catch (error) {
    console.error('Complete task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}