import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const TaskUpdate = z.object({
  status: z.enum(['PENDING','SCHEDULED','COMPLETED','SKIPPED','POSTPONED','CANCELED']).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  estimatedDurationMinutes: z.number().int().min(5).max(8*60).optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
});

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const body = await _req.json();
  const parsed = TaskUpdate.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const id = params.id;

  const t = await prisma.task.update({
    where: { id },
    data: {
      ...('title' in parsed.data ? { title: parsed.data.title } : {}),
      ...('description' in parsed.data ? { description: parsed.data.description } : {}),
      ...('priority' in parsed.data ? { priority: parsed.data.priority as any } : {}),
      ...('estimatedDurationMinutes' in parsed.data ? { estimatedDurationMinutes: parsed.data.estimatedDurationMinutes } : {}),
      ...('scheduledStart' in parsed.data ? { scheduledStart: parsed.data.scheduledStart ? new Date(parsed.data.scheduledStart) : null } : {}),
      ...('scheduledEnd' in parsed.data ? { scheduledEnd: parsed.data.scheduledEnd ? new Date(parsed.data.scheduledEnd) : null } : {}),
      ...('status' in parsed.data ? { status: parsed.data.status as any } : {})
    }
  });

  return NextResponse.json({ task: t });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
