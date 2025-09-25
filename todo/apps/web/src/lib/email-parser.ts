import { z } from 'zod';

export async function parseEmailToTask(text: string, subject?: string) {
  // Very simple heuristic + NLP placeholder
  const title = subject?.trim() || text.split('\n')[0]?.slice(0, 120) || 'New Task';
  const lower = (text || '').toLowerCase();

  // Priority detection
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
  if (/(urgent|asap|today only|critical)/.test(lower)) priority = 'URGENT';
  else if (/(high priority|soon)/.test(lower)) priority = 'HIGH';
  else if (/(low priority|whenever)/.test(lower)) priority = 'LOW';

  // Duration detection
  const durationMatch = lower.match(/(\d{1,3})\s*(min|minute|minutes|hour|hours|hr|hrs)/);
  let estimatedDurationMinutes = 30;
  if (durationMatch) {
    const n = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2];
    estimatedDurationMinutes = /hour|hr/.test(unit) ? n * 60 : n;
  }

  // Natural language like "tomorrow after lunch" can be handled later via AI
  return {
    title,
    description: text?.slice(0, 2000) || undefined,
    priority,
    estimatedDurationMinutes,
  };
}
