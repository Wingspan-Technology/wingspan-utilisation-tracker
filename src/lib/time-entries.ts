import { prisma } from "@/lib/prisma";

export const timeEntryInclude = {
  task: { include: { project: { include: { client: true } } } },
  user: { select: { id: true, name: true, email: true } },
} as const;

export class TimeEntryValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function createTimeEntry(input: {
  userId: string;
  taskId: string;
  date: string;
  hours: number;
  description?: string | null;
}) {
  const { userId, taskId, date, hours, description } = input;

  if (!taskId || !date || hours == null) {
    throw new TimeEntryValidationError("Task, date and hours are required");
  }
  if (hours <= 0 || hours > 24) {
    throw new TimeEntryValidationError("Hours must be between 0 and 24");
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || !task.isActive) {
    throw new TimeEntryValidationError("Invalid or inactive task");
  }

  const entry = await prisma.timeEntry.create({
    data: {
      userId,
      taskId,
      date: new Date(date + "T00:00:00.000Z"),
      hours: parseFloat(String(hours)),
      description: description || null,
    },
    include: timeEntryInclude,
  });

  return { ...entry, date: entry.date.toISOString().split("T")[0] };
}
