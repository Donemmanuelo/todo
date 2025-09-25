import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth, signOut } from '../../auth';
import { SmartScheduler } from '@/lib/smart-scheduler';
import NotificationManager from '@/components/NotificationManager';
import { completeTask, postponeTask, deleteTask, unpostponeTask } from '@/lib/task-actions';

async function addTask(formData: FormData) {
  'use server';
  const title = String(formData.get('title') || 'New Task');
  const description = String(formData.get('description') || '');
  const priority = String(formData.get('priority') || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  const estimatedDurationMinutes = parseInt(String(formData.get('duration') || '30'));
  const taskType = String(formData.get('taskType') || 'specific'); // 'daily' or 'specific'

  // Get current user from session
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('User not authenticated');
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    user = await prisma.user.create({ 
      data: { 
        email: session.user.email, 
        name: session.user.name || 'User', 
        timezone: 'UTC' 
      } 
    });
  }

  await prisma.task.create({
    data: {
      userId: user.id,
      title,
      description: description || null,
      priority,
      estimatedDurationMinutes,
      source: 'MANUAL',
      events: { create: { type: 'CREATED' } },
    },
  });

  revalidatePath('/');
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const session = await auth();
  
  if (!session) {
    return null; // This should not happen due to middleware, but just in case
  }

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: session.user!.email! } });
  if (!user) {
    user = await prisma.user.create({ 
      data: { 
        email: session.user!.email!, 
        name: session.user!.name || 'User', 
        timezone: 'UTC' 
      } 
    });
  }

  // Build where clause for filtering
  const whereClause: any = { userId: user.id };
  if (searchParams.filter && searchParams.filter !== 'all') {
    whereClause.status = searchParams.filter.toUpperCase();
  }

  const tasks = await prisma.task.findMany({ 
    where: whereClause,
    orderBy: [{ createdAt: 'desc' }], 
    take: 20 
  });

  const statusColors = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    SCHEDULED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/30',
    SKIPPED: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    POSTPONED: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    CANCELED: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass rounded-2xl p-6 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent animate-slideIn">
              Welcome back, {session.user?.name || session.user?.email || 'User'}!
            </h2>
            <p className="text-blue-200/70 mt-1 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
              Here's what's on your plate today
            </p>
          </div>
          <form action={addTask} className="w-full sm:w-auto animate-slideIn" style={{ animationDelay: '0.3s' }}>
            <div className="glass rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input 
                  name="title" 
                  placeholder="What needs to be done?" 
                  className="px-4 py-2 glass rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all" 
                  required 
                />
                <select 
                  name="priority" 
                  className="px-4 py-2 glass rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-slate-800/50"
                >
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select 
                  name="duration" 
                  className="px-4 py-2 glass rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-slate-800/50"
                >
                  <option value="15">15 minutes</option>
                  <option value="30" selected>30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="180">3 hours</option>
                  <option value="240">4 hours</option>
                </select>
                <select 
                  name="taskType" 
                  className="px-4 py-2 glass rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-slate-800/50"
                >
                  <option value="specific">Specific Task</option>
                  <option value="daily">Daily Task</option>
                </select>
              </div>
              
              <textarea 
                name="description" 
                placeholder="Task description (optional)..." 
                rows={2}
                className="w-full px-4 py-2 glass rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all resize-none" 
              />
              
              <div className="flex gap-2">
                <button 
                  type="submit"
                  className="flex-1 relative overflow-hidden px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 animate-glow" 
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Task
                  </span>
                  <div className="absolute inset-0 shimmer" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: tasks.length, color: 'from-blue-400 to-blue-600', delay: '0.4s', filter: 'all' },
          { label: 'Pending', value: tasks.filter(t => t.status === 'PENDING').length, color: 'from-yellow-400 to-orange-600', delay: '0.5s', filter: 'pending' },
          { label: 'Scheduled', value: tasks.filter(t => t.status === 'SCHEDULED').length, color: 'from-purple-400 to-pink-600', delay: '0.6s', filter: 'scheduled' },
          { label: 'Completed', value: tasks.filter(t => t.status === 'COMPLETED').length, color: 'from-green-400 to-emerald-600', delay: '0.7s', filter: 'completed' },
        ].map((stat, index) => {
          const isActive = searchParams.filter === stat.filter || (!searchParams.filter && stat.filter === 'all');
          return (
            <a 
              key={stat.label} 
              href={`?filter=${stat.filter}`}
              className={`glass rounded-xl p-6 hover:scale-105 transition-all duration-300 cursor-pointer animate-fadeIn hover:shadow-lg hover:shadow-blue-500/20 ${
                isActive ? 'ring-2 ring-blue-400 bg-blue-500/10' : ''
              }`} 
              style={{ animationDelay: stat.delay }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300/70">{stat.label}</p>
                  <p className={`text-3xl font-bold mt-1 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent animate-pulse-slow`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} opacity-30 animate-float`} style={{ animationDelay: `${index * 0.5}s` }} />
              </div>
            </a>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tasks List */}
        <section className="lg:col-span-2 glass rounded-2xl p-6 animate-fadeIn" style={{ animationDelay: '0.8s' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Recent Tasks
            </h3>
            <button className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline">
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-blue-400/30 mb-4 animate-float" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-blue-300/70">No tasks yet</p>
                <p className="text-sm text-blue-400/50 mt-1">Create your first task above</p>
              </div>
            ) : (
              tasks.slice(0, 10).map((t, index) => {
                const priorityColors = {
                  LOW: 'text-gray-400',
                  MEDIUM: 'text-blue-400', 
                  HIGH: 'text-orange-400',
                  URGENT: 'text-red-400'
                };
                
                return (
                  <div 
                    key={t.id} 
                    className="group glass rounded-xl p-4 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer hover:translate-x-1 animate-slideIn"
                    style={{ animationDelay: `${0.9 + index * 0.1}s` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <form action={async () => {
                          'use server'
                          if (t.status !== 'COMPLETED') {
                            await completeTask(t.id, user.id);
                          }
                        }}>
                          <button 
                            type="submit"
                            className={`w-5 h-5 rounded-full border-2 transition-all duration-300 mt-1 ${
                              t.status === 'COMPLETED' 
                                ? 'bg-green-400 border-green-400 shadow-lg shadow-green-400/50' 
                                : 'border-blue-400/50 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-400/50'
                            }`}
                            disabled={t.status === 'COMPLETED'}
                          >
                            {t.status === 'COMPLETED' && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        </form>
                        <div className="flex-1">
                          <div className="font-medium text-white">{t.title}</div>
                          {t.description && (
                            <div className="text-sm text-blue-200/70 mt-1">
                              {t.description}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className="text-blue-300/50">
                              {new Date(t.createdAt).toLocaleDateString()}
                            </span>
                            <span className={`px-2 py-1 rounded-full bg-slate-700/50 ${priorityColors[t.priority]}`}>
                              {t.priority}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-slate-700/50 text-cyan-400">
                              {t.estimatedDurationMinutes}min
                            </span>
                            {t.scheduledStart && (
                              <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                                {new Date(t.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Action buttons for scheduled tasks */}
                        {t.status === 'SCHEDULED' && (
                          <div className="flex items-center gap-1">
                            {/* Swap button */}
                            <button 
                              className="px-2 py-1 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-all task-swap-btn"
                              title="Swap with another task"
                              data-task-id={t.id}
                              data-task-title={t.title}
                            >
                              ⇄
                            </button>
                            
                            {/* Postpone button */}
                            <form action={async () => {
                              'use server'
                              await postponeTask(t.id, user.id, 'Postponed by user');
                            }}>
                              <button 
                                type="submit"
                                className="px-2 py-1 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded transition-all"
                                title="Postpone task"
                              >
                                ⏸
                              </button>
                            </form>
                          </div>
                        )}

                        {t.status === 'POSTPONED' && (
                          <form action={async () => {
                            'use server'
                            await unpostponeTask(t.id, user.id);
                          }}>
                            <button 
                              type="submit"
                              className="px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded transition-all"
                              title="Unpostpone and reschedule"
                            >
                              ▶
                            </button>
                          </form>
                        )}

                        {/* Delete button (allowed for any status) */}
                        <form action={async () => {
                          'use server'
                          await deleteTask(t.id, user.id);
                        }}>
                          <button 
                            type="submit"
                            className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                            title="Delete task"
                          >
                            ␡
                          </button>
                        </form>

                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusColors[t.status] || statusColors.PENDING} backdrop-blur-sm flex-shrink-0`}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="glass rounded-2xl p-6 animate-fadeIn" style={{ animationDelay: '0.9s' }}>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <form action={async () => {
              'use server'
              
              const session = await auth();
              if (!session?.user?.email) return;
              
              const user = await prisma.user.findUnique({ 
                where: { email: session.user.email } 
              });
              if (!user) return;
              
              // Use SmartScheduler directly
              const scheduler = new SmartScheduler();
              await scheduler.scheduleAllPendingTasks(user.id);
              
              revalidatePath('/');
            }}>
              <button 
                type="submit"
                className="w-full relative overflow-hidden text-left p-4 rounded-xl glass hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 group hover:translate-x-1 animate-slideIn" 
                style={{ animationDelay: '1s' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:animate-glow">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-white">Schedule Tasks</p>
                    <p className="text-sm text-blue-300/70">Auto-schedule pending tasks</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/10 to-blue-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </button>
            </form>

            <button className="w-full relative overflow-hidden text-left p-4 rounded-xl glass hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 group hover:translate-x-1 animate-slideIn" style={{ animationDelay: '1.1s' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:animate-glow">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-white">Email to Task</p>
                  <p className="text-sm text-purple-300/70">Send tasks via email</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </button>

            <div className="pt-4 border-t border-blue-500/20 animate-fadeIn" style={{ animationDelay: '1.2s' }}>
              <p className="text-sm font-medium text-blue-300/70 mb-3">Account</p>
              <div className="space-y-2">
                <div className="text-xs text-blue-400/70 px-3 py-2 glass rounded-lg">
                  Signed in as: {session.user?.email || 'Unknown'}
                </div>
                
                {/* Working Hours Configuration */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-blue-300/70">Working Hours</p>
                  <form action={async (formData: FormData) => {
                    'use server'
                    
                    const startHour = parseInt(String(formData.get('startHour') || '9'));
                    const startMinute = parseInt(String(formData.get('startMinute') || '0'));
                    const endHour = parseInt(String(formData.get('endHour') || '17'));
                    const endMinute = parseInt(String(formData.get('endMinute') || '0'));
                    
                    const startMinutes = startHour * 60 + startMinute;
                    const endMinutes = endHour * 60 + endMinute;
                    
                    const session = await auth();
                    if (!session?.user?.email) return;
                    
                    const user = await prisma.user.findUnique({ 
                      where: { email: session.user.email } 
                    });
                    if (!user) return;
                    
                    await prisma.user.update({
                      where: { id: user.id },
                      data: {
                        workdayStartMin: startMinutes,
                        workdayEndMin: endMinutes
                      }
                    });

                    // Clear existing schedules for pending/scheduled tasks and reschedule under new hours
                    await prisma.task.updateMany({
                      where: {
                        userId: user.id,
                        status: { in: ['PENDING', 'SCHEDULED'] }
                      },
                      data: {
                        status: 'PENDING',
                        scheduledStart: null,
                        scheduledEnd: null,
                      }
                    });

                    const scheduler = new SmartScheduler();
                    await scheduler.scheduleAllPendingTasks(user.id);
                    
                    revalidatePath('/');
                  }} className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-blue-300/50">Start</label>
                        <div className="flex gap-1">
                          <select 
                            name="startHour" 
                            defaultValue={Math.floor((user.workdayStartMin || 540) / 60)}
                            className="flex-1 px-2 py-1 text-xs glass rounded bg-slate-800/50 text-white"
                          >
                            {Array.from({length: 24}, (_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                          <select 
                            name="startMinute" 
                            defaultValue={(user.workdayStartMin || 540) % 60}
                            className="flex-1 px-2 py-1 text-xs glass rounded bg-slate-800/50 text-white"
                          >
                            <option value={0}>00</option>
                            <option value={15}>15</option>
                            <option value={30}>30</option>
                            <option value={45}>45</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-blue-300/50">End</label>
                        <div className="flex gap-1">
                          <select 
                            name="endHour" 
                            defaultValue={Math.floor((user.workdayEndMin || 1080) / 60)}
                            className="flex-1 px-2 py-1 text-xs glass rounded bg-slate-800/50 text-white"
                          >
                            {Array.from({length: 24}, (_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                          <select 
                            name="endMinute" 
                            defaultValue={(user.workdayEndMin || 1080) % 60}
                            className="flex-1 px-2 py-1 text-xs glass rounded bg-slate-800/50 text-white"
                          >
                            <option value={0}>00</option>
                            <option value={15}>15</option>
                            <option value={30}>30</option>
                            <option value={45}>45</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      className="w-full px-3 py-1 text-xs font-medium text-blue-400 glass rounded-lg hover:bg-blue-500/10 hover:border-blue-400/50 transition-all duration-300"
                    >
                      Update Hours
                    </button>
                  </form>
                </div>
                
                {/* Notification Manager */}
                <NotificationManager 
                  scheduledTasks={tasks.filter(t => t.status === 'SCHEDULED').map(t => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    scheduledStart: t.scheduledStart?.toISOString() || null,
                    scheduledEnd: t.scheduledEnd?.toISOString() || null
                  }))}
                />
                
                <form action={async () => {
                  'use server'
                  await signOut({ redirectTo: '/auth/signin' })
                }}>
                  <button 
                    type="submit"
                    className="w-full px-4 py-2 text-center text-sm font-medium text-red-400 glass rounded-lg hover:bg-red-500/10 hover:border-red-400/50 transition-all duration-300 hover:scale-105"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      <TaskSwapScript />
    </div>
  );
}

// Add client-side script for task swapping
const TaskSwapScript = () => {
  return (
    <script dangerouslySetInnerHTML={{
      __html: `
        document.addEventListener('DOMContentLoaded', function() {
          let selectedTask = null;
          
          document.querySelectorAll('.task-swap-btn').forEach(button => {
            button.addEventListener('click', function() {
              const taskId = this.dataset.taskId;
              const taskTitle = this.dataset.taskTitle;
              
              if (!selectedTask) {
                // First selection
                selectedTask = { id: taskId, title: taskTitle, element: this };
                this.style.background = 'rgba(147, 51, 234, 0.2)';
                this.textContent = '⇄ Selected';
                
                // Show instructions
                const instruction = document.createElement('div');
                instruction.id = 'swap-instruction';
                instruction.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-purple-500 text-white rounded-lg z-50';
                instruction.textContent = 'Click another scheduled task to swap';
                document.body.appendChild(instruction);
              } else if (selectedTask.id === taskId) {
                // Cancel selection
                selectedTask.element.style.background = '';
                selectedTask.element.textContent = '⇄';
                selectedTask = null;
                
                const instruction = document.getElementById('swap-instruction');
                if (instruction) instruction.remove();
              } else {
                // Perform swap
                fetch('/api/tasks/swap', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    taskId1: selectedTask.id, 
                    taskId2: taskId 
                  })
                })
                .then(response => response.json())
                .then(data => {
                  if (data.success) {
                    location.reload(); // Refresh to show updated schedule
                  } else {
                    alert('Failed to swap tasks: ' + (data.error || 'Unknown error'));
                  }
                })
                .catch(error => {
                  alert('Error swapping tasks: ' + error.message);
                });
                
                // Clean up
                selectedTask.element.style.background = '';
                selectedTask.element.textContent = '⇄';
                selectedTask = null;
                
                const instruction = document.getElementById('swap-instruction');
                if (instruction) instruction.remove();
              }
            });
          });
        });
      `
    }} />
  );
};

