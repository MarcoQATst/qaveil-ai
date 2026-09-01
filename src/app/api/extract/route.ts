import { NextResponse } from "next/server";

import { extractDocument } from "../../../application/extract-document";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    return NextResponse.json({ text: await extractDocument(file) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process the file.";
    return NextResponse.json({ error: message }, { status: /File|Unsupported|readable/i.test(message) ? 400 : 500 });
  }
}
