import { createFileRoute } from "@tanstack/react-router";
import { Sparkle } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { AutoTextarea, CopyButton, ErrorBox, RegenButton, Spinner } from "@/components/ResultBits";
import { callGemini, parseJSON } from "@/lib/gemini";
import { buildSystemPrompt, PROMPTS } from "@/lib/prompts";

export const Route = createFileRoute("/email")({
  head: () => ({
    meta: [
      { title: "Email Generator — AI Workplace Assistant" },
      {
        name: "description",
        content: "Generate professional emails in a formal, friendly or persuasive tone.",
      },
      { property: "og:title", content: "AI Email Generator" },
      { property: "og:description", content: "Generate professional emails in seconds." },
    ],
  }),
  component: EmailPage,
});

const TONES = ["Formal", "Friendly", "Persuasive"] as const;
const LENGTHS = ["Short", "Medium", "Long"] as const;

function EmailPage() {
  const [form, setForm] = useState({
    recipient: "",
    purpose: "",
    points: "",
    length: "Medium",
    tone: "Formal",
  });
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });

  async function generate() {
    if (!form.recipient.trim() || !form.purpose.trim()) {
      setError("Please fill in the recipient and purpose.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const text = await callGemini({
        system: buildSystemPrompt(PROMPTS.email),
        json: true,
        contents: [
          {
            role: "user",
            text: `Recipient: ${form.recipient}\nPurpose: ${form.purpose}\nKey points:\n${form.points || "(none)"}\nLength: ${form.length}\nTone: ${form.tone}`,
          },
        ],
      });
      const r = parseJSON<{ subject: string; body: string }>(text);
      setSubject(r.subject ?? "");
      setBody(r.body ?? "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Email Generator"
        subtitle="Describe what you need — get a ready-to-send draft."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="card space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            generate();
          }}
        >
          <div>
            <label className="label" htmlFor="rec">
              Recipient
            </label>
            <input
              id="rec"
              className="field"
              placeholder="e.g. Sarah, Head of Marketing"
              value={form.recipient}
              onChange={set("recipient")}
            />
          </div>
          <div>
            <label className="label" htmlFor="pur">
              Purpose
            </label>
            <input
              id="pur"
              className="field"
              placeholder="e.g. Request a project deadline extension"
              value={form.purpose}
              onChange={set("purpose")}
            />
          </div>
          <div>
            <label className="label" htmlFor="pts">
              Key points
            </label>
            <AutoTextarea
              id="pts"
              rows={4}
              placeholder="One point per line"
              value={form.points}
              onChange={set("points")}
            />
          </div>
          <div>
            <label className="label" htmlFor="len">
              Length
            </label>
            <select id="len" className="field" value={form.length} onChange={set("length")}>
              {LENGTHS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="label">Tone</legend>
            <div className="grid grid-cols-3 gap-2">
              {TONES.map((t) => (
                <button
                  type="button"
                  key={t}
                  aria-pressed={form.tone === t}
                  onClick={() => setForm({ ...form, tone: t })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${form.tone === t ? "border-primary bg-accent text-accent-foreground" : "border-input hover:bg-muted"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? (
              <Spinner label="Writing your email…" />
            ) : (
              <>
                <Sparkle className="h-4 w-4" /> Generate email
              </>
            )}
          </button>
        </form>

        <section className="card flex flex-col" aria-live="polite">
          <h2 className="text-lg font-semibold">Your draft</h2>
          {error && (
            <div className="mt-4">
              <ErrorBox message={error} />
            </div>
          )}
          {!subject && !body && !error && (
            <div className="grid flex-1 place-items-center py-16 text-center text-sm text-muted-foreground">
              {loading ? <Spinner label="Generating…" /> : "Your generated email will appear here."}
            </div>
          )}
          {(subject || body) && (
            <div
              className={`mt-4 flex flex-1 flex-col space-y-4 transition ${loading ? "opacity-50" : ""}`}
            >
              <div>
                <label className="label" htmlFor="subj">
                  Subject
                </label>
                <input
                  id="subj"
                  className="field font-medium"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col">
                <label className="label" htmlFor="body">
                  Body
                </label>
                <AutoTextarea
                  id="body"
                  rows={14}
                  className="flex-1"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={`Subject: ${subject}\n\n${body}`} />
                <RegenButton onClick={generate} loading={loading} />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
