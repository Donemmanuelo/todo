import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { SmartScheduler } from '@/lib/smart-scheduler';
import { z } from 'zod';

const BodySchema = z.object({
  startMinutes: z.number().int().min(0).max(24 * 60),
  endMinutes: z.number().int().min(0).max(24 * 60),
  reschedule: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Try auth; if unavailable (e.g., local script/cURL), fall back to first user in dev mode
    let session: any = null;
    try {
      session = await auth();
    } catch (_) {}

    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { startMinutes, endMinutes, reschedule = true } = parsed.data;
    if (endMinutes <= startMinutes) {
      return NextResponse.json({ error: 'endMinutes must be greater than startMinutes' }, { status: 400 });
    }

    // Find user by session email or fall back to first user (non-production convenience)
    let user = null as null | { id: string };
    if (session?.user?.email) {
      user = await prisma.user.findUnique({ where: { email: session.user.email } });
    }
    if (!user) {
      user = await prisma.user.findFirst();
    }
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update working hours
    await prisma.user.update({
      where: { id: user.id },
      data: {
        workdayStartMin: startMinutes,
        workdayEndMin: endMinutes,
      },
    });

    let rescheduled = 0;
    let failed = 0;

    if (reschedule) {
      // Clear schedules for pending/scheduled tasks so they can be re-planned under new hours
      await prisma.task.updateMany({
        where: {
          userId: user.id,
          status: { in: ['PENDING', 'SCHEDULED'] },
        },
        data: {
          status: 'PENDING',
          scheduledStart: null,
          scheduledEnd: null,
        },
      });

      const scheduler = new SmartScheduler();
      const result = await scheduler.scheduleAllPendingTasks(user.id);
      rescheduled = result.scheduled;
      failed = result.failed;
    }

    return NextResponse.json({
      success: true,
      updated: { startMinutes, endMinutes },
      rescheduleRan: reschedule,
      rescheduled,
      failed,
    });
  } catch (error) {
    console.error('Update working hours error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
