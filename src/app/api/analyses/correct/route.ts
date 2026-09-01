import { NextResponse } from "next/server";
import { autoCorrectAnalysis } from "../../../../application/qa-pipeline";
import { createAiProviders } from "../../../../infrastructure/ai/create-providers";
import { saveAnalysis } from "../../../../infrastructure/persistence/analysis-repository";
import { analysisResultSchema, requirementInputSchema } from "../../../../schemas/analysis";
import { qaReviewSchema } from "../../../../schemas/review";
import { z } from "zod";
import { ProjectContextBuilder } from "../../../../application/project-context-builder";
import { getProject, listProjectContext } from "../../../../infrastructure/persistence/project-repository";

const correctionRequestSchema = z.object({
  locale: requirementInputSchema.shape.locale,
  userStory: requirementInputSchema.shape.userStory,
  requirement: requirementInputSchema.shape.requirement,
  acceptanceCriteria: requirementInputSchema.shape.acceptanceCriteria,
  additionalContext: requirementInputSchema.shape.additionalContext,
  projectId: requirementInputSchema.shape.projectId,
  analysis: z.unknown(),
  review: z.unknown(),
});

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const parsed = correctionRequestSchema.parse(payload);
    let input = requirementInputSchema.parse({
      locale: parsed.locale,
      userStory: parsed.userStory,
      requirement: parsed.requirement,
      acceptanceCriteria: parsed.acceptanceCriteria,
      additionalContext: parsed.additionalContext,
      projectId: parsed.projectId,
    });
    if (input.projectId) { const project = await getProject(input.projectId); if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 }); input = requirementInputSchema.parse({ ...input, projectContext: new ProjectContextBuilder().build(project, await listProjectContext(project.id), input) }); }
    const analysis = analysisResultSchema.parse(parsed.analysis);
    const review = qaReviewSchema.parse(parsed.review);
    const providers = createAiProviders();
    const result = await autoCorrectAnalysis(providers, input, analysis, review);
    result.analysis.contextSourcesUsed = input.projectContext?.entries.map(({ type, title, source }) => ({ type, title, source })) ?? [];

    try {
      if (process.env.DATABASE_URL) {
        const persisted = await saveAnalysis(input, result.analysis, {
          review: result.review,
          originalAnalysis: result.originalAnalysis,
          initialReview: result.initialReview,
          finalReview: result.finalReview,
          correction: result.correction,
        });
        if (persisted && typeof persisted === "object" && "id" in persisted && typeof persisted.id === "string") result.analysisId = persisted.id;
      }
    } catch (persistenceError) {
      console.warn(
        "[QAVeil] Unable to persist corrected analysis. Continuing without database.",
        persistenceError,
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to auto-correct the analysis.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
