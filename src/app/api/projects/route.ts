import { NextResponse } from "next/server";
import { createProject, listProjects } from "../../../infrastructure/persistence/project-repository";
import { createProjectSchema } from "../../../schemas/project";
export async function GET() {
  try { return NextResponse.json({ projects: await listProjects() }); }
  catch (error) {
    console.error("[QAVeil] Unable to load projects.", error);
    return NextResponse.json({ error: "Unable to load persisted projects. Check the database connection." }, { status: 503 });
  }
}
export async function POST(request: Request) {
  try { return NextResponse.json({ project: await createProject(createProjectSchema.parse(await request.json())) }, { status: 201 }); }
  catch (error) {
    const validationError = error instanceof Error && error.name === "ZodError";
    console.error("[QAVeil] Unable to create project.", error);
    return NextResponse.json({ error: validationError ? "Project name must contain at least 2 characters." : "Unable to persist project. Check the database connection." }, { status: validationError ? 400 : 503 });
  }
}
