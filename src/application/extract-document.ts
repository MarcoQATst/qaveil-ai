import mammoth from "mammoth";
export async function extractDocument(file: File): Promise<string> {
  if (!file || file.size === 0) throw new Error("File is empty.");
  if (file.size > 5 * 1024 * 1024) throw new Error("File too large. Maximum size is 5MB.");
  const buffer = Buffer.from(await file.arrayBuffer()); const name = file.name.toLowerCase(); let text = "";
  if (file.type === "application/pdf" || name.endsWith(".pdf")) { const pdfParse = require("pdf-parse"); text = (await pdfParse(buffer)).text; }
  else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) text = (await mammoth.extractRawText({ buffer })).value;
  else if (file.type === "text/plain" || file.type === "text/markdown" || name.endsWith(".txt") || name.endsWith(".md")) text = buffer.toString("utf-8");
  else throw new Error("Unsupported file format. Please upload PDF, DOCX, TXT, or MD.");
  const clean = text.replace(/\0/g, "").trim(); if (!clean) throw new Error("No readable text found in the file."); return clean;
}
