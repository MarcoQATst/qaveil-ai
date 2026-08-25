import { describe, expect, it } from "vitest";
import { POST } from "../../src/app/api/extract/route";

function requestFor(file?: File) {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request("http://localhost/api/extract", { method: "POST", body: form });
}

describe("POST /api/extract", () => {
  it("extracts plain text files", async () => {
    const response = await POST(requestFor(new File(["A valid requirement for checkout."], "requirement.txt", { type: "text/plain" })));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ text: "A valid requirement for checkout." });
  });

  it("rejects an empty file and unsupported extension", async () => {
    const empty = await POST(requestFor(new File([], "empty.txt", { type: "text/plain" })));
    expect(empty.status).toBe(400);
    const invalid = await POST(requestFor(new File(["data"], "requirement.csv", { type: "text/csv" })));
    expect(invalid.status).toBe(400);
  });
});
