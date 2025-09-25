export async function generateDailyReport(userId: string, date: Date) {
  // Query the DB for today's tasks
  // Note: imported lazily to avoid circular deps in edge environments
  const { prisma } = await import('./db');

  const start = new Date(date);
  const end = new Date(date);
  end.setDate(end.getDate() + 1);

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      createdAt: { gte: start, lt: end }
    },
    orderBy: { createdAt: 'asc' }
  });

  const completed = tasks.filter(t => t.status === 'COMPLETED');
  const scheduled = tasks.filter(t => t.status === 'SCHEDULED');
  const postponed = tasks.filter(t => t.status === 'POSTPONED');
  const skipped = tasks.filter(t => t.status === 'SKIPPED');
  const pending = tasks.filter(t => t.status === 'PENDING');

  return {
    date: start.toISOString().slice(0, 10),
    summary: {
      total: tasks.length,
      completed: completed.length,
      scheduled: scheduled.length,
      postponed: postponed.length,
      skipped: skipped.length,
      pending: pending.length
    },
    suggestions: [
      pending.length > 0 ? `Consider scheduling ${pending.length} pending task(s) early tomorrow.` : undefined,
      postponed.length > 0 ? `Review ${postponed.length} postponed task(s) for priority.` : undefined
    ].filter(Boolean)
  };
}