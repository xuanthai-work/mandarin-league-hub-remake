import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateText = vi.fn();
const mockGoogleGenerativeAI = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: (...args: unknown[]) => mockGoogleGenerativeAI(...args),
}));

describe("runResponsesText", () => {
  const originalEnv = process.env["GOOGLE_AI_INTERNAL_KEY"];

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env["GOOGLE_AI_INTERNAL_KEY"];
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env["GOOGLE_AI_INTERNAL_KEY"] = originalEnv;
    } else {
      delete process.env["GOOGLE_AI_INTERNAL_KEY"];
    }
  });

  it("throws when GOOGLE_AI_INTERNAL_KEY is missing", async () => {
    const { runResponsesText } = await import("./responses.server");
    await expect(
      runResponsesText(new Request("http://localhost"), "instructions", []),
    ).rejects.toThrow("AI chưa được cấu hình.");
  });

  it("throws when GOOGLE_AI_INTERNAL_KEY is whitespace only", async () => {
    process.env["GOOGLE_AI_INTERNAL_KEY"] = "   ";
    const { runResponsesText } = await import("./responses.server");
    await expect(
      runResponsesText(new Request("http://localhost"), "instructions", []),
    ).rejects.toThrow("AI chưa được cấu hình.");
  });

  it("calls generateText with google gemini-3.8-flash and returns text", async () => {
    process.env["GOOGLE_AI_INTERNAL_KEY"] = "internal-secret";
    const mockModel = { modelId: "gemini-3.8-flash" };
    const mockGoogle = vi.fn().mockReturnValue(mockModel);
    mockGoogleGenerativeAI.mockReturnValue(mockGoogle);
    mockGenerateText.mockResolvedValue({ text: "Generated answer" });

    const { runResponsesText, INTERNAL_AI_MODEL } = await import("./responses.server");
    expect(INTERNAL_AI_MODEL).toBe("gemini-3.8-flash");

    const req = new Request("http://localhost");
    const result = await runResponsesText(req, "system prompt", [
      { role: "user", content: "hello" },
    ]);

    expect(mockGoogleGenerativeAI).toHaveBeenCalledWith({ apiKey: "internal-secret" });
    expect(mockGoogle).toHaveBeenCalledWith("gemini-3.8-flash");
    expect(mockGenerateText).toHaveBeenCalledWith({
      model: mockModel,
      instructions: "system prompt",
      messages: [{ role: "user", content: "hello" }],
      abortSignal: req.signal,
    });
    expect(result).toBe("Generated answer");
  });
});
