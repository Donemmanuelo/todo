import { prisma } from '@/lib/db';
import { GoogleCalendarService } from '@/lib/google-calendar';

export async function getUserGoogleTokens(userId: string): Promise<{ accessToken?: string; refreshToken?: string } | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
    select: { access_token: true, refresh_token: true }
  });
  if (!account) return null;
  return { accessToken: account.access_token ?? undefined, refreshToken: account.refresh_token ?? undefined };
}

export async function createGoogleEventForTask(userId: string, task: {
  id: string;
  title: string;
  description?: string | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  estimatedDurationMinutes: number;
}): Promise<string | null> {
  const tokens = await getUserGoogleTokens(userId);
  if (!tokens) return null; // No Google account linked

  const svc = new GoogleCalendarService(tokens.accessToken, tokens.refreshToken);
  const event = await svc.createEvent({
    title: task.title,
    description: task.description ?? undefined,
    scheduledStart: task.scheduledStart ?? undefined,
    scheduledEnd: task.scheduledEnd ?? undefined,
    estimatedDurationMinutes: task.estimatedDurationMinutes,
  });
  const eventId = (event as any)?.id as string | undefined;
  return eventId ?? null;
}

export async function deleteGoogleEventForTask(userId: string, eventId: string): Promise<void> {
  const tokens = await getUserGoogleTokens(userId);
  if (!tokens) return; // nothing to do
  const svc = new GoogleCalendarService(tokens.accessToken, tokens.refreshToken);
  try {
    await svc.deleteEvent(eventId);
  } catch (_err) {
    // swallow errors to avoid breaking UX if event was manually removed
  }
}