import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;

  constructor(accessToken?: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google'
    );

    if (accessToken) {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }

  async createEvent(task: {
    title: string;
    description?: string;
    scheduledStart?: Date;
    scheduledEnd?: Date;
    estimatedDurationMinutes?: number;
  }) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const startTime = task.scheduledStart || new Date();
    const endTime = task.scheduledEnd || new Date(startTime.getTime() + (task.estimatedDurationMinutes || 30) * 60000);

    const event = {
      summary: task.title,
      description: task.description,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 30 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, updates: any) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    try {
      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: updates,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  async getEvents(timeMin?: Date, timeMax?: Date) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: (timeMin || new Date()).toISOString(),
        timeMax: (timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  async getFreeBusy(timeMin: Date, timeMax: Date) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    try {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: 'primary' }],
        },
      });
      return response.data.calendars?.primary?.busy || [];
    } catch (error) {
      console.error('Error fetching free/busy info:', error);
      throw error;
    }
  }
}