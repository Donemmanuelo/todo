# Smart To-Do Integration Setup Guide

This guide will help you set up Keycloak authentication, Google Calendar integration, and email reporting for the Smart To-Do application.

## Table of Contents
1. [Keycloak Setup](#keycloak-setup)
2. [Google Calendar Integration](#google-calendar-integration)
3. [Email Configuration](#email-configuration)
4. [Testing the Integrations](#testing-the-integrations)

---

## Keycloak Setup

### 1. Access Keycloak Admin Console

After starting Docker containers, Keycloak will be available at:
- **URL**: http://localhost:8080
- **Admin Username**: admin
- **Admin Password**: admin

### 2. Create a New Realm

1. Click on the dropdown (currently showing "master") in the top-left corner
2. Click "Create Realm"
3. Name: `todo`
4. Click "Create"

### 3. Create a Client Application

1. Navigate to **Clients** in the left menu
2. Click **Create client**
3. Configure:
   - **Client type**: OpenID Connect
   - **Client ID**: `todo-app`
   - **Name**: Todo Application
4. Click **Next**
5. Enable:
   - **Client authentication**: ON
   - **Authorization**: ON
6. Click **Next**
7. Set Valid redirect URIs:
   - `http://localhost:3000/*`
   - `http://localhost:3000/api/auth/callback/keycloak`
8. Click **Save**

### 4. Get Client Secret

1. Go to the **Credentials** tab of your client
2. Copy the **Client secret**
3. Add it to your `.env.local` file:
```env
KEYCLOAK_CLIENT_ID=todo-app
KEYCLOAK_CLIENT_SECRET=<your-client-secret>
KEYCLOAK_ISSUER=http://localhost:8080/realms/todo
```

### 5. Create Test Users

1. Navigate to **Users** in the left menu
2. Click **Add user**
3. Fill in:
   - **Username**: testuser
   - **Email**: test@example.com
   - **Email verified**: ON
4. Click **Create**
5. Go to **Credentials** tab
6. Set a password (temporary: OFF)

---

## Google Calendar Integration

### 1. Enable Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable APIs:
   - Google Calendar API
   - Gmail API (for future email parsing features)

### 2. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Configure consent screen if needed
4. Application type: **Web application**
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
6. Copy the **Client ID** and **Client Secret**

### 3. Update Environment Variables

Add to your `.env.local`:
```env
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

---

## Email Configuration

### Option 1: Gmail SMTP

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security > 2-Step Verification > App passwords
   - Generate a password for "Mail"
3. Update `.env.local`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<app-password>
SMTP_FROM="Smart To-Do" <your-email@gmail.com>
```

### Option 2: SendGrid

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create an API key
3. Update `.env.local`:
```env
SENDGRID_API_KEY=<your-api-key>
```

### Option 3: Resend

1. Sign up at [Resend](https://resend.com/)
2. Get your API key
3. Update `.env.local`:
```env
RESEND_API_KEY=<your-api-key>
```

---

## Testing the Integrations

### 1. Test Keycloak Authentication

```bash
# Visit the application
open http://localhost:3000

# Click "Sign in" - you should be redirected to Keycloak
# Login with your test user credentials
# You should be redirected back to the application
```

### 2. Test Google Calendar Sync

```javascript
// Using curl to test calendar sync
curl -X POST http://localhost:3000/api/calendar/sync \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "taskId": "<task-id>",
    "action": "create"
  }'

// Get calendar events
curl http://localhost:3000/api/calendar/sync \
  -H "Cookie: <your-session-cookie>"
```

### 3. Test Email Reports

```javascript
// Send daily report
curl -X POST http://localhost:3000/api/reports/email \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "type": "daily"
  }'

// Send weekly report
curl -X POST http://localhost:3000/api/reports/email \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "type": "weekly"
  }'
```

---

## API Endpoints

### Authentication
- `GET /api/auth/signin` - Initiate authentication flow
- `GET /api/auth/signout` - Sign out user
- `GET /api/auth/session` - Get current session

### Calendar Integration
- `POST /api/calendar/sync` - Sync task with Google Calendar
  - Actions: `create`, `update`, `delete`
- `GET /api/calendar/sync` - Get calendar events and free/busy info
- `GET /api/calendar/availability` - Check calendar availability

### Email Reports
- `POST /api/reports/email` - Send email report
  - Types: `daily`, `weekly`
- `GET /api/reports/email` - Get report history

### Task Management
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task
- `POST /api/schedule` - Auto-schedule tasks

---

## Automated Reports Setup

### Daily Reports (Cron Job)

The application uses Vercel cron jobs for automated daily reports. The configuration is in `apps/web/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-report",
      "schedule": "0 22 * * *"
    }
  ]
}
```

For local development, you can use node-cron:

```bash
npm install node-cron
```

Then create a script to run reports:

```javascript
const cron = require('node-cron');

// Run daily at 10 PM
cron.schedule('0 22 * * *', async () => {
  await fetch('http://localhost:3000/api/cron/daily-report', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`
    }
  });
});
```

---

## Troubleshooting

### Keycloak Issues

**Problem**: Can't access Keycloak admin console
- **Solution**: Ensure Docker is running and port 8080 is not in use
```bash
docker ps | grep keycloak
lsof -i:8080
```

**Problem**: Authentication redirect fails
- **Solution**: Check redirect URIs in Keycloak client settings match your application URL

### Google Calendar Issues

**Problem**: Calendar sync fails with 401 error
- **Solution**: Re-authenticate with Google to refresh tokens

**Problem**: Events not appearing in calendar
- **Solution**: Check that the Google Calendar API is enabled and scopes include calendar access

### Email Issues

**Problem**: Emails not sending
- **Solution**: 
  - Check SMTP credentials
  - For Gmail, ensure app password is used (not regular password)
  - Check firewall/network settings for SMTP port

**Problem**: Email formatting issues
- **Solution**: Test with different email clients; the HTML templates are optimized for modern clients

---

## Security Considerations

1. **Never commit secrets to version control**
   - Use `.env.local` for local development
   - Use environment variables in production

2. **Keycloak Security**
   - Change default admin credentials in production
   - Use HTTPS in production
   - Configure proper CORS settings

3. **Google OAuth**
   - Restrict redirect URIs to your domains only
   - Regularly rotate client secrets

4. **Email Security**
   - Use app-specific passwords for SMTP
   - Implement rate limiting for email sending
   - Verify recipient email addresses

---

## Production Deployment

For production deployment on Vercel:

1. Add all environment variables to Vercel project settings
2. Update URLs to use your production domain
3. Configure Keycloak with production realm settings
4. Update Google OAuth redirect URIs
5. Use a production email service (SendGrid, Resend, etc.)

---

## Support

For issues or questions:
- Check the [troubleshooting section](#troubleshooting)
- Review logs in Docker: `docker logs keycloak`
- Check application logs: `pnpm dev` output
