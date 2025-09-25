import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { SmartScheduler } from './smart-scheduler';

export async function completeTask(taskId: string, userId: string) {
  'use server';
  
  try {
    await prisma.task.update({
      where: { 
        id: taskId,
        userId: userId // Ensure user can only update their own tasks
      },
      data: {
        status: 'COMPLETED',
        events: {
          create: {
            type: 'COMPLETED',
            reason: 'Marked as completed by user'
          }
        }
      }
    });
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error completing task:', error);
    return { success: false, error: 'Failed to complete task' };
  }
}

export async function postponeTask(taskId: string, userId: string, reason?: string) {
  'use server';
  
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (task?.calendarEventId) {
      // Best-effort delete from Google Calendar
      const { deleteGoogleEventForTask } = await import('./calendar-sync');
      await deleteGoogleEventForTask(userId, task.calendarEventId);
    }

    await prisma.task.update({
      where: { 
        id: taskId,
        userId: userId
      },
      data: {
        status: 'POSTPONED',
        scheduledStart: null,
        scheduledEnd: null,
        calendarEventId: null,
        calendarProvider: null,
        events: {
          create: {
            type: 'POSTPONED',
            reason: reason || 'Postponed by user'
          }
        }
      }
    });
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error postponing task:', error);
    return { success: false, error: 'Failed to postpone task' };
  }
}

export async function rescheduleTask(taskId: string, userId: string, newStartTime: Date, newEndTime: Date) {
  'use server';
  
  try {
    await prisma.task.update({
      where: { 
        id: taskId,
        userId: userId
      },
      data: {
        scheduledStart: newStartTime,
        scheduledEnd: newEndTime,
        status: 'SCHEDULED',
        events: {
          create: {
            type: 'RESCHEDULED',
            reason: `Rescheduled to ${newStartTime.toLocaleString()}`
          }
        }
      }
    });
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error rescheduling task:', error);
    return { success: false, error: 'Failed to reschedule task' };
  }
}

export async function deleteTask(taskId: string, userId: string) {
  'use server';
  
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (task?.calendarEventId) {
      const { deleteGoogleEventForTask } = await import('./calendar-sync');
      await deleteGoogleEventForTask(userId, task.calendarEventId);
    }

    await prisma.task.delete({
      where: { 
        id: taskId,
        userId: userId
      }
    });
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: 'Failed to delete task' };
  }
}

export async function unpostponeTask(taskId: string, userId: string) {
  'use server';

  try {
    // Set back to pending and clear any schedule
    await prisma.task.update({
      where: {
        id: taskId,
        userId: userId,
      },
      data: {
        status: 'PENDING',
        scheduledStart: null,
        scheduledEnd: null,
        events: {
          create: {
            type: 'RESCHEDULED',
            reason: 'Unpostponed by user'
          }
        }
      }
    });

    // Try to schedule it now according to working hours/current time
    const scheduler = new SmartScheduler();
    await scheduler.scheduleTask(taskId);

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error unpostponing task:', error);
    return { success: false, error: 'Failed to unpostpone task' };
  }
}
