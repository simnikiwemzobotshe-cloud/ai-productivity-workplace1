import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, KeyRound, Mail, MessageSquare, Search, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { getApiKey } from "@/lib/gemini";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Workplace Productivity Assistant" },
      {
        name: "description",
        content: "Draft emails, research topics and chat with an AI assistant powered by Gemini.",
      },
      { property: "og:title", content: "AI Workplace Productivity Assistant" },
      {
        property: "og:description",
        content: "Draft emails, research topics and chat with an AI assistant.",
      },
    ],
  }),
  component: Dashboard,
});

const TOOLS = [
  {
    to: "/email",
    icon: Mail,
    title: "Email Generator",
    desc: "Turn a few notes into a polished email in your chosen tone.",
  },
  {
    to: "/research",
    icon: Search,
    title: "Research Assistant",
    desc: "Summarise any topic or web page into key points and actions.",
  },
  {
    to: "/chat",
    icon: MessageSquare,
    title: "AI Chatbot",
    desc: "Brainstorm, plan and get quick answers in a conversation.",
  },
] as const;

function Dashboard() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  useEffect(() => {
    setHasKey(!!getApiKey());
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Good to see you 👋" subtitle="Pick a tool to get your work done faster." />

      {hasKey === false && (
        <div className="card mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Connect your Gemini API key</p>
            <p className="text-sm text-muted-foreground">
              The tools need your own key to generate content.
            </p>
          </div>
          <Link to="/settings" className="btn-primary">
            Add key
          </Link>
        </div>
      )}
      {hasKey && (
        <p className="mb-8 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" /> API key saved
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {TOOLS.map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="card group flex flex-col transition hover:-translate-y-1 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-primary-foreground">
              <Icon className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-lg font-semibold">{title}</h2>
            <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{desc}</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
