import { NextResponse } from "next/server";

import mammoth from "mammoth";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    const mimeType = file.type;
    const name = file.name.toLowerCase();

    if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
      try {
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        text = data.text;
      } catch (err) {
        return NextResponse.json({ error: "Failed to parse PDF file." }, { status: 400 });
      }
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      try {
        const data = await mammoth.extractRawText({ buffer });
        text = data.value;
      } catch (err) {
        return NextResponse.json({ error: "Failed to parse DOCX file." }, { status: 400 });
      }
    } else if (
      mimeType === "text/plain" ||
      mimeType === "text/markdown" ||
      name.endsWith(".txt") ||
      name.endsWith(".md")
    ) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload PDF, DOCX, TXT, or MD." },
        { status: 400 }
      );
    }

    const cleanText = text.replace(/\0/g, "").trim();

    if (!cleanText) {
      return NextResponse.json({ error: "No readable text found in the file." }, { status: 400 });
    }

    return NextResponse.json({ text: cleanText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process the file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
