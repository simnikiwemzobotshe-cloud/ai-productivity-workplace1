import { createFileRoute } from "@tanstack/react-router";
import { Globe, Lightbulb, ListChecks, Search, Target, FileText } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { AutoTextarea, CopyButton, ErrorBox, RegenButton, Spinner } from "@/components/ResultBits";
import { AIError, callGeminiWithSources, parseJSON, type Source } from "@/lib/gemini";
import { buildSystemPrompt, PROMPTS } from "@/lib/prompts";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research Assistant — AI Workplace Assistant" },
      {
        name: "description",
        content: "Summarise topics or web pages into key points, insights and recommendations.",
      },
      { property: "og:title", content: "AI Research Assistant" },
      { property: "og:description", content: "Turn any topic or URL into a structured briefing." },
    ],
  }),
  component: ResearchPage,
});

type Result = { summary: string; keyPoints: string; insights: string; recommendations: string };

const SECTIONS = [
  { key: "summary", label: "Summary", icon: FileText },
  { key: "keyPoints", label: "Key Points", icon: ListChecks },
  { key: "insights", label: "Insights", icon: Lightbulb },
  { key: "recommendations", label: "Recommendations", icon: Target },
] as const;

const toList = (a: unknown) =>
  Array.isArray(a) ? a.map((x) => `• ${x}`).join("\n") : String(a ?? "");

function ResearchPage() {
  const [mode, setMode] = useState<"topic" | "url">("topic");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [sources, setSources] = useState<Source[]>([]);

  async function run() {
    const v = input.trim();
    if (!v) return setError(mode === "url" ? "Please enter a URL." : "Please enter a topic.");
    setError("");
    try {
      let prompt = `Research topic: ${v}`;
      let pageSource: Source | null = null;
      if (mode === "url") {
        let url: URL;
        try {
          url = new URL(v.startsWith("http") ? v : `https://${v}`);
        } catch {
          throw new AIError("That URL doesn't look valid.");
        }
        setLoading("Reading the page…");
        const r = await fetch(`https://r.jina.ai/${url.href}`).catch(() => null);
        if (!r)
          throw new AIError(
            "Network error: couldn't reach the page reader. Check your connection.",
          );
        if (!r.ok)
          throw new AIError(
            `Couldn't read that page (error ${r.status}). Check the URL or try another one.`,
          );
        const page = (await r.text()).slice(0, 30000);
        if (page.trim().length < 200)
          throw new AIError("That page had no readable text to analyse. Try a different URL.");
        pageSource = { url: url.href, title: url.hostname };
        prompt = `Source URL: ${url.href}\n\nSource text:\n${page}`;
      }
      setLoading("Analysing…");
      // Topic mode is grounded with Google Search so the briefing can cite real sources.
      const { text, sources: found } = await callGeminiWithSources({
        system: buildSystemPrompt(PROMPTS.research),
        json: !!pageSource,
        googleSearch: !pageSource,
        contents: [{ role: "user", text: prompt }],
      });
      const j = parseJSON<{
        summary?: unknown;
        keyPoints?: unknown;
        insights?: unknown;
        recommendations?: unknown;
      }>(text);
      setResult({
        summary: String(j.summary ?? ""),
        keyPoints: toList(j.keyPoints),
        insights: toList(j.insights),
        recommendations: toList(j.recommendations),
      });
      setSources(pageSource ? [pageSource] : found);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }

  const all = result ? SECTIONS.map((s) => `${s.label}\n${result[s.key]}`).join("\n\n") : "";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Research Assistant"
        subtitle="Get a structured briefing on any topic or web page."
      />
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <div role="tablist" className="mb-4 inline-flex rounded-lg bg-muted p-1">
          {(["topic", "url"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setInput("");
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition ${mode === m ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}
            >
              {m === "topic" ? <Search className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              {m === "topic" ? "Topic" : "URL"}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            aria-label={mode === "topic" ? "Topic" : "URL"}
            className="field flex-1"
            placeholder={
              mode === "topic"
                ? "e.g. Benefits of a four-day work week"
                : "https://example.com/article"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn-primary" disabled={!!loading}>
            {loading ? <Spinner label={loading} /> : "Research"}
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-6" aria-live="polite">
        {error && <ErrorBox message={error} />}
        {result && (
          <>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={all} />
              <RegenButton onClick={run} loading={!!loading} />
            </div>
            <div className={`grid gap-6 md:grid-cols-2 transition ${loading ? "opacity-50" : ""}`}>
              {SECTIONS.map(({ key, label, icon: Icon }) => (
                <div key={key} className={`card ${key === "summary" ? "md:col-span-2" : ""}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-semibold">
                      <Icon className="h-4 w-4 text-primary" /> {label}
                    </h2>
                    <CopyButton text={result[key]} />
                  </div>
                  <AutoTextarea
                    aria-label={label}
                    rows={key === "summary" ? 5 : 7}
                    value={result[key]}
                    onChange={(e) => setResult({ ...result, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            {sources.length > 0 && (
              <div className="card">
                <h2 className="mb-3 flex items-center gap-2 font-semibold">
                  <Globe className="h-4 w-4 text-primary" /> Sources
                </h2>
                <ul className="space-y-1.5 text-sm">
                  {sources.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline break-all"
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
