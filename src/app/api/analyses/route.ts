import { NextResponse } from "next/server";
import { analyzeWithReview } from "../../../application/qa-pipeline";
import { createAiProviders } from "../../../infrastructure/ai/create-providers";
import { listAnalyses, saveAnalysis } from "../../../infrastructure/persistence/analysis-repository";
import { requirementInputSchema } from "../../../schemas/analysis";
import { ProjectContextBuilder } from "../../../application/project-context-builder";
import { getProject, listProjectContext } from "../../../infrastructure/persistence/project-repository";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ analyses: [] });
  }

  try {
    const projectId = new URL(request.url).searchParams.get("projectId") || undefined;
    return NextResponse.json({ analyses: await listAnalyses(projectId) });
  } catch (error) {
    console.warn("[QAVeil] Unable to load analysis history. Returning empty list.", error);
    return NextResponse.json({ analyses: [] });
  }
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    let input = requirementInputSchema.parse(payload);
    if (input.projectId) {
      const project = await getProject(input.projectId);
      if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
      input = requirementInputSchema.parse({ ...input, projectContext: new ProjectContextBuilder().build(project, await listProjectContext(project.id), input) });
    }
    const providers = createAiProviders();
    const result = await analyzeWithReview(providers, input);
    result.analysis.contextSourcesUsed = input.projectContext?.entries.map(({ type, title, source }) => ({ type, title, source })) ?? [];
    if (result.originalAnalysis) result.originalAnalysis.contextSourcesUsed = result.analysis.contextSourcesUsed;

    try {
      if (process.env.DATABASE_URL) {
        const persisted = await saveAnalysis(input, result.analysis, {
          review: result.review,
          originalAnalysis: result.originalAnalysis,
          initialReview: result.initialReview,
        });
        if (persisted && typeof persisted === "object" && "id" in persisted && typeof persisted.id === "string") result.analysisId = persisted.id;
      }
    } catch (persistenceError) {
      console.warn(
        "[QAVeil] Unable to persist analysis. Continuing without database.",
        persistenceError,
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze the requirement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
