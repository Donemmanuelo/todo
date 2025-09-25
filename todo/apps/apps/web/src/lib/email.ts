import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendDailyReport(to: string, name: string, content: any) {
  if (!resend) {
    console.warn('RESEND_API_KEY not set; skipping email send');
    return;
  }
  await resend.emails.send({
    from: 'Smart To-Do <noreply@yourdomain.com>',
    to,
    subject: 'Your daily summary',
    html: `<h1>Daily Summary</h1><pre>${escapeHtml(JSON.stringify(content, null, 2))}</pre>`
  });
}

function escapeHtml(str: string) {
  return str.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
