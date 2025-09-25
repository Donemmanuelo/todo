import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDailyReport } from '@/lib/reporting';
import { sendDailyReport } from '@/lib/email';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export async function POST(req: NextRequest) {
  // Basic auth check - Vercel cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, timezone: true }
  });

  let processed = 0;
  let errors = 0;

  for (const user of users) {
    try {
      const tz = user.timezone || 'UTC';
      const today = dayjs().tz(tz).startOf('day').toDate();
      
      // Check if report already sent today
      const existingReport = await prisma.dailyReport.findUnique({
        where: { userId_date: { userId: user.id, date: today } }
      });
      if (existingReport?.sentAt) continue;

      // Generate report
      const reportContent = await generateDailyReport(user.id, today);
      
      // Send email
      if (user.email) {
        await sendDailyReport(user.email, user.name || 'There', reportContent);
      }

      // Store/update report record
      await prisma.dailyReport.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        create: { userId: user.id, date: today, content: reportContent as any, sentAt: new Date() },
        update: { content: reportContent as any, sentAt: new Date() }
      });

      processed++;
    } catch (error) {
      console.error(`Failed to process daily report for user ${user.id}:`, error);
      errors++;
    }
  }

  return NextResponse.json({ processed, errors });
}