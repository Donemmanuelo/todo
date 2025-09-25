import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const TaskCreate = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  estimatedDurationMinutes: z.number().int().min(5).max(8*60).optional(),
  source: z.enum(['EMAIL', 'MANUAL', 'API']).optional()
});

export async function GET(req: NextRequest) {
  // TODO: add auth and filter by current user
  const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = TaskCreate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // TODO: use session userId
  const user = await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: 'No user found. Please sign in.' }, { status: 401 });

  const t = await prisma.task.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: (parsed.data.priority as any) ?? 'MEDIUM',
      estimatedDurationMinutes: parsed.data.estimatedDurationMinutes ?? 30,
      source: (parsed.data.source as any) ?? 'MANUAL',
      events: { create: { type: 'CREATED' } },
    }
  });

  return NextResponse.json({ task: t }, { status: 201 });
}
