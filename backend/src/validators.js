import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 chars"),
  email: z.string().email("Email is invalid"),
  password: z.string().min(6, "Password must be at least 6 chars"),
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export const projectMemberSchema = z.object({
  userId: z.number().int().positive(),
});

export const createTaskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  assignedToId: z.number().int().positive(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
});
