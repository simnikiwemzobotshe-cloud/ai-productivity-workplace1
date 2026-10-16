import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Mail,
  Search,
  MessageSquare,
  Settings,
  Menu,
  X,
  Zap,
  AlertTriangle,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/email", label: "Email Generator", icon: Mail },
  { to: "/research", label: "Research Assistant", icon: Search },
  { to: "/chat", label: "AI Chatbot", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export const DISCLAIMER =
  "AI-generated content may contain errors. Review before use. Do not share confidential data.";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-primary-foreground shadow-soft">
        <Zap className="h-5 w-5" aria-hidden />
      </div>
      <span className="text-sm font-bold leading-tight text-primary-foreground">
        AI Workplace
        <br />
        <span className="font-medium text-sidebar-foreground">Productivity Assistant</span>
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    if (!localStorage.getItem("notice_seen")) setNotice(true);
  }, []);

  return (
    <div className="flex min-h-screen">
      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-sidebar/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar p-5 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button
            className="text-sidebar-foreground lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="mt-10 flex flex-col gap-1" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeProps={{ className: "bg-sidebar-accent text-primary-foreground" }}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
          <button className="btn-ghost px-2" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-brand">AI Workplace Assistant</span>
        </header>

        {notice && (
          <div
            role="dialog"
            aria-label="Notice"
            className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-warning bg-warning-soft p-4 sm:mx-8"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Welcome! A quick note before you start</p>
              <p className="mt-1 text-muted-foreground">
                {DISCLAIMER} Add your own Gemini API key in Settings — it stays in this browser
                only.
              </p>
            </div>
            <button
              className="btn-ghost"
              onClick={() => {
                localStorage.setItem("notice_seen", "1");
                setNotice(false);
              }}
            >
              Got it
            </button>
          </div>
        )}

        <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>

        <footer className="sticky bottom-0 flex items-center justify-center gap-2 border-t border-border bg-warning-soft px-4 py-2.5 text-center text-xs font-medium">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
          {DISCLAIMER}
        </footer>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-1.5 text-muted-foreground">{subtitle}</p>
    </div>
  );
}
