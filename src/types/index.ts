export type Role = "ADMIN" | "USER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  client: Client;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isBillable: boolean;
  color: string;
  createdAt: string;
  project: Project;
}

export interface TimeEntry {
  id: string;
  userId: string;
  taskId: string;
  date: string;
  hours: number;
  description: string | null;
  createdAt: string;
  task: Task;
  user: { id: string; name: string; email: string };
}

export interface SessionPayload {
  sub: string;
  role: Role;
  name: string;
  email: string;
}
