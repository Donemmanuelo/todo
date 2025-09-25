'use client';

import { useEffect, useState } from 'react';
import { notificationService } from '@/lib/notifications';

interface Task {
  id: string;
  title: string;
  status: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
}

interface NotificationManagerProps {
  scheduledTasks: Task[];
}

export default function NotificationManager({ scheduledTasks }: NotificationManagerProps) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [reminderMinutes, setReminderMinutes] = useState(5);

  useEffect(() => {
    // Initialize notification permission state
    if (typeof window !== 'undefined') {
      setNotificationPermission(notificationService.getPermissionStatus());
    }
  }, []);

  useEffect(() => {
    // Schedule notifications for all scheduled tasks
    if (notificationPermission === 'granted') {
      scheduledTasks.forEach(task => {
        if (task.scheduledStart && task.scheduledEnd && task.status === 'SCHEDULED') {
          const startTime = new Date(task.scheduledStart);
          const endTime = new Date(task.scheduledEnd);
          
          // Only schedule if the task is in the future
          if (startTime.getTime() > Date.now()) {
            notificationService.scheduleTaskNotifications(
              task.id,
              task.title,
              startTime,
              endTime,
              reminderMinutes
            );
          }
        }
      });
    }

    // Cleanup function to clear notifications when component unmounts
    return () => {
      scheduledTasks.forEach(task => {
        notificationService.clearScheduledNotification(`${task.id}-start`);
        notificationService.clearScheduledNotification(`${task.id}-end`);
      });
    };
  }, [scheduledTasks, notificationPermission, reminderMinutes]);

  const requestNotificationPermission = async () => {
    const granted = await notificationService.requestPermission();
    setNotificationPermission(granted ? 'granted' : 'denied');
    
    if (granted) {
      // Show a test notification
      notificationService.showNotification({
        title: 'Notifications Enabled!',
        body: 'You\'ll now receive reminders for your scheduled tasks.',
        requireInteraction: false
      });
    }
  };

  const testNotification = () => {
    notificationService.showNotification({
      title: 'Test Notification',
      body: 'This is how your task reminders will look!',
      requireInteraction: false
    });
  };

  if (typeof window === 'undefined' || !notificationService.isSupported()) {
    return null; // Don't render on server or unsupported browsers
  }

  return (
    <div className="space-y-3">
      {/* Notification Permission Status */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-blue-300/70">Notifications</p>
        
        {notificationPermission === 'default' && (
          <button
            onClick={requestNotificationPermission}
            className="w-full px-3 py-2 text-xs font-medium text-blue-400 glass rounded-lg hover:bg-blue-500/10 hover:border-blue-400/50 transition-all duration-300"
          >
            Enable Task Reminders
          </button>
        )}
        
        {notificationPermission === 'denied' && (
          <div className="px-3 py-2 text-xs text-red-400 glass rounded-lg bg-red-500/10">
            Notifications blocked. Please enable in your browser settings.
          </div>
        )}
        
        {notificationPermission === 'granted' && (
          <div className="space-y-2">
            <div className="px-3 py-2 text-xs text-green-400 glass rounded-lg bg-green-500/10">
              ✓ Notifications enabled
            </div>
            
            {/* Reminder timing configuration */}
            <div className="space-y-1">
              <label className="text-xs text-blue-300/50">Remind me</label>
              <select
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(parseInt(e.target.value))}
                className="w-full px-2 py-1 text-xs glass rounded bg-slate-800/50 text-white"
              >
                <option value={1}>1 minute before</option>
                <option value={5}>5 minutes before</option>
                <option value={10}>10 minutes before</option>
                <option value={15}>15 minutes before</option>
              </select>
            </div>
            
            <button
              onClick={testNotification}
              className="w-full px-3 py-1 text-xs font-medium text-purple-400 glass rounded-lg hover:bg-purple-500/10 hover:border-purple-400/50 transition-all duration-300"
            >
              Test Notification
            </button>
          </div>
        )}
      </div>

      {/* Active scheduled tasks info */}
      {notificationPermission === 'granted' && scheduledTasks.length > 0 && (
        <div className="px-3 py-2 text-xs text-blue-300/70 glass rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>
              {scheduledTasks.filter(t => t.status === 'SCHEDULED' && t.scheduledStart).length} tasks have reminders set
            </span>
          </div>
        </div>
      )}
    </div>
  );
}