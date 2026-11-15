// Ask AI page (task C6). Uses POST /ask.
// A simple chat: the user asks a question, the backend lets Gemini pick
// database "tools" (get_spending, get_subscriptions, ...), runs them in Python
// and returns a written answer plus the list of tools it used. We show those
// tools as small chips under each answer so judges can see the AI is reading
// real data, not making numbers up.
"use client";

import { useEffect, useRef, useState } from "react";
import { Wrench } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import PageHeader from "@/components/PageHeader";
import { Notice } from "@/components/ui";
import { ask, isMocked, SUGGESTED_QUESTIONS } from "@/lib/api";
import type { ToolCall } from "@/lib/types";

// One bubble in the chat. Answers carry the tools used, errors are styled red.
type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; tools: ToolCall[] }
  | { role: "error"; text: string };

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to the newest message whenever the chat grows or starts loading.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await ask(q);
      setMessages((m) => [...m, { role: "assistant", text: res.answer, tools: res.tools_used }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((m) => [...m, { role: "error", text: `Couldn't get an answer (${msg}). Check that the backend is running.` }]);
    } finally {
      setLoading(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <>
      <PageHeader title="Ask AI" subtitle="Questions about your spending, answered from your data">
        {!empty && (
          <button
            onClick={() => setMessages([])}
            disabled={loading}
            className="btn-secondary px-3 py-1.5"
          >
            Clear chat
          </button>
        )}
      </PageHeader>

      {isMocked("ask") && (
        <Notice tone="info">
          Sample answers: the backend doesn&apos;t have /ask yet. The suggested questions have canned replies.
        </Notice>
      )}

      <div className="card flex min-h-[60vh] flex-col">
        {/* Conversation */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {empty ? (
            <div className="flex flex-col items-center py-10 text-center">
              <LogoMark size={44} className="opacity-30" />
              <p className="mt-3 text-sm font-semibold text-text">Ask anything about where your money went</p>
              <p className="mt-1 text-sm text-text-muted">
                Answers come from your receipts and bank transactions, including cash.
              </p>
            </div>
          ) : (
            messages.map((m, i) => <Bubble key={i} message={m} />)
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-text-muted" aria-live="polite">
              <span className="flex gap-1">
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </span>
              Checking your data…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested questions: always visible so the demo can click through them */}
        <div className="border-t border-border px-4 pt-3 sm:px-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={loading}
                className="rounded-full bg-surface-alt px-3 py-1 text-sm text-text hover:bg-accent-soft disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input box. A <form> gives us "press Enter to send" for free. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 p-4 sm:px-6"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. How much did I spend on dining last week?"
            className="min-w-0 flex-1 rounded-[10px] bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Your question"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary"
          >
            Ask
          </button>
        </form>
      </div>
    </>
  );
}

function Bubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-on-primary">{message.text}</p>
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <p role="alert" className="max-w-[80%] rounded-2xl bg-danger/10 px-4 py-2 text-sm text-danger">
        {message.text}
      </p>
    );
  }

  return (
    <div className="max-w-[80%]">
      <p className="whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface-alt px-4 py-2 text-sm text-text">
        {message.text}
      </p>
      {message.tools.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-1">
          <span className="text-xs text-text-muted">Looked up:</span>
          {message.tools.map((t, i) => (
            <ToolChip key={i} tool={t} />
          ))}
        </div>
      )}
    </div>
  );
}

// A small chip with the tool name. Hovering shows the arguments Gemini chose,
// e.g. category=groceries, start=2026-11-01.
function ToolChip({ tool }: { tool: ToolCall }) {
  const args = Object.entries(tool.args)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(", ");
  return (
    <span
      title={args || "no arguments"}
      className="pill bg-accent-soft font-mono font-medium text-accent-ink"
    >
      <Wrench size={11} aria-hidden="true" />
      {tool.name}
      {args && <span className="hidden font-normal sm:inline">({args})</span>}
    </span>
  );
}

function Dot({ delay }: { delay: string }) {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: delay }} />;
}
