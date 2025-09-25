import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { EmailService } from '@/lib/email-service';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, recipientEmail } = await req.json();

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const emailService = new EmailService();
    const email = recipientEmail || user.email || session.user.email;

    if (!email) {
      return NextResponse.json({ error: 'No email address available' }, { status: 400 });
    }

    let result;
    switch (type) {
      case 'daily':
        result = await emailService.sendDailyReport(user.id, email, user.name || undefined);
        break;
      
      case 'weekly':
        result = await emailService.sendWeeklyReport(user.id, email, user.name || undefined);
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} report sent successfully`,
      result 
    });
  } catch (error) {
    console.error('Email report error:', error);
    return NextResponse.json(
      { error: 'Failed to send email report' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get report history for the user
    const reports = await prisma.dailyReport.findMany({
      where: { userId: (session.user as any).id },
      orderBy: { date: 'desc' },
      take: 30,
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Fetch reports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}