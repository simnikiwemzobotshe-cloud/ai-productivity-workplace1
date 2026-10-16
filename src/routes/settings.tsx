import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { ErrorBox, Spinner } from "@/components/ResultBits";
import { callGemini, clearApiKey, getApiKey, MODEL, setApiKey } from "@/lib/gemini";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Workplace Assistant" },
      {
        name: "description",
        content: "Add your own Google Gemini API key to power the assistant.",
      },
      { property: "og:title", content: "Settings — AI Workplace Assistant" },
      { property: "og:description", content: "Manage your Gemini API key." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"" | "saved" | "testing" | "ok">("");
  const [error, setError] = useState("");

  useEffect(() => {
    setKey(getApiKey());
  }, []);

  const save = () => {
    setError("");
    if (!key.trim()) return setError("Please paste an API key first.");
    setApiKey(key);
    setStatus("saved");
  };

  const test = async () => {
    save();
    if (!key.trim()) return;
    setStatus("testing");
    try {
      await callGemini({ system: "Reply with OK.", contents: [{ role: "user", text: "ping" }] });
      setStatus("ok");
    } catch (e) {
      setStatus("");
      setError((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" subtitle="Connect your own Google Gemini API key." />
      <div className="card space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Gemini API key</h2>
            <p className="text-sm text-muted-foreground">
              Get a free key from{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline"
              >
                Google AI Studio
              </a>
              .
            </p>
            <p className="text-xs text-muted-foreground">
              All tools run on{" "}
              <span className="font-mono font-medium text-foreground">{MODEL}</span>.
            </p>
          </div>
        </div>
        <div className="relative">
          <label htmlFor="key" className="sr-only">
            API key
          </label>
          <input
            id="key"
            type={show ? "text" : "password"}
            className="field pr-11 font-mono"
            placeholder="AIza…"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setStatus("");
            }}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide key" : "Show key"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={save}>
            Save key
          </button>
          <button className="btn-ghost" onClick={test} disabled={status === "testing"}>
            {status === "testing" ? <Spinner label="Testing…" /> : "Save & test"}
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              clearApiKey();
              setKey("");
              setStatus("");
            }}
          >
            Remove
          </button>
        </div>
        {status === "saved" && (
          <p className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" /> Key saved in this browser.
          </p>
        )}
        {status === "ok" && (
          <p className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" /> Key works — you're all set!
          </p>
        )}
        {error && <ErrorBox message={error} />}
        <p className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
          Your key is stored only in this browser's local storage and sent directly to Google. It is
          never shared with anyone else.
        </p>
      </div>
    </div>
  );
}
