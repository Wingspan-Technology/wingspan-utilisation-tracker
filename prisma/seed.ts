import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("Seeding database…");

  const admin = await prisma.user.upsert({
    where: { email: "admin@wingspan.com" },
    update: {},
    create: {
      email: "admin@wingspan.com",
      password: "admin123",
      name: "Admin User",
      role: "ADMIN",
      isActive: true,
    },
  });

  const dev1 = await prisma.user.upsert({
    where: { email: "alice@wingspan.com" },
    update: {},
    create: {
      email: "alice@wingspan.com",
      password: "alice123",
      name: "Alice Smith",
      role: "USER",
      isActive: true,
    },
  });

  const dev2 = await prisma.user.upsert({
    where: { email: "bob@wingspan.com" },
    update: {},
    create: {
      email: "bob@wingspan.com",
      password: "bob123",
      name: "Bob Jones",
      role: "USER",
      isActive: true,
    },
  });

  // Clients
  const wingspan = await prisma.client.upsert({
    where: { name: "Wingspan Internal" },
    update: {},
    create: { name: "Wingspan Internal", slug: generateSlug("Wingspan Internal"), isActive: true },
  });

  const acme = await prisma.client.upsert({
    where: { name: "Acme Corp" },
    update: {},
    create: { name: "Acme Corp", slug: generateSlug("Acme Corp"), isActive: true },
  });

  const beta = await prisma.client.upsert({
    where: { name: "Beta Ltd" },
    update: {},
    create: { name: "Beta Ltd", slug: generateSlug("Beta Ltd"), isActive: true },
  });

  // Projects
  const adminProj = await prisma.project.upsert({
    where: { clientId_name: { clientId: wingspan.id, name: "Admin & Operations" } },
    update: {},
    create: { clientId: wingspan.id, name: "Admin & Operations", slug: generateSlug("Admin & Operations"), isActive: true },
  });

  const rdProj = await prisma.project.upsert({
    where: { clientId_name: { clientId: wingspan.id, name: "R&D" } },
    update: {},
    create: { clientId: wingspan.id, name: "R&D", slug: generateSlug("R&D"), isActive: true },
  });

  const acmeWeb = await prisma.project.upsert({
    where: { clientId_name: { clientId: acme.id, name: "Website Redesign" } },
    update: {},
    create: { clientId: acme.id, name: "Website Redesign", slug: generateSlug("Website Redesign"), isActive: true },
  });

  const betaApp = await prisma.project.upsert({
    where: { clientId_name: { clientId: beta.id, name: "Mobile App" } },
    update: {},
    create: { clientId: beta.id, name: "Mobile App", slug: generateSlug("Mobile App"), isActive: true },
  });

  // Tasks
  const tasks = await Promise.all([
    prisma.task.upsert({
      where: { projectId_name: { projectId: adminProj.id, name: "Meetings" } },
      update: {},
      create: { projectId: adminProj.id, name: "Meetings", isBillable: false, isActive: true },
    }),
    prisma.task.upsert({
      where: { projectId_name: { projectId: rdProj.id, name: "Research" } },
      update: {},
      create: { projectId: rdProj.id, name: "Research", isBillable: false, isActive: true },
    }),
    prisma.task.upsert({
      where: { projectId_name: { projectId: acmeWeb.id, name: "Development" } },
      update: {},
      create: { projectId: acmeWeb.id, name: "Development", isBillable: true, isActive: true },
    }),
    prisma.task.upsert({
      where: { projectId_name: { projectId: acmeWeb.id, name: "Design" } },
      update: {},
      create: { projectId: acmeWeb.id, name: "Design", isBillable: true, isActive: true },
    }),
    prisma.task.upsert({
      where: { projectId_name: { projectId: betaApp.id, name: "Development" } },
      update: {},
      create: { projectId: betaApp.id, name: "Development", isBillable: true, isActive: true },
    }),
  ]);

  const today = new Date();
  const entries = [
    { userId: dev1.id, taskId: tasks[2].id, daysAgo: 0, hours: 4, desc: "Feature: user auth flow" },
    { userId: dev1.id, taskId: tasks[0].id, daysAgo: 0, hours: 1, desc: "Team standup" },
    { userId: dev1.id, taskId: tasks[3].id, daysAgo: 1, hours: 3, desc: "Wireframes review" },
    { userId: dev2.id, taskId: tasks[4].id, daysAgo: 0, hours: 5, desc: "API integration" },
    { userId: dev2.id, taskId: tasks[1].id, daysAgo: 1, hours: 2, desc: "Spike: new framework eval" },
  ];

  for (const e of entries) {
    const date = new Date(today);
    date.setDate(date.getDate() - e.daysAgo);
    await prisma.timeEntry.create({
      data: {
        userId: e.userId,
        taskId: e.taskId,
        date: new Date(date.toISOString().split("T")[0] + "T00:00:00.000Z"),
        hours: e.hours,
        description: e.desc,
      },
    });
  }

  console.log(`✓ admin@wingspan.com / admin123`);
  console.log(`✓ alice@wingspan.com / alice123`);
  console.log(`✓ bob@wingspan.com / bob123`);
  console.log(`✓ 3 clients, 4 projects, ${tasks.length} tasks, ${entries.length} time entries`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
