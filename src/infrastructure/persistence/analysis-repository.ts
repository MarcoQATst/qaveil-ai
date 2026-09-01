import type { RequirementAnalysis, RequirementInput } from "../../schemas/analysis";
import type { CorrectionPipeline } from "../../schemas/correction";
import type { QAReview } from "../../schemas/review";

type PrismaAnalysisRecord = {
  id: string;
  requirement: string;
  riskScore: number;
  createdAt: Date;
  result: unknown;
  projectId?: string | null;
  project?: { name: string } | null;
};

type PrismaClientLike = { analysis: { create: (args: unknown) => Promise<unknown>; findMany: (args: unknown) => Promise<PrismaAnalysisRecord[]>; findUnique: (args: unknown) => Promise<unknown> } };
let prismaClient: PrismaClientLike | undefined;

async function getPrisma(): Promise<PrismaClientLike> {
  if (prismaClient) return prismaClient;
  const { PrismaClient } = await import("@prisma/client");
  prismaClient = new PrismaClient() as unknown as PrismaClientLike;
  return prismaClient;
}

export type AnalysisHistoryItem = {
  id: string;
  requirement: string;
  riskScore: number;
  riskLevel: RequirementAnalysis["risk"]["level"];
  createdAt: string;
  summary: string;
  projectId?: string;
  projectName?: string;
};

export type PersistableReviewBundle = {
  review?: QAReview;
  originalAnalysis?: RequirementAnalysis;
  initialReview?: QAReview;
  finalReview?: QAReview;
  correction?: CorrectionPipeline;
};

export async function saveAnalysis(
  input: RequirementInput,
  analysis: RequirementAnalysis,
  bundle?: PersistableReviewBundle,
) {
  const prisma = await getPrisma();
  const primaryReview = bundle?.finalReview ?? bundle?.review ?? bundle?.initialReview;
  return prisma.analysis.create({
    data: {
      locale: input.locale,
      userStory: input.userStory || null,
      requirement: input.requirement,
      additionalContext: input.additionalContext || null,
      riskScore: analysis.risk.score,
      result: analysis as object,
      testCases: analysis.scenarios as object,
      gherkin: analysis.gherkin as object,
      judgeReview: bundle
        ? {
            ...(primaryReview ?? {}),
            initialReview: bundle.initialReview ?? bundle.review,
            finalReview: bundle.finalReview,
            originalAnalysis: bundle.originalAnalysis,
            correction: bundle.correction,
          }
        : undefined,
      judgeScore: primaryReview?.score ?? null,
      projectId: input.projectId || null,
    },
  });
}

export async function listAnalyses(projectId?: string): Promise<AnalysisHistoryItem[]> {
  const prisma = await getPrisma();
  const records = await prisma.analysis.findMany({
    orderBy: { createdAt: "desc" },
    where: projectId ? { projectId } : undefined,
    take: 50,
    select: { id: true, requirement: true, riskScore: true, createdAt: true, result: true, projectId: true, project: { select: { name: true } } },
  });

  return records.map((record: PrismaAnalysisRecord) => {
    const result = record.result as RequirementAnalysis;
    return {
      id: record.id,
      requirement: record.requirement,
      riskScore: record.riskScore,
      riskLevel: result.risk.level,
      summary: result.summary,
      createdAt: record.createdAt.toISOString(),
      ...(record.projectId ? { projectId: record.projectId, projectName: record.project?.name } : {}),
    };
  });
}

export async function getAnalysisForExport(id: string) {
  const record = await (await getPrisma()).analysis.findUnique({
    where: { id },
    select: { id: true, requirement: true, additionalContext: true, userStory: true, createdAt: true, result: true, project: { select: { name: true } } },
  });
  return record as import("../../application/analysis-export").ExportableAnalysis | null;
}
