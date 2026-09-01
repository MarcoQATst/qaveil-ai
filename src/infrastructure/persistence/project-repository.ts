import type { Project, ProjectContextEntryInput } from "../../schemas/project";
import type { StoredProjectContextEntry } from "../../application/project-context-builder";

type PrismaLike = { project: { create(a: unknown): Promise<unknown>; findMany(a: unknown): Promise<unknown[]>; findUnique(a: unknown): Promise<unknown>; update(a: unknown): Promise<unknown> }; projectContextEntry: { create(a: unknown): Promise<unknown>; findMany(a: unknown): Promise<unknown[]> } };
let prismaClient: PrismaLike | undefined;
async function prisma(): Promise<PrismaLike> { if (!prismaClient) { const { PrismaClient } = await import("@prisma/client"); prismaClient = new PrismaClient() as unknown as PrismaLike; } return prismaClient; }
const projectDto = (value: any): Project => ({ ...value, createdAt: value.createdAt.toISOString(), updatedAt: value.updatedAt.toISOString() });

export async function createProject(data: { name: string; description?: string }) { return projectDto(await (await prisma()).project.create({ data: { name: data.name, description: data.description || null } })); }
export async function listProjects() { return (await (await prisma()).project.findMany({ orderBy: { updatedAt: "desc" } })).map(projectDto); }
export async function getProject(id: string) { const value = await (await prisma()).project.findUnique({ where: { id } }); return value ? projectDto(value) : null; }
export async function updateProject(id: string, data: Partial<{ name: string; description: string }>) { return projectDto(await (await prisma()).project.update({ where: { id }, data: { ...data, description: data.description === "" ? null : data.description } })); }
export async function listProjectContext(projectId: string): Promise<StoredProjectContextEntry[]> { return (await (await prisma()).projectContextEntry.findMany({ where: { projectId }, orderBy: { updatedAt: "desc" } })) as StoredProjectContextEntry[]; }
export async function addProjectContext(projectId: string, data: ProjectContextEntryInput) { return (await (await prisma()).projectContextEntry.create({ data: { projectId, ...data } })) as StoredProjectContextEntry; }
