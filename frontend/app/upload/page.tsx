// Upload page (task C3). The backup for when the iPhone Shortcut fails on
// stage: drop a receipt photo here and it goes to POST /receipt?source=web_upload.
// Client Component because it handles drag events, files and upload state.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { CategoryChip } from "@/components/TransactionRow";
import { uploadReceipt } from "@/lib/api";
import { longDate, money } from "@/lib/format";
import type { ReceiptResponse } from "@/lib/types";

// SPEC section 4: the backend accepts JPEG or PNG.
const ACCEPTED = ["image/jpeg", "image/png"];

// The page is always in exactly one of these states. Keeping them in one
// variable (instead of separate loading/error/result flags) makes it
// impossible to show e.g. a spinner and an error at the same time.
type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "done"; result: ReceiptResponse }
  | { kind: "error"; message: string };

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Swap the chosen image. createObjectURL gives a temporary local URL so the
  // <img> can show the file without uploading it; revoking the old one frees
  // its memory.
  function choose(f: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  const busy = status.kind === "uploading";

  async function handleFile(f: File | undefined | null) {
    if (!f || busy) return;
    if (!ACCEPTED.includes(f.type)) {
      choose(null);
      setStatus({ kind: "error", message: `That's a ${f.type || "unknown"} file. Use a JPEG or PNG photo or screenshot.` });
      return;
    }
    if (f !== file) choose(f); // "Try again" re-sends the same file
    setStatus({ kind: "uploading" });
    try {
      const result = await uploadReceipt(f);
      setStatus({ kind: "done", result });
    } catch (e) {
      setStatus({ kind: "error", message: friendlyError(e) });
    }
  }

  // Paste support: Cmd+V a screenshot anywhere on the page. Handy on stage
  // because a screenshot can go straight from the clipboard to the backend.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = [...(e.clipboardData?.files ?? [])][0];
      if (item) handleFile(item);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  function reset() {
    choose(null);
    setStatus({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = ""; // lets the same file be picked again
  }

  return (
    <>
      <PageHeader title="Upload" subtitle="Drop a receipt photo to itemize it" />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: the drop zone, which turns into the image preview */}
        <div
          // preventDefault on dragover is what tells the browser "dropping is
          // allowed here". Without it, the drop event never fires and the
          // browser opens the image in a new tab instead.
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !busy) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Choose a receipt image"
          aria-disabled={busy}
          className={`relative flex min-h-80 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragging
              ? "border-emerald-500 bg-emerald-50"
              : "border-neutral-300 bg-white hover:border-neutral-400 hover:bg-neutral-50"
          } ${busy ? "cursor-wait" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob URL, next/image can't optimize it
            <img
              src={previewUrl}
              alt="Receipt preview"
              className={`max-h-96 rounded-md object-contain shadow-sm ${busy ? "opacity-50" : ""}`}
            />
          ) : (
            <>
              <ReceiptIcon />
              <p className="mt-4 font-medium text-neutral-900">Drop a receipt here</p>
              <p className="mt-1 text-sm text-neutral-500">or click to choose a file, or paste a screenshot</p>
              <p className="mt-3 text-xs text-neutral-400">JPEG or PNG</p>
            </>
          )}

          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/60">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-emerald-600" />
              <p className="text-sm font-medium text-neutral-700">Reading receipt with Gemini…</p>
            </div>
          )}
        </div>

        {/* Right: what came back */}
        <div>
          {status.kind === "idle" && (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
              <p className="font-medium text-neutral-700">What happens next</p>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5">
                <li>Gemini reads the merchant, date, total and every line item.</li>
                <li>We look for the matching charge in your bank account.</li>
                <li>No match means it&apos;s recorded as a cash purchase.</li>
              </ol>
            </div>
          )}

          {status.kind === "uploading" && <ResultSkeleton />}

          {status.kind === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              <p className="font-medium">Upload failed</p>
              <p className="mt-1">{status.message}</p>
              <button
                type="button"
                onClick={file ? () => handleFile(file) : reset}
                className="mt-4 rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
              >
                {file ? "Try again" : "Choose another file"}
              </button>
            </div>
          )}

          {status.kind === "done" && <ResultCard result={status.result} onReset={reset} />}
        </div>
      </div>
    </>
  );
}

// Turn the "status: detail" errors from lib/api.ts into something a person
// can act on. Status codes come from SPEC section 4.
function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.startsWith("401")) return "The API key was rejected. Check NEXT_PUBLIC_API_SECRET in .env.local matches the backend's API_SECRET.";
  if (msg.startsWith("422")) return "Gemini couldn't read a receipt in that image. Try a sharper, flatter photo.";
  if (msg.startsWith("502")) return "The Gemini call failed. Wait a few seconds and try again.";
  if (msg.includes("Failed to fetch")) return "Couldn't reach the backend. Is it running, and does NEXT_PUBLIC_API_URL point at it?";
  return msg;
}

function ResultCard({ result, onReset }: { result: ReceiptResponse; onReset: () => void }) {
  const r = result.receipt;
  return (
    <div className="space-y-4">
      {/* The same one-line summary the Shortcut shows as a notification */}
      <div className="rounded-xl bg-emerald-50 px-5 py-4 text-emerald-900 ring-1 ring-emerald-600/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Itemized</p>
        <p className="mt-1 font-medium">{result.summary}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-neutral-900">{r.merchant}</p>
            <p className="text-sm text-neutral-500">{longDate(r.date)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <CategoryChip category={r.category} />
            {r.is_cash ? (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                Cash
              </span>
            ) : (
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-800">
                Matched to card
                {r.match_confidence !== null && ` · ${Math.round(r.match_confidence * 100)}%`}
              </span>
            )}
          </div>
        </div>

        <ul className="divide-y divide-neutral-100 px-5 text-sm">
          {r.items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-neutral-800">
                {item.name}
                {item.quantity > 1 && <span className="text-neutral-400"> × {item.quantity}</span>}
              </span>
              <CategoryChip category={item.category} />
              <span className="w-20 text-right font-mono tabular-nums text-neutral-700">{money(item.price)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1 border-t border-neutral-100 bg-neutral-50 px-5 py-3 text-sm">
          <Line label="Subtotal" value={r.subtotal} />
          <Line label="Tax" value={r.tax} />
          <Line label="Tip" value={r.tip} />
          <div className="flex justify-between pt-1 font-semibold text-neutral-900">
            <dt>Total</dt>
            <dd className="font-mono tabular-nums">{money(r.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onReset}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Upload another
        </button>
        <Link
          href="/transactions"
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          See it in Transactions →
        </Link>
      </div>
    </div>
  );
}

// Subtotal, tax and tip are null when the receipt didn't show them. Hide those rows.
function Line({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <div className="flex justify-between text-neutral-600">
      <dt>{label}</dt>
      <dd className="font-mono tabular-nums">{money(value)}</dd>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5" aria-busy="true">
      <div className="h-5 w-1/2 animate-pulse rounded bg-neutral-100" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-100" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-neutral-100" />
      ))}
    </div>
  );
}

function ReceiptIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-400" aria-hidden="true">
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" strokeLinejoin="round" />
      <path d="M9 7h6M9 11h6M9 15h4" strokeLinecap="round" />
    </svg>
  );
}
