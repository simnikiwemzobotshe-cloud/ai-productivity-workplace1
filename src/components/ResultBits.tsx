import { Link } from "@tanstack/react-router";
import { AlertCircle, Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

export function RegenButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button type="button" className="btn-ghost" onClick={onClick} disabled={loading}>
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      Regenerate
    </button>
  );
}

export function ErrorBox({ message }: { message: string }) {
  const keyIssue = /api key/i.test(message);
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div>
        <p>{message}</p>
        {keyIssue && (
          <Link to="/settings" className="mt-1 inline-block font-semibold text-primary underline">
            Go to Settings →
          </Link>
        )}
      </div>
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </span>
  );
}

export function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`field resize-y leading-relaxed ${props.className ?? ""}`} />
  );
}
