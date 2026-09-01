import { NextResponse } from "next/server";
import { addProjectContext, getProject, listProjectContext } from "../../../../../infrastructure/persistence/project-repository";
import { createProjectContextEntrySchema } from "../../../../../schemas/project";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) { const id = (await params).id; if (!await getProject(id)) return NextResponse.json({ error: "Project not found." }, { status: 404 }); return NextResponse.json({ entries: await listProjectContext(id) }); }
export async function POST(request: Request, { params }: Context) { try { const id = (await params).id; if (!await getProject(id)) return NextResponse.json({ error: "Project not found." }, { status: 404 }); return NextResponse.json({ entry: await addProjectContext(id, createProjectContextEntrySchema.parse(await request.json())) }, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add context." }, { status: 400 }); } }
