import { NextResponse } from "next/server";
import { getProject, updateProject } from "../../../../infrastructure/persistence/project-repository";
import { updateProjectSchema } from "../../../../schemas/project";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) { const project = await getProject((await params).id); return project ? NextResponse.json({ project }) : NextResponse.json({ error: "Project not found." }, { status: 404 }); }
export async function PATCH(request: Request, { params }: Context) { try { return NextResponse.json({ project: await updateProject((await params).id, updateProjectSchema.parse(await request.json())) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update project." }, { status: 400 }); } }
