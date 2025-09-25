import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseEmailToTask } from '@/lib/email-parser';
import { z } from 'zod';

const EmailInbound = z.object({
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
  messageId: z.string()
});

export async function POST(req: NextRequest) {
  // Provider-specific parsing: adapt to Resend/SendGrid/Mailgun format
  const body = await req.json();
  
  // For now, assume Resend-like format
  let payload: any = body;
  if (body.envelope) payload = body; // SendGrid format

  const parsed = EmailInbound.safeParse(payload);
  if (!parsed.success) {
    console.warn('Invalid email inbound payload:', parsed.error);
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  }

  // Find user by email
  const user = await prisma.user.findUnique({ where: { email: parsed.data.from } });
  if (!user) {
    // Store email but don't create task for unknown user
    console.info('Email from unknown user:', parsed.data.from);
    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  }

  // Parse email to task
  const taskData = await parseEmailToTask(parsed.data.text || '', parsed.data.subject);
  if (!taskData) {
    console.info('Email did not contain parseable task');
    return NextResponse.json({ status: 'not_a_task' }, { status: 200 });
  }

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority as any,
      estimatedDurationMinutes: taskData.estimatedDurationMinutes || 30,
      source: 'EMAIL',
      emailMessageId: parsed.data.messageId,
      events: { create: { type: 'CREATED' } }
    },
  });

  return NextResponse.json({ task, status: 'created' });
}