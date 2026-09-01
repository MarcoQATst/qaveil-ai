import type { ChangelogEntry, CorrectionTraceItem } from "../schemas/correction";
import type { QAReview } from "../schemas/review";

export function buildCorrectionTrace(
  initial: QAReview,
  final: QAReview,
  changelog: ChangelogEntry[],
): CorrectionTraceItem[] {
  return initial.issues.map((issue) => {
    const log = changelog.find((entry) => entry.issueId === issue.id);
    const remaining = final.issues.filter((candidate) => {
      if (candidate.type !== issue.type) return false;
      return (candidate.affectedTestCase ?? "") === (issue.affectedTestCase ?? "");
    });

    if (log?.action === "MARKED_AS_AMBIGUITY" || log?.action === "RETAINED" || log?.action === "SKIPPED") {
      return { issueId: issue.id, type: issue.type, status: "RETAINED" as const, summary: log.summary };
    }

    if (remaining.length === 0) {
      return { issueId: issue.id, type: issue.type, status: "CORRECTED" as const, summary: log?.summary };
    }

    return { issueId: issue.id, type: issue.type, status: "RETAINED" as const, summary: log?.summary };
  });
}
