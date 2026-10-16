import { createFileRoute } from "@tanstack/react-router";
import { Bot, Send, Trash2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { CopyButton, ErrorBox, RegenButton } from "@/components/ResultBits";
import { callGemini, type ChatTurn } from "@/lib/gemini";
import { buildSystemPrompt, PROMPTS } from "@/lib/prompts";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Chatbot — AI Workplace Assistant" },
      {
        name: "description",
        content: "Chat with an AI assistant for planning, writing and brainstorming at work.",
      },
      { property: "og:title", content: "AI Workplace Chatbot" },
      { property: "og:description", content: "Your AI teammate for everyday work questions." },
    ],
  }),
  component: ChatPage,
});

const CHIPS = [
  "Help me prioritise my tasks for today",
  "Write an agenda for a 30-minute team meeting",
  "Tips to run a productive 1:1",
  "Summarise the pros and cons of async work",
];

function ChatPage() {
  const [msgs, setMsgs] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  async function ask(history: ChatTurn[]) {
    setMsgs(history);
    setLoading(true);
    setError("");
    try {
      const reply = await callGemini({
        system: buildSystemPrompt(PROMPTS.chat),
        contents: history,
      });
      setMsgs([...history, { role: "model", text: reply }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const send = (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    setInput("");
    ask([...msgs, { role: "user", text: t }]);
  };

  const regenerate = () => {
    const lastUser = msgs.map((m) => m.role).lastIndexOf("user");
    if (lastUser >= 0) ask(msgs.slice(0, lastUser + 1));
  };

  const editMsg = (i: number, text: string) =>
    setMsgs(msgs.map((m, j) => (j === i ? { ...m, text } : m)));

  return (
    <div className="mx-auto flex h-[calc(100vh-11rem)] max-w-4xl flex-col">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="AI Chatbot" subtitle="Ask anything about your work." />
        <button
          className="btn-ghost"
          onClick={() => {
            setMsgs([]);
            setError("");
          }}
          disabled={!msgs.length || loading}
        >
          <Trash2 className="h-4 w-4" /> Clear Chat
        </button>
      </div>

      <div className="card flex min-h-0 flex-1 flex-col p-0">
        <div className="flex-1 space-y-5 overflow-y-auto p-5" aria-live="polite">
          {!msgs.length && (
            <div className="grid h-full place-items-center text-center">
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand text-primary-foreground">
                  <Bot className="h-7 w-7" />
                </div>
                <p className="mt-4 font-semibold">How can I help today?</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {CHIPS.map((c) => (
                    <button
                      key={c}
                      className="rounded-full border border-border bg-accent px-3.5 py-1.5 text-sm text-accent-foreground transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => send(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.role === "user" ? "bg-muted text-foreground" : "bg-brand text-primary-foreground"}`}
              >
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`max-w-[80%] ${m.role === "user" ? "text-right" : ""}`}>
                {m.role === "user" ? (
                  <div className="inline-block whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-brand px-4 py-2.5 text-left text-sm text-primary-foreground">
                    {m.text}
                  </div>
                ) : (
                  <>
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      aria-label="Assistant reply (editable)"
                      onBlur={(e) => editMsg(i, e.currentTarget.innerText)}
                      className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {m.text}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <CopyButton text={m.text} />
                      {i === msgs.length - 1 && (
                        <RegenButton onClick={regenerate} loading={loading} />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3" aria-label="Assistant is typing">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-brand text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          {error && <ErrorBox message={error} />}
          <div ref={endRef} />
        </div>
        <form
          className="flex items-end gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            ref={inputRef}
            aria-label="Message"
            rows={1}
            className="field max-h-40 resize-none"
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <button
            className="btn-primary h-10 w-10 shrink-0 p-0"
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
