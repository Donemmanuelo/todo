import nodemailer from 'nodemailer';
import { prisma } from './db';
import { Task } from '@prisma/client';

interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user?: string;
    pass?: string;
  };
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(config?: EmailConfig) {
    // Use environment variables or provided config
    this.transporter = nodemailer.createTransport({
      host: config?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: config?.port || parseInt(process.env.SMTP_PORT || '587'),
      secure: config?.secure || false,
      auth: {
        user: config?.auth?.user || process.env.SMTP_USER,
        pass: config?.auth?.pass || process.env.SMTP_PASSWORD,
      },
    });
  }

  private generateTaskHTML(tasks: Task[], title: string) {
    const tasksByStatus = {
      COMPLETED: tasks.filter(t => t.status === 'COMPLETED'),
      PENDING: tasks.filter(t => t.status === 'PENDING'),
      SCHEDULED: tasks.filter(t => t.status === 'SCHEDULED'),
      POSTPONED: tasks.filter(t => t.status === 'POSTPONED'),
      CANCELED: tasks.filter(t => t.status === 'CANCELED'),
      SKIPPED: tasks.filter(t => t.status === 'SKIPPED'),
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px; }
    .stats { display: flex; justify-content: space-around; margin: 20px 0; }
    .stat { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; flex: 1; margin: 0 5px; }
    .stat-number { font-size: 24px; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
    .task-section { margin: 20px 0; }
    .task-section h3 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .task-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #667eea; }
    .task-title { font-weight: bold; color: #333; margin-bottom: 5px; }
    .task-meta { font-size: 12px; color: #666; }
    .priority-HIGH { border-left-color: #ff6b6b; }
    .priority-URGENT { border-left-color: #ff4757; }
    .priority-MEDIUM { border-left-color: #4ecdc4; }
    .priority-LOW { border-left-color: #95a5a6; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    .cta-button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
    
    <div class="content">
      <div class="stats">
        <div class="stat">
          <div class="stat-number">${tasksByStatus.COMPLETED.length}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat">
          <div class="stat-number">${tasksByStatus.PENDING.length}</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat">
          <div class="stat-number">${tasksByStatus.SCHEDULED.length}</div>
          <div class="stat-label">Scheduled</div>
        </div>
        <div class="stat">
          <div class="stat-number">${tasks.length}</div>
          <div class="stat-label">Total Tasks</div>
        </div>
      </div>

      ${tasksByStatus.COMPLETED.length > 0 ? `
        <div class="task-section">
          <h3>✅ Completed Tasks</h3>
          ${tasksByStatus.COMPLETED.map(task => `
            <div class="task-item priority-${task.priority}">
              <div class="task-title">${task.title}</div>
              ${task.description ? `<div style="color: #666; font-size: 14px; margin-top: 5px;">${task.description}</div>` : ''}
              <div class="task-meta">Priority: ${task.priority} | Duration: ${task.estimatedDurationMinutes} mins</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${tasksByStatus.SCHEDULED.length > 0 ? `
        <div class="task-section">
          <h3>📅 Scheduled Tasks</h3>
          ${tasksByStatus.SCHEDULED.map(task => `
            <div class="task-item priority-${task.priority}">
              <div class="task-title">${task.title}</div>
              ${task.description ? `<div style="color: #666; font-size: 14px; margin-top: 5px;">${task.description}</div>` : ''}
              <div class="task-meta">
                Priority: ${task.priority} | 
                ${task.scheduledStart ? `Starts: ${new Date(task.scheduledStart).toLocaleString()}` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${tasksByStatus.PENDING.length > 0 ? `
        <div class="task-section">
          <h3>⏳ Pending Tasks</h3>
          ${tasksByStatus.PENDING.map(task => `
            <div class="task-item priority-${task.priority}">
              <div class="task-title">${task.title}</div>
              ${task.description ? `<div style="color: #666; font-size: 14px; margin-top: 5px;">${task.description}</div>` : ''}
              <div class="task-meta">Priority: ${task.priority} | Duration: ${task.estimatedDurationMinutes} mins</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="cta-button">View Dashboard</a>
      </div>
    </div>

    <div class="footer">
      <p>This is an automated report from your Smart To-Do application</p>
      <p>You're receiving this because you're subscribed to task reports</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  async sendDailyReport(userId: string, userEmail: string, userName?: string) {
    try {
      // Get today's tasks
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tasks = await prisma.task.findMany({
        where: {
          userId,
          OR: [
            { createdAt: { gte: today, lt: tomorrow } },
            { updatedAt: { gte: today, lt: tomorrow } },
            { scheduledStart: { gte: today, lt: tomorrow } },
          ],
        },
        orderBy: { priority: 'desc' },
      });

      const htmlContent = this.generateTaskHTML(tasks, '📊 Daily Task Report');

      const mailOptions = {
        from: process.env.SMTP_FROM || '"Smart To-Do" <noreply@smarttodo.app>',
        to: userEmail,
        subject: `Daily Report - ${tasks.filter(t => t.status === 'COMPLETED').length} tasks completed today!`,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      // Log the report in database
      await prisma.dailyReport.create({
        data: {
          userId,
          date: today,
          content: {
            totalTasks: tasks.length,
            completed: tasks.filter(t => t.status === 'COMPLETED').length,
            pending: tasks.filter(t => t.status === 'PENDING').length,
            scheduled: tasks.filter(t => t.status === 'SCHEDULED').length,
          },
          sentAt: new Date(),
        },
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending daily report:', error);
      throw error;
    }
  }

  async sendWeeklyReport(userId: string, userEmail: string, userName?: string) {
    try {
      // Get this week's tasks
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);

      const tasks = await prisma.task.findMany({
        where: {
          userId,
          OR: [
            { createdAt: { gte: weekStart } },
            { updatedAt: { gte: weekStart } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      const htmlContent = this.generateTaskHTML(tasks, '📈 Weekly Task Summary');

      const mailOptions = {
        from: process.env.SMTP_FROM || '"Smart To-Do" <noreply@smarttodo.app>',
        to: userEmail,
        subject: `Weekly Summary - ${tasks.filter(t => t.status === 'COMPLETED').length} tasks completed this week!`,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending weekly report:', error);
      throw error;
    }
  }

  async sendTaskNotification(task: Task, userEmail: string, type: 'reminder' | 'due' | 'overdue') {
    try {
      const subjects = {
        reminder: `⏰ Reminder: ${task.title}`,
        due: `🔔 Task Due: ${task.title}`,
        overdue: `⚠️ Overdue: ${task.title}`,
      };

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .notification { max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .icon { font-size: 48px; text-align: center; margin-bottom: 20px; }
    .title { font-size: 24px; color: #333; margin-bottom: 15px; }
    .description { color: #666; margin-bottom: 20px; line-height: 1.6; }
    .meta { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="notification">
    <div class="icon">${type === 'reminder' ? '⏰' : type === 'due' ? '🔔' : '⚠️'}</div>
    <div class="title">${task.title}</div>
    ${task.description ? `<div class="description">${task.description}</div>` : ''}
    <div class="meta">
      <strong>Priority:</strong> ${task.priority}<br>
      <strong>Estimated Duration:</strong> ${task.estimatedDurationMinutes} minutes<br>
      ${task.scheduledStart ? `<strong>Scheduled:</strong> ${new Date(task.scheduledStart).toLocaleString()}<br>` : ''}
    </div>
    <div style="text-align: center;">
      <a href="${process.env.APP_URL || 'http://localhost:3000'}/tasks/${task.id}" class="button">View Task</a>
    </div>
  </div>
</body>
</html>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || '"Smart To-Do" <noreply@smarttodo.app>',
        to: userEmail,
        subject: subjects[type],
        html: htmlContent,
        priority: type === 'overdue' ? 'high' : 'normal',
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending task notification:', error);
      throw error;
    }
  }
}