import { Client } from '@microsoft/microsoft-graph-client';
import { prisma } from '@/lib/db';
import { FreeBusyInterval } from './google-calendar';

export async function getMicrosoftFreeBusy(
  userId: string,
  timeMin: Date,
  timeMax: Date
): Promise<FreeBusyInterval[]> {
  try {
    // Get user's Microsoft OAuth tokens from database
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: 'azure-ad'
      }
    });

    if (!account?.access_token) {
      console.warn('No Microsoft access token for user:', userId);
      return [];
    }

    // Check if token is expired
    if (account.expires_at && account.expires_at * 1000 < Date.now()) {
      const newToken = await refreshMicrosoftToken(userId);
      if (!newToken) return [];
      account.access_token = newToken;
    }

    // Initialize Graph client
    const client = Client.init({
      authProvider: (done) => {
        done(null, account.access_token!);
      }
    });

    // Get calendar view (events) for the time range
    const response = await client
      .api('/me/calendarView')
      .query({
        startDateTime: timeMin.toISOString(),
        endDateTime: timeMax.toISOString(),
        $select: 'start,end,showAs',
        $filter: "showAs ne 'free'" // Only get busy, tentative, oof, working elsewhere
      })
      .get();

    const busyIntervals: FreeBusyInterval[] = [];
    
    if (response?.value) {
      for (const event of response.value) {
        if (event.start?.dateTime && event.end?.dateTime) {
          busyIntervals.push({
            start: new Date(event.start.dateTime + 'Z'), // Ensure UTC
            end: new Date(event.end.dateTime + 'Z'),
          });
        }
      }
    }

    // Sort intervals by start time
    busyIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());

    return busyIntervals;
  } catch (error) {
    console.error('Error fetching Microsoft Graph calendar:', error);
    
    // Check if token expired
    if ((error as any)?.statusCode === 401) {
      console.info('Microsoft token expired for user:', userId);
      // Try to refresh and retry once
      const newToken = await refreshMicrosoftToken(userId);
      if (newToken) {
        // Retry with new token (recursive call with limit)
        return getMicrosoftFreeBusy(userId, timeMin, timeMax);
      }
    }
    
    return [];
  }
}

export async function refreshMicrosoftToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'azure-ad' }
  });

  if (!account?.refresh_token) return null;

  try {
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
      scope: 'openid email profile offline_access Calendars.Read Mail.Read',
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Update tokens in database
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token || account.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      },
    });

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Microsoft token:', error);
    return null;
  }
}

// Helper to merge overlapping busy intervals
export function mergeIntervals(intervals: FreeBusyInterval[]): FreeBusyInterval[] {
  if (intervals.length === 0) return [];
  
  // Sort by start time
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: FreeBusyInterval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // Check if intervals overlap or are adjacent
    if (current.start <= last.end) {
      // Merge intervals
      last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
    } else {
      // Add new interval
      merged.push(current);
    }
  }

  return merged;
}