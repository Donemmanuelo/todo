const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')
  
  // Create a demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      timezone: 'UTC',
    },
  })
  
  console.log('Created demo user:', demoUser)
  
  // Create some sample tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        userId: demoUser.id,
        title: 'Complete project documentation',
        description: 'Write comprehensive docs for the new feature',
        priority: 'HIGH',
        status: 'PENDING',
        estimatedDurationMinutes: 120,
        source: 'MANUAL',
      },
    }),
    prisma.task.create({
      data: {
        userId: demoUser.id,
        title: 'Review pull requests',
        description: 'Check and approve pending PRs',
        priority: 'MEDIUM',
        status: 'SCHEDULED',
        estimatedDurationMinutes: 45,
        source: 'MANUAL',
      },
    }),
    prisma.task.create({
      data: {
        userId: demoUser.id,
        title: 'Team standup meeting',
        description: 'Daily sync with the team',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        estimatedDurationMinutes: 15,
        source: 'MANUAL',
      },
    }),
  ])
  
  console.log(`Created ${tasks.length} sample tasks`)
  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })