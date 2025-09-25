import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getUserFreeBusy, findAvailableSlots, FreeBusyInterval } from './calendar';

dayjs.extend(utc);
dayjs.extend(timezone);

type Task = {
  id: string;
  title: string;
  estimatedDurationMinutes: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
};

type ScheduleResult = {
  scheduled: Array<{ id: string; start: Date; end: Date; title: string }>;
  unscheduled: Array<{ id: string; reason: string }>;
};

export async function suggestSchedule({
  tasks,
  userId,
  userTimezone = 'UTC',
  date,
  strategy = 'auto'
}: {
  tasks: Task[];
  userId: string;
  userTimezone?: string;
  date?: string;
  strategy?: 'auto' | 'strict';
}): Promise<ScheduleResult> {
  
  const target = date ? dayjs(date).tz(userTimezone) : dayjs().tz(userTimezone);
  const workdayStart = target.hour(9).minute(0).second(0).toDate();
  const workdayEnd = target.hour(18).minute(0).second(0).toDate();
  
  // Get calendar busy times for the user
  const busyIntervals = await getUserFreeBusy(
    userId,
    workdayStart,
    workdayEnd
  );
  
  // Find available time slots
  const availableSlots = findAvailableSlots(
    busyIntervals,
    workdayStart,
    workdayEnd,
    5 // minimum 5 minutes for a task
  );
  
  // Sort tasks by priority
  const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const sortedTasks = [...tasks].sort((a, b) => 
    (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
  );

  const scheduled: ScheduleResult['scheduled'] = [];
  const unscheduled: ScheduleResult['unscheduled'] = [];

  // Try to fit tasks into available slots
  for (const task of sortedTasks) {
    const duration = task.estimatedDurationMinutes;
    let taskScheduled = false;
    
    for (const slot of availableSlots) {
      const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60);
      
      // Check if task fits in this slot
      if (slotDuration >= duration) {
        const taskEnd = new Date(slot.start.getTime() + duration * 60 * 1000);
        
        scheduled.push({
          id: task.id,
          start: slot.start,
          end: taskEnd,
          title: task.title
        });
        
        // Update slot to remove used time (with 5 min buffer)
        const newStart = new Date(taskEnd.getTime() + 5 * 60 * 1000);
        if (newStart < slot.end) {
          slot.start = newStart;
        } else {
          // Remove exhausted slot
          availableSlots.splice(availableSlots.indexOf(slot), 1);
        }
        
        taskScheduled = true;
        break;
      }
    }
    
    if (!taskScheduled) {
      unscheduled.push({ 
        id: task.id, 
        reason: `No available ${duration}-minute slot found` 
      });
    }
  }

  return { scheduled, unscheduled };
}
