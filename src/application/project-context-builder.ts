import type { RequirementInput } from "../schemas/analysis";
import type { Project, ProjectContextEntryInput } from "../schemas/project";

export type StoredProjectContextEntry = ProjectContextEntryInput & { id: string; projectId: string; createdAt?: Date | string; updatedAt?: Date | string };
const MAX_CONTEXT_CHARS = 7_000;
const STOP_WORDS = new Set(["para", "com", "uma", "que", "dos", "das", "the", "and", "with", "from", "this", "that", "system"]);
const tokens = (text: string) => [...new Set((text.toLocaleLowerCase().match(/[\p{L}\p{N}_-]{3,}/gu) ?? []).filter((word) => !STOP_WORDS.has(word)))];
const headerFor = (type: StoredProjectContextEntry["type"]) => type === "BUSINESS_RULE" ? "[REGRA CONFIRMADA DO PROJETO]" : type === "DOCUMENTATION" ? "[DOCUMENTAÇÃO DO PROJETO]" : "[CONTEXTO DO PROJETO]";

export class ProjectContextBuilder {
  build(project: Project, entries: StoredProjectContextEntry[], input: Pick<RequirementInput, "requirement" | "additionalContext">) {
    const needles = new Set(tokens(`${input.requirement} ${input.additionalContext}`));
    const relevant = entries.filter((entry) => entry.projectId === project.id).map((entry) => ({ entry, score: tokens(`${entry.title} ${entry.content}`).filter((token) => needles.has(token)).length }))
      .filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
    const selected: StoredProjectContextEntry[] = [];
    let used = 0;
    for (const { entry } of relevant) { const length = entry.title.length + entry.content.length + 40; if (used + length > MAX_CONTEXT_CHARS) continue; selected.push(entry); used += length; }
    const promptContext = [
      "[REQUISITO ATUAL]", input.requirement,
      ...(input.additionalContext ? ["[CONTEXTO INFORMADO PELO USUÁRIO]", input.additionalContext] : []),
      ...selected.flatMap((entry) => [headerFor(entry.type), `${entry.title}\n${entry.content}`]),
    ].join("\n\n");
    const rules = selected.filter((entry) => entry.type === "BUSINESS_RULE");
    const conflicts = rules.filter((entry) => /\d/.test(entry.content) && tokens(entry.content).some((word) => needles.has(word)) && /\d/.test(input.requirement)).map((entry) => `POTENTIAL_REQUIREMENT_CONFLICT: Compare the current requirement with confirmed rule ${entry.title}.`);
    return { projectId: project.id, projectName: project.name, entries: selected.map(({ id, projectId, type, title, content, source }) => ({ id, projectId, type, title, content, source })), promptContext,
      regressionImpact: { impactedModules: selected.filter((entry) => entry.type === "PRODUCT_INFORMATION").map((entry) => entry.title), relatedRules: rules.map((entry) => entry.title), relatedFeatures: selected.filter((entry) => entry.type === "ACTOR" || entry.type === "INTEGRATION").map((entry) => entry.title), recommendedRegressionScenarios: selected.filter((entry) => entry.type === "DOCUMENTATION").map((entry) => `Review documented behavior: ${entry.title}`), potentialRequirementConflicts: conflicts } };
  }
}
