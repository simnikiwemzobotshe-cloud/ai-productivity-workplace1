import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIError, callGemini, MODEL, parseJSON } from "@/lib/gemini";

const KEY = "test-key-abc";
const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];

const response = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const answer = (parts: unknown[], finishReason = "STOP") =>
  response({ candidates: [{ content: { parts }, finishReason }] });

beforeEach(() => {
  localStorage.setItem("gemini_api_key", KEY);
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return answer([{ text: "OK" }]);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

const bodyOf = (c: Call) => JSON.parse(c.init.body as string);

describe("Gemini request", () => {
  const callAt = (i: number): Call => {
    const c = calls[i];
    if (!c) throw new Error(`expected request #${i + 1}, only ${calls.length} were made`);
    return c;
  };

  it("uses the current stable model", () => {
    expect(MODEL).toBe("gemini-3.8-flash");
  });

  it("sends the key in a header, never in the URL", async () => {
    await callGemini({ system: "sys", contents: [{ role: "user", text: "hi" }] });
    const call = callAt(0);
    expect(call.url).toBe(ENDPOINT);
    expect(call.url).not.toContain("key=");
    expect((call.init.headers as Record<string, string>)["x-goog-api-key"]).toBe(KEY);
  });

  it("asks for low reasoning effort and JSON output when requested", async () => {
    await callGemini({ system: "sys", contents: [{ role: "user", text: "hi" }] });
    expect(bodyOf(callAt(0)).generationConfig).toEqual({
      thinkingConfig: { thinkingLevel: "low" },
    });

    await callGemini({ system: "sys", contents: [{ role: "user", text: "hi" }], json: true });
    expect(bodyOf(callAt(1)).generationConfig).toEqual({
      thinkingConfig: { thinkingLevel: "low" },
      responseMimeType: "application/json",
    });
  });

  it("keeps reasoning summaries out of the answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        answer([{ text: "I will be brief.", thought: true }, { text: "The real answer." }]),
      ),
    );
    const text = await callGemini({ system: "sys", contents: [{ role: "user", text: "hi" }] });
    expect(text).toBe("The real answer.");
  });

  it("explains when the model is not available to this key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        response(
          {
            error: {
              message: "Model [models/gemini-3.8-flash] is unavailable to new users.",
              status: "NOT_FOUND",
            },
          },
          404,
        ),
      ),
    );
    await expect(
      callGemini({ system: "sys", contents: [{ role: "user", text: "hi" }] }),
    ).rejects.toThrow(/isn't available for your key/);
  });

  it("explains an invalid key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        response({ error: { message: "API key not valid. Please pass a valid API key." } }, 400),
      ),
    );
    await expect(
      callGemini({ system: "sys", contents: [{ role: "user", text: "hi" }] }),
    ).rejects.toThrow(
      new AIError("Authentication error: your API key is invalid. Update it on the Settings page."),
    );
  });
});

describe("parseJSON", () => {
  it("reads fenced and wrapped model output", () => {
    expect(parseJSON('```json\n{"subject":"Hi"}\n```')).toEqual({ subject: "Hi" });
    expect(parseJSON('Sure! {"body":"text"} hope that helps')).toEqual({ body: "text" });
  });

  it("fails clearly on unusable output", () => {
    expect(() => parseJSON("not json at all")).toThrow(/Couldn't read the AI response/);
  });
});

describe("error kinds and sources", () => {
  const fail = (status: number, error: object) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response({ error }, status)),
    );
  const run = () => callGemini({ system: "s", contents: [{ role: "user", text: "hi" }] });

  it("labels quota, overload, server and network failures distinctly, with one request each", async () => {
    fail(429, { message: "Quota exceeded", status: "RESOURCE_EXHAUSTED" });
    await expect(run()).rejects.toThrow(/Quota or rate limit/);
    fail(503, { message: "overloaded", status: "UNAVAILABLE" });
    await expect(run()).rejects.toThrow(/overloaded/);
    fail(500, { message: "Internal error", status: "INTERNAL" });
    await expect(run()).rejects.toThrow(/Google server error \(500\).*Internal error/);
    expect((fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(1);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fail");
      }),
    );
    await expect(run()).rejects.toThrow(/Network error/);
  });

  it("returns grounded sources when Google Search is on", async () => {
    const { callGeminiWithSources } = await import("@/lib/gemini");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init: RequestInit) => {
        expect(JSON.parse(init.body as string).tools).toEqual([{ google_search: {} }]);
        return response({
          candidates: [
            {
              content: { parts: [{ text: "{}" }] },
              groundingMetadata: {
                groundingChunks: [{ web: { uri: "https://a.com", title: "A" } }],
              },
            },
          ],
        });
      }),
    );
    const r = await callGeminiWithSources({
      system: "s",
      contents: [{ role: "user", text: "x" }],
      googleSearch: true,
    });
    expect(r.sources).toEqual([{ url: "https://a.com", title: "A" }]);
  });
});
