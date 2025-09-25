import { prisma } from './db';
import { addMinutes, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { createGoogleEventForTask } from './calendar-sync';

interface Task {
  id: string;
  title: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedDurationMinutes: number;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  createdAt?: Date | null;
}

interface User {
  id: string;
  workdayStartMin: number; // minutes from midnight (e.g., 540 = 9:00 AM)
  workdayEndMin: number;   // minutes from midnight (e.g., 1080 = 6:00 PM)
  timezone: string;
}

interface TimeSlot {
  start: Date;
  end: Date;
}

export class SmartScheduler {
  private readonly BUFFER_MINUTES = 15; // Buffer time between tasks
  private readonly LAST_HOUR_BUFFER = 60; // Don't schedule tasks in last hour of work day
  
  /**
   * Convert minutes from midnight to Date object for today
   */
  private minutesToTime(minutes: number, date: Date = new Date()): Date {
    const startOfToday = startOfDay(date);
    return addMinutes(startOfToday, minutes);
  }
  
  /**
   * Get priority weight for scheduling order
   */
  private getPriorityWeight(priority: string): number {
    const weights = {
      'URGENT': 4,
      'HIGH': 3,
      'MEDIUM': 2,
      'LOW': 1
    };
    return weights[priority as keyof typeof weights] || 2;
  }
  
  /**
   * Get available time slots for a user on a given day
   * startAfter (optional): if provided and falls on the same date, do not propose times before it.
   */
  private async getAvailableTimeSlots(userId: string, date: Date, startAfter?: Date): Promise<TimeSlot[]> {
    // Get user's working hours
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    
    const workStart = this.minutesToTime(user.workdayStartMin || 540, date); // Default 9 AM
    const workEnd = this.minutesToTime(user.workdayEndMin || 1080, date);   // Default 6 PM
    
    // Baseline start time
    const now = new Date();
    const sameDayAsToday = date.toDateString() === now.toDateString();
    let actualStartTime = workStart;

    // If scheduling for today, start at the current time or later
    if (sameDayAsToday && now > actualStartTime) {
      actualStartTime = now;
    }

    // If caller provides a per-task cutoff that is on the same day, honor it too
    if (startAfter && date.toDateString() === startAfter.toDateString() && startAfter > actualStartTime) {
      actualStartTime = startAfter;
    }
    
    // Get all scheduled tasks for the day
    const scheduledTasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'SCHEDULED',
        scheduledStart: {
          gte: startOfDay(date),
          lte: endOfDay(date)
        }
      },
      orderBy: { scheduledStart: 'asc' }
    });
    
    // Create available slots
    const availableSlots: TimeSlot[] = [];
    let currentTime = actualStartTime;
    
    for (const task of scheduledTasks) {
      if (task.scheduledStart && task.scheduledEnd) {
        const taskStart = new Date(task.scheduledStart);
        const taskEnd = new Date(task.scheduledEnd);
        
        // If there's a gap before this task, add it as available
        if (isAfter(taskStart, addMinutes(currentTime, this.BUFFER_MINUTES))) {
          availableSlots.push({
            start: currentTime,
            end: addMinutes(taskStart, -this.BUFFER_MINUTES)
          });
        }
        
        // Move current time to after this task
        currentTime = addMinutes(taskEnd, this.BUFFER_MINUTES);
      }
    }
    
    // Add remaining time until work end
    if (isBefore(currentTime, workEnd)) {
      availableSlots.push({
        start: currentTime,
        end: workEnd
      });
    }
    
    return availableSlots;
  }
  
  /**
   * Find the best time slot for a task
   */
  private findBestTimeSlot(
    availableSlots: TimeSlot[], 
    durationMinutes: number, 
    priority: string
  ): TimeSlot | null {
    // Filter slots that can fit the task
    const viableSlots = availableSlots.filter(slot => {
      const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60);
      return slotDuration >= durationMinutes;
    });
    
    if (viableSlots.length === 0) return null;
    
    // For urgent/high priority tasks, prefer earlier slots
    // For low/medium priority tasks, prefer later slots to leave morning free for urgent tasks
    const isHighPriority = ['URGENT', 'HIGH'].includes(priority);
    const selectedSlot = isHighPriority ? viableSlots[0] : viableSlots[viableSlots.length - 1];
    
    return {
      start: selectedSlot.start,
      end: addMinutes(selectedSlot.start, durationMinutes)
    };
  }
  
  /**
   * Schedule a single task
   */
  async scheduleTask(taskId: string): Promise<boolean> {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.status === 'SCHEDULED') return false;
    
    // Try to schedule for current time or later today, then tomorrow if no slots available
    const now = new Date();
    const today = now;
    const tomorrow = addMinutes(now, 24 * 60);
    const dates = [today, tomorrow];

    // Use the task's creation time as the earliest allowed start for same-day scheduling
    const startAfter = task.createdAt ? new Date(task.createdAt) : undefined;
    
    for (const date of dates) {
      const availableSlots = await this.getAvailableTimeSlots(task.userId, date, startAfter);
      const timeSlot = this.findBestTimeSlot(
        availableSlots, 
        task.estimatedDurationMinutes, 
        task.priority
      );
      
      if (timeSlot) {
        // First, mark as scheduled in DB
        const updatedTask = await prisma.task.update({
          where: { id: taskId },
          data: {
            scheduledStart: timeSlot.start,
            scheduledEnd: timeSlot.end,
            status: 'SCHEDULED',
            events: {
              create: {
                type: 'SCHEDULED',
                reason: `Auto-scheduled for ${format(timeSlot.start, 'MMM d, yyyy HH:mm')}`
              }
            }
          }
        });

        // Try to push to Google Calendar (if linked)
        try {
          const eventId = await createGoogleEventForTask(updatedTask.userId, {
            id: updatedTask.id,
            title: updatedTask.title,
            description: updatedTask.description,
            scheduledStart: updatedTask.scheduledStart,
            scheduledEnd: updatedTask.scheduledEnd,
            estimatedDurationMinutes: updatedTask.estimatedDurationMinutes,
          });
          if (eventId) {
            await prisma.task.update({
              where: { id: updatedTask.id },
              data: { calendarEventId: eventId, calendarProvider: 'google' }
            });
          }
        } catch (err) {
          console.error('Failed to create Google Calendar event:', err);
        }
        
        // Note: Notifications will be handled client-side by NotificationManager component
        return true;
      }
    }
    
    return false; // Could not schedule
  }
  
  /**
   * Schedule all pending tasks for a user
   */
  async scheduleAllPendingTasks(userId: string): Promise<{ scheduled: number; failed: number }> {
    // Get all pending tasks, sorted by priority and creation date
    const pendingTasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'PENDING'
      },
      orderBy: [
        { priority: 'desc' }, // URGENT first
        { createdAt: 'asc' }   // Older tasks first
      ]
    });
    
    let scheduled = 0;
    let failed = 0;
    
    // Sort by priority weight for better scheduling
    const sortedTasks = pendingTasks.sort((a, b) => {
      const weightA = this.getPriorityWeight(a.priority);
      const weightB = this.getPriorityWeight(b.priority);
      return weightB - weightA; // Higher priority first
    });
    
    for (const task of sortedTasks) {
      const success = await this.scheduleTask(task.id);
      if (success) {
        scheduled++;
      } else {
        failed++;
      }
    }
    
    return { scheduled, failed };
  }
  
  /**
   * Get user's schedule for a specific day
   */
  async getDaySchedule(userId: string, date: Date = new Date()) {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'SCHEDULED',
        scheduledStart: {
          gte: startOfDay(date),
          lte: endOfDay(date)
        }
      },
      orderBy: { scheduledStart: 'asc' }
    });
    
    return tasks;
  }
  
  /**
   * Update user's working hours
   */
  async updateWorkingHours(userId: string, startMinutes: number, endMinutes: number) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        workdayStartMin: startMinutes,
        workdayEndMin: endMinutes
      }
    });
  }
}
