import { google } from 'googleapis';
import { prisma } from '@/lib/db';

export interface FreeBusyInterval {
  start: Date;
  end: Date;
}

export async function getGoogleFreeBusy(
  userId: string,
  timeMin: Date,
  timeMax: Date
): Promise<FreeBusyInterval[]> {
  try {
    // Get user's Google OAuth tokens from database
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: 'google'
      }
    });

    if (!account?.access_token) {
      console.warn('No Google access token for user:', userId);
      return [];
    }

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );

    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    });

    // Initialize calendar API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get free/busy information
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: 'primary' }], // Check primary calendar
      },
    });

    const busyIntervals: FreeBusyInterval[] = [];
    const calendars = response.data.calendars;
    
    if (calendars?.primary?.busy) {
      for (const interval of calendars.primary.busy) {
        if (interval.start && interval.end) {
          busyIntervals.push({
            start: new Date(interval.start),
            end: new Date(interval.end),
          });
        }
      }
    }

    return busyIntervals;
  } catch (error) {
    console.error('Error fetching Google Calendar free/busy:', error);
    
    // Check if token expired and needs refresh
    if ((error as any)?.response?.status === 401) {
      // TODO: Implement token refresh logic
      console.info('Google token expired for user:', userId);
    }
    
    return [];
  }
}

export async function refreshGoogleToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' }
  });

  if (!account?.refresh_token) return null;

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );

    oauth2Client.setCredentials({
      refresh_token: account.refresh_token,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update tokens in database
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: credentials.access_token,
        expires_at: credentials.expiry_date ? Math.floor(credentials.expiry_date / 1000) : null,
      },
    });

    return credentials.access_token || null;
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return null;
  }
}