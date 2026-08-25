import type { RequirementAnalysis, RequirementInput } from "../../schemas/analysis";
type PrismaAnalysisRecord = {
  id: string;
  requirement: string;
  riskScore: number;
  createdAt: Date;
  result: unknown;
};

type PrismaClientLike = { analysis: { create: (args: unknown) => Promise<unknown>; findMany: (args: unknown) => Promise<PrismaAnalysisRecord[]> } };
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
};

export async function saveAnalysis(input: RequirementInput, analysis: RequirementAnalysis) {
  const prisma = await getPrisma();
  return prisma.analysis.create({
    data: {
      locale: input.locale,
      userStory: input.userStory || null,
      requirement: input.requirement,
      additionalContext: input.additionalContext || null,
      riskScore: analysis.risk.score,
      result: analysis,
      testCases: analysis.scenarios,
      gherkin: analysis.gherkin,
    },
  });
}

export async function listAnalyses(): Promise<AnalysisHistoryItem[]> {
  const prisma = await getPrisma();
  const records = await prisma.analysis.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, requirement: true, riskScore: true, createdAt: true, result: true },
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
    };
  });
}
