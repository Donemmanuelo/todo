# Smart To-Do (Email-Driven Task Management)

A cross-platform smart to-do application that allows scheduling and managing tasks via email (Gmail, Outlook, etc.) with intelligent auto-scheduling, daily reporting, and AI-enhanced features. Built for Vercel deployment with serverless architecture.

## 🚀 Features

### Core Functionality
- **Email-based task creation**: Send structured emails to create tasks automatically
- **Intelligent scheduling**: AI-powered optimal time slot suggestions based on priority, urgency, and availability
- **Calendar integration**: Google Calendar and Microsoft Outlook conflict detection
- **Smart postponement**: Automatic rescheduling with time availability checks
- **Daily reporting**: Automated end-of-day summaries with progress insights

### Cross-Platform Support
- **Web**: Next.js dashboard (primary interface)
- **Desktop**: Electron wrapper for native experience
- **Mobile**: React Native (Expo) companion app

### AI Features
- Natural language task parsing from emails
- Smart duration estimation
- Resource discovery and attachment
- Motivational insights based on completion patterns

## 🛠 Tech Stack

- **Frontend + API**: Next.js 14 (App Router) with serverless functions
- **Database**: PostgreSQL via Prisma (Supabase recommended)
- **Authentication**: NextAuth.js v5 Beta (Google + Microsoft OAuth)
- **Email**: Resend/SendGrid/Mailgun (inbound webhooks + outbound)
- **Scheduling**: Vercel Cron Jobs (upgradeable to Temporal for complex workflows)
- **AI/NLP**: OpenAI API (pluggable architecture)
- **Deployment**: Vercel (zero-config)

## 📁 Project Structure

```
todo/
├── apps/
│   ├── web/               # Next.js 14 web app (main)
│   │   ├── prisma/        # Database schema & migrations
│   │   ├── src/           # Application source code
│   │   │   ├── app/       # Next.js App Router
│   │   │   └── lib/       # Utilities & services
│   │   └── vercel.json    # Vercel cron configuration
│   ├── desktop/           # Electron wrapper
│   └── mobile/            # React Native (Expo)
├── packages/              # Shared packages (future)
├── docker-compose.yml     # Local Postgres + Redis
├── .env.example          # Environment template
├── package.json          # Monorepo workspace config
└── README.md
```

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- pnpm 8+ (project uses 8.15.4, update available to 10.17.1)
- Docker Desktop (REQUIRED - must be running for local database)

### 1. Clone and Install
```bash
git clone <your-repo>
cd todo
pnpm install
```

### 2. Environment Setup
```bash
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your values:
# - Set DATABASE_URL for your PostgreSQL instance
# - Add OAuth credentials when available
# - Configure email provider API keys
```

### 3. Start Database
```bash
# Ensure Docker Desktop is running first!
pnpm docker:up
# This starts PostgreSQL and Redis containers
```

### 4. Database Migration
```bash
# Ensure DATABASE_URL is set in apps/web/.env.local
pnpm db:migrate
pnpm db:seed  # Seeds initial data (optional)
```

### 5. Run Development Server
```bash
pnpm dev
```

The web app will be available at `http://localhost:3000`.

### 6. Run Cross-Platform Apps
```bash
# Desktop (Electron)
pnpm dev:desktop

# Mobile (Expo)
pnpm dev:mobile
```

## 🚀 Production Deployment (Vercel)

### 1. Database Setup
Recommended: **Supabase** (includes pgBouncer)
- Create new Supabase project
- Copy connection string to `DATABASE_URL`
- Enable Row Level Security if needed

Alternative: PlanetScale, Railway, or any Postgres provider

### 2. OAuth Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google Calendar API and Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`

#### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register new application in Azure AD
3. Add redirect URI: `https://yourdomain.com/api/auth/callback/azure-ad`
4. Grant Calendar.Read and Mail.Read permissions

### 3. Email Provider Setup

Choose one:

#### Resend (Recommended)
1. Sign up at [resend.com](https://resend.com)
2. Get API key
3. Set up inbound parsing:
   - Add webhook: `https://yourdomain.com/api/email/inbound`
   - Configure MX records for your domain

#### SendGrid
1. Set up Inbound Parse webhook
2. Point to: `https://yourdomain.com/api/email/inbound`

### 4. Vercel Deployment
1. Push code to GitHub
2. Import project in Vercel dashboard
3. Vercel auto-detects Next.js and builds `apps/web`
4. Set environment variables in Vercel dashboard:

```bash
# Required
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://yourdomain.com
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=your-google-id
GOOGLE_CLIENT_SECRET=your-google-secret
AZURE_AD_CLIENT_ID=your-azure-id
AZURE_AD_CLIENT_SECRET=your-azure-secret
AZURE_AD_TENANT_ID=your-tenant-id
RESEND_API_KEY=your-resend-key

# Optional
OPENAI_API_KEY=your-openai-key
CRON_SECRET=your-cron-secret
ENCRYPTION_KEY=base64-key-for-encryption
```

### 5. Cron Job Setup
The `vercel.json` file configures daily reports at 22:00 UTC. Customize timing as needed.

## 📧 Email Integration

### Sending Tasks via Email
Send emails to your configured inbound address with:

```
Subject: Complete project proposal

Body:
Finish the Q4 project proposal for client review.
Priority: High
Estimated: 2 hours
```

The system will:
1. Parse email content for task details
2. Extract priority and duration hints
3. Create task in your account
4. Auto-schedule based on availability

### Email Patterns
- **Priority**: "urgent", "high priority", "low priority"
- **Duration**: "30 minutes", "2 hours", "1 hr"
- **Scheduling**: "tomorrow after lunch", "next week" (AI-enhanced)

## 🤖 AI Features

### Current Capabilities
- Email-to-task parsing with priority detection
- Duration estimation from content
- Basic scheduling optimization

### Future Enhancements (with OpenAI API)
- Advanced natural language understanding
- Context-aware resource suggestions
- Productivity pattern analysis
- Motivational messaging

## 🔧 API Endpoints

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task

### Scheduling
- `POST /api/schedule` - Auto-schedule tasks

### Calendar
- `GET /api/calendar/availability` - Check calendar availability

### Google Calendar Integration
- Requires Google OAuth with the following scope:
  - https://www.googleapis.com/auth/calendar.events
- Ensure the provider is configured to request offline access (to receive a refresh token)
- When tasks are scheduled, an event is created in the user's primary Google Calendar with default reminders.
- When tasks are postponed or deleted, the corresponding calendar event is removed.

### Email
- `POST /api/email/inbound` - Webhook for inbound emails

### Authentication
- `/api/auth/[...nextauth]` - NextAuth.js dynamic route

### Cron
- `POST /api/cron/daily-report` - Generate daily reports (22:00 UTC)

## 📱 Cross-Platform Development

### Desktop (Electron)
Wraps the web app in a native container:
```bash
pnpm dev:desktop  # Development
pnpm build:desktop  # Build distributable
```

### Mobile (React Native + Expo)
Standalone mobile experience:
```bash
pnpm dev:mobile  # Start Expo dev server
expo build:android  # Build APK
expo build:ios  # Build IPA (Mac only)
```

## 🔒 Security

- OAuth 2.0 for email/calendar access
- Database-backed sessions via NextAuth
- Optional field encryption for sensitive data
- Webhook signature verification
- Rate limiting on API routes

## ⚠️ Known Issues & Setup Requirements

### Prerequisites
- **Docker Desktop**: MUST be running for database commands (`docker:up`, `docker:down`)
- **Environment Variables**: 
  - Copy `.env.example` to `apps/web/.env.local` for Next.js
  - Also copy to `apps/web/.env` for Prisma CLI commands
  - Configure DATABASE_URL with correct credentials (postgres:postgres)
- **Dependencies**: Run `pnpm install` in the root directory before any other commands

### Known Issues
- **NextAuth v5**: Project uses beta version (5.0.0-beta.29) for latest features. Consider downgrading to v4.24.11 for production stability
- **ESLint**: Recently updated to v9 to resolve deprecation warnings  
- **pnpm**: Consider updating to latest version (10.17.1) from current 8.15.4
- **Prisma Schema**: Fixed - default values for workday times now use static values (540 for 9am, 1080 for 6pm)
- **Seed File**: Created at `apps/web/prisma/seed.ts` with CommonJS format for ts-node compatibility

## 🎯 Roadmap

### Phase 1 (Current)
- [x] Core task management
- [x] Email integration 
- [x] Basic scheduling
- [x] Cross-platform apps structure

### Phase 2
- [ ] Advanced AI features
- [ ] Calendar sync
- [ ] Mobile push notifications
- [ ] Team collaboration

### Phase 3
- [ ] Temporal workflow engine
- [ ] Advanced analytics
- [ ] Plugin system
- [ ] Multi-language support

## 🔧 Troubleshooting

### Common Issues

1. **`pnpm docker:up` fails**
   - Ensure Docker Desktop is running
   - Check Docker daemon status: `docker ps`
   - On macOS: Open Docker Desktop app first

2. **`pnpm db:migrate` fails with "DATABASE_URL not found"**
   - Create `.env.local` file: `cp .env.example apps/web/.env.local`
   - **Important**: Also create `.env` for Prisma: `cp .env.local .env` (in apps/web directory)
   - Prisma CLI reads from `.env`, Next.js reads from `.env.local`
   - For local dev: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todo"`

3. **`pnpm install` fails with version errors**
   - Clear cache: `pnpm store prune`
   - Delete node_modules: `rm -rf node_modules apps/*/node_modules`
   - Reinstall: `pnpm install`

4. **NextAuth errors**
   - Currently using v5 beta (5.0.0-beta.29)
   - For stability, downgrade to v4: Edit `apps/web/package.json` to use `"next-auth": "^4.24.11"`

5. **Port 3000 already in use**
   - Kill existing process: `lsof -ti:3000 | xargs kill -9`
   - Or change port in `apps/web/package.json` dev script

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

---

**Need help?** Open an issue or check the troubleshooting guide in the wiki.
