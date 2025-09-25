// Local definition compatible with the Web Notifications API
// Avoids depending on lib.serviceworker types
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

export class TaskNotificationService {
  private static instance: TaskNotificationService;
  private permission: NotificationPermission = 'default';
  private registeredNotifications: Map<string, number> = new Map();
  private audioContext: AudioContext | null = null;
  private notificationSound: AudioBuffer | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.permission = Notification.permission;
      this.initializeAudio();
    }
  }

  /**
   * Initialize audio context and load notification sound
   */
  private async initializeAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.loadNotificationSound();
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  }

  /**
   * Load notification sound (using Web Audio API to generate a pleasant chime)
   */
  private async loadNotificationSound() {
    if (!this.audioContext) return;
    
    // Create a pleasant notification chime sound
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3; // 300ms
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate a pleasant bell-like sound
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // Combination of frequencies to create a bell sound
      const freq1 = 800 * Math.exp(-t * 3);
      const freq2 = 1200 * Math.exp(-t * 4);
      data[i] = (Math.sin(2 * Math.PI * freq1 * t) + Math.sin(2 * Math.PI * freq2 * t)) * 0.3 * Math.exp(-t * 2);
    }
    
    this.notificationSound = buffer;
  }

  /**
   * Play notification sound
   */
  private playNotificationSound() {
    if (!this.audioContext || !this.notificationSound) return;
    
    try {
      // Resume audio context if suspended (required for user interaction)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = this.notificationSound;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      gainNode.gain.value = 0.3; // Moderate volume
      
      source.start();
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  static getInstance(): TaskNotificationService {
    if (!TaskNotificationService.instance) {
      TaskNotificationService.instance = new TaskNotificationService();
    }
    return TaskNotificationService.instance;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Show immediate notification with sound
   */
  showNotification(options: NotificationOptions): Notification | null {
    if (typeof window === 'undefined' || this.permission !== 'granted') {
      return null;
    }

    try {
      // Play notification sound
      this.playNotificationSound();
      
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: false, // Allow system sounds too
        // @ts-ignore - actions might not be fully supported
        actions: options.actions
      });
      
      // Handle notification clicks and actions
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      // Handle notification action clicks (for browsers that support it)
      if ('addEventListener' in notification) {
        notification.addEventListener('notificationclick', (event: any) => {
          const action = event.action;
          if (action) {
            this.handleNotificationAction(action, options.tag || '');
          }
          notification.close();
        });
      }

      // Auto-close after 8 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 8000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }
  
  /**
   * Handle notification action clicks
   */
  private handleNotificationAction(action: string, tag: string) {
    const taskId = tag.replace(/-(start|end)$/, '');
    
    switch (action) {
      case 'complete':
        this.markTaskCompleted(taskId);
        break;
      case 'postpone':
        this.postponeTask(taskId);
        break;
      case 'snooze':
        this.snoozeTask(taskId, 5); // Snooze for 5 minutes
        break;
      case 'extend':
        this.extendTask(taskId, 15); // Extend by 15 minutes
        break;
      case 'view':
        window.focus();
        break;
    }
  }
  
  /**
   * Mark task as completed via notification action
   */
  private async markTaskCompleted(taskId: string) {
    try {
      await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
      
      this.showNotification({
        title: 'Task Completed!',
        body: 'Great job! Task marked as completed.',
        requireInteraction: false
      });
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  }
  
  /**
   * Postpone task via notification action
   */
  private async postponeTask(taskId: string) {
    try {
      await fetch('/api/tasks/postpone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
      
      this.showNotification({
        title: 'Task Postponed',
        body: 'Task has been postponed and will be rescheduled.',
        requireInteraction: false
      });
    } catch (error) {
      console.error('Failed to postpone task:', error);
    }
  }
  
  /**
   * Snooze task for specified minutes
   */
  private async snoozeTask(taskId: string, minutes: number) {
    try {
      await fetch('/api/tasks/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, minutes })
      });
      
      this.showNotification({
        title: `Task Snoozed`,
        body: `Task reminder will appear again in ${minutes} minutes.`,
        requireInteraction: false
      });
    } catch (error) {
      console.error('Failed to snooze task:', error);
    }
  }
  
  /**
   * Extend task time
   */
  private async extendTask(taskId: string, minutes: number) {
    try {
      await fetch('/api/tasks/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, minutes })
      });
      
      this.showNotification({
        title: 'Task Extended',
        body: `Task time extended by ${minutes} minutes.`,
        requireInteraction: false
      });
    } catch (error) {
      console.error('Failed to extend task:', error);
    }
  }

  /**
   * Schedule a notification for a specific time
   */
  scheduleNotification(
    taskId: string,
    scheduledTime: Date,
    options: NotificationOptions
  ): void {
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      // Time has already passed, show immediately
      this.showNotification(options);
      return;
    }

    // Clear any existing notification for this task
    this.clearScheduledNotification(taskId);

    // Schedule the notification
    const timeoutId = window.setTimeout(() => {
      this.showNotification(options);
      this.registeredNotifications.delete(taskId);
    }, delay);

    this.registeredNotifications.set(taskId, timeoutId);
  }

  /**
   * Schedule task start reminder (5 minutes before)
   */
  scheduleTaskStartReminder(
    taskId: string,
    taskTitle: string,
    startTime: Date,
    minutesBefore: number = 5
  ): void {
    const reminderTime = new Date(startTime.getTime() - minutesBefore * 60 * 1000);
    
    this.scheduleNotification(`${taskId}-start`, reminderTime, {
      title: 'Task Starting Soon',
      body: `"${taskTitle}" starts in ${minutesBefore} minutes`,
      icon: '/favicon.ico',
      tag: `task-start-${taskId}`,
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Task' },
        { action: 'snooze', title: 'Snooze 5min' }
      ]
    });
  }

  /**
   * Schedule task end reminder
   */
  scheduleTaskEndReminder(
    taskId: string,
    taskTitle: string,
    endTime: Date
  ): void {
    this.scheduleNotification(`${taskId}-end`, endTime, {
      title: 'Task Time Complete',
      body: `"${taskTitle}" scheduled time has ended`,
      icon: '/favicon.ico',
      tag: `task-end-${taskId}`,
      requireInteraction: true,
      actions: [
        { action: 'complete', title: 'Mark Complete' },
        { action: 'extend', title: 'Extend Time' }
      ]
    });
  }

  /**
   * Schedule notifications for a task (both start and end)
   */
  scheduleTaskNotifications(
    taskId: string,
    taskTitle: string,
    startTime: Date,
    endTime: Date,
    reminderMinutes: number = 5
  ): void {
    this.scheduleTaskStartReminder(taskId, taskTitle, startTime, reminderMinutes);
    this.scheduleTaskEndReminder(taskId, taskTitle, endTime);
  }

  /**
   * Clear scheduled notification for a task
   */
  clearScheduledNotification(taskId: string): void {
    const timeoutId = this.registeredNotifications.get(taskId);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      this.registeredNotifications.delete(taskId);
    }
  }

  /**
   * Clear all scheduled notifications
   */
  clearAllNotifications(): void {
    for (const [taskId, timeoutId] of this.registeredNotifications) {
      window.clearTimeout(timeoutId);
    }
    this.registeredNotifications.clear();
  }

  /**
   * Check if notifications are supported and enabled
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  /**
   * Show daily summary notification
   */
  showDailySummary(completedTasks: number, totalTasks: number): void {
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    this.showNotification({
      title: 'Daily Summary',
      body: `You completed ${completedTasks} of ${totalTasks} tasks today (${completionRate}%)`,
      icon: '/favicon.ico',
      tag: 'daily-summary',
      requireInteraction: false
    });
  }
}

// Export singleton instance
export const notificationService = TaskNotificationService.getInstance();