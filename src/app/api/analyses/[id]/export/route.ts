import { NextResponse } from "next/server";
import { buildAnalysisMarkdown, buildAnalysisPdf } from "../../../../../application/analysis-export";
import { getAnalysisForExport } from "../../../../../infrastructure/persistence/analysis-repository";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const format = new URL(request.url).searchParams.get("format") ?? "markdown";
    if (format !== "markdown" && format !== "pdf") return NextResponse.json({ error: "Unsupported export format." }, { status: 400 });
    const record = await getAnalysisForExport((await params).id);
    if (!record) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    const filename = `qaveil-analysis-${record.id}.${format === "pdf" ? "pdf" : "md"}`;
    if (format === "pdf") return new NextResponse(new Blob([buildAnalysisPdf(record) as unknown as BlobPart]), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` } });
    return new NextResponse(buildAnalysisMarkdown(record), { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` } });
  } catch (error) {
    console.error("[QAVeil] Unable to export analysis.", error);
    return NextResponse.json({ error: "Unable to export persisted analysis." }, { status: 503 });
  }
}
