import { z } from "zod";
import { projectContextTypeSchema } from "./analysis";

export const projectSchema = z.object({
  id: z.string(), name: z.string(), description: z.string().nullable().optional(), createdAt: z.string(), updatedAt: z.string(),
});
export const createProjectSchema = z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(2_000).optional().default("") });
export const updateProjectSchema = createProjectSchema.partial().refine((value) => value.name !== undefined || value.description !== undefined, "Provide a field to update.");
export const createProjectContextEntrySchema = z.object({
  type: projectContextTypeSchema, title: z.string().trim().min(2).max(200), content: z.string().trim().min(1).max(50_000), source: z.string().trim().min(1).max(120).default("MANUAL"),
});
export type Project = z.infer<typeof projectSchema>;
export type ProjectContextEntryInput = z.infer<typeof createProjectContextEntrySchema>;
