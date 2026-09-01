import { describe, expect, it } from "vitest";
import { buildTraceabilityMatrix } from "../../src/application/traceability-matrix";
import { makeAnalysis } from "../helpers/qa-fixtures";
describe("traceability matrix", () => {
 it("links explicit valid references, ignores invalid IDs and reports metrics", () => { const analysis = makeAnalysis({ requirementFacts:["Password recovery is available"], businessRules:["Only registered emails can request recovery."] }); analysis.scenarios[0].coveredBehaviorIds=["REQ-001","REQ-999"]; analysis.scenarios[0].coveredBusinessRuleIds=["BR-001","BR-999"]; const matrix=buildTraceabilityMatrix(analysis,["TC-001"]); expect(matrix.items).toHaveLength(2); expect(matrix.items.every(x=>x.status==="COVERED")).toBe(true); expect(matrix.items.every(x=>x.playwrightStatus==="PLAYWRIGHT_GENERATED")).toBe(true); expect(matrix.metrics.percentage).toBe(100); });
 it("shows uncovered/project source and supports legacy snapshots", () => { const analysis=makeAnalysis({ requirementFacts:[], businessRules:["Token expires after duration"], contextSourcesUsed:[{type:"BUSINESS_RULE",title:"Token expires after duration",source:"MANUAL"}] }); analysis.scenarios=[]; const matrix=buildTraceabilityMatrix(analysis); expect(matrix.uncoveredItems[0].source).toBe("PROJECT_CONTEXT"); expect(matrix.uncoveredItems[0].playwrightStatus).toBe("NOT_GENERATED"); });
});
