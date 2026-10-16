/**
 * Shared Gemini access for every tool in the app.
 *
 * The API key is stored only in this browser (localStorage) and is sent to
 * Google in the x-goog-api-key request header, so it never appears in a URL
 * where it could leak into logs or browser history.
 */
const KEY = "gemini_api_key";

/**
 * Model that powers every tool. Gemini 3.8 Flash is the current stable Flash
 * release and replaced gemini-2.5-flash, which is no longer offered to new keys.
 */
export const MODEL = "gemini-3.8-flash";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

export const getApiKey = () =>
  typeof window === "undefined" ? "" : (localStorage.getItem(KEY) ?? "");
export const setApiKey = (k: string) => localStorage.setItem(KEY, k.trim());
export const clearApiKey = () => localStorage.removeItem(KEY);

export type ChatTurn = { role: "user" | "model"; text: string };
export type ThinkingLevel = "low" | "medium" | "high";

export class AIError extends Error {}

type Part = { text?: string; thought?: boolean };
type Candidate = {
  content?: { parts?: Part[] };
  finishReason?: string;
  groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
};
type ApiResponse = {
  candidates?: Candidate[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
};

const BLOCKED: Record<string, string> = {
  SAFETY: "Google's safety filters blocked this request. Try rephrasing it.",
  BLOCKLIST: "Google's blocklist rejected a term in your request. Try different wording.",
  PROHIBITED_CONTENT: "Google refused this request as prohibited content. Try different wording.",
  IMAGE_SAFETY: "Google's safety filters blocked this request.",
  OTHER: "Google blocked this request for an unspecified reason.",
};

function describeError(status: number, msg: string, apiStatus = ""): string {
  const detail = msg ? ` (Google said: ${msg.slice(0, 200)})` : "";
  if (
    /model/i.test(msg) &&
    /not found|unsupported|unavailable|disabled|permission|denied/i.test(msg)
  )
    return `Unsupported model: ${MODEL} isn't available for your key yet. Check the key on the Settings page.`;
  if ((status === 400 && /api key/i.test(msg)) || apiStatus === "UNAUTHENTICATED")
    return "Authentication error: your API key is invalid. Update it on the Settings page.";
  if (status === 401 || status === 403)
    return "Authentication error: Google rejected your API key (permission denied). Check the key on Settings.";
  if (status === 429 || apiStatus === "RESOURCE_EXHAUSTED")
    return `Quota or rate limit reached for your API key. Wait a minute, or check your limits in Google AI Studio.${detail}`;
  if (status === 404) return `Unsupported model: ${MODEL} couldn't be found for your key.`;
  if (status === 503 || apiStatus === "UNAVAILABLE")
    return "Google's model is overloaded right now (server error 503). Wait a few seconds and try again.";
  if (status >= 500) return `Google server error (${status}). Try again in a moment.${detail}`;
  if (status === 400) return `Google rejected the request (400).${detail}`;
  return msg || `Gemini request failed (${status}).`;
}

export type Source = { title: string; url: string };

export async function callGemini(opts: {
  system: string;
  contents: ChatTurn[];
  json?: boolean;
  /** Gemini 3 reasons before answering; "low" keeps these short tasks quick. */
  thinkingLevel?: ThinkingLevel;
}): Promise<string> {
  return (await callGeminiWithSources(opts)).text;
}

/** Same as callGemini; with googleSearch the answer is grounded and cited sources are returned. */
export async function callGeminiWithSources(opts: {
  system: string;
  contents: ChatTurn[];
  json?: boolean;
  thinkingLevel?: ThinkingLevel;
  googleSearch?: boolean;
}): Promise<{ text: string; sources: Source[] }> {
  const key = getApiKey();
  if (!key) throw new AIError("No API key found. Add your Gemini API key on the Settings page.");

  const generationConfig: Record<string, unknown> = {
    // thinkingLevel is the Gemini 3 / 4 replacement for the deprecated
    // thinkingBudget used by the 2.5 series.
    thinkingConfig: { thinkingLevel: opts.thinkingLevel ?? "low" },
  };
  if (opts.json) generationConfig["responseMimeType"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: opts.contents.map((c) => ({ role: c.role, parts: [{ text: c.text }] })),
        generationConfig,
        ...(opts.googleSearch ? { tools: [{ google_search: {} }] } : {}),
      }),
    });
  } catch {
    throw new AIError(
      "Network error: couldn't reach Google. Check your internet connection and try again.",
    );
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as ApiResponse;
    throw new AIError(
      describeError(res.status, data?.error?.message ?? "", data?.error?.status ?? ""),
    );
  }

  const data = (await res.json().catch(() => null)) as ApiResponse | null;
  if (!data) throw new AIError("The AI sent back a response we couldn't read. Try regenerating.");

  const block = data.promptFeedback?.blockReason;
  if (block && block !== "BLOCK_REASON_UNSPECIFIED")
    throw new AIError(BLOCKED[block] ?? "Google blocked this request before answering.");

  const cand = data.candidates?.[0];
  const finish = cand?.finishReason ?? "";
  // Reasoning summaries come back as their own parts and must not leak into
  // the answer (or break JSON parsing).
  const text = (cand?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");

  if (!text.trim()) {
    if (finish === "SAFETY")
      throw new AIError("Google's safety filters stopped this answer. Try rephrasing.");
    if (finish === "MAX_TOKENS")
      throw new AIError("The answer was cut off before it finished. Try again.");
    if (finish === "MALFORMED_RESPONSE")
      throw new AIError("The AI returned a broken response. Try regenerating.");
    throw new AIError("The AI returned an empty response. Try regenerating.");
  }
  const sources: Source[] = [];
  for (const c of cand?.groundingMetadata?.groundingChunks ?? []) {
    const url = c.web?.uri;
    if (url && !sources.some((x) => x.url === url))
      sources.push({ url, title: c.web?.title || url });
  }
  return { text, sources };
}

export function parseJSON<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* the model may wrap the object in prose — try the outermost brackets */
  }
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    } catch {
      /* fall through to the clear error below */
    }
  }
  throw new AIError("Couldn't read the AI response. Please regenerate.");
}
