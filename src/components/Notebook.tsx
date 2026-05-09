"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type Source = { page: number | null; source: string | null; snippet: string };

export default function Notebook() {
  const [doc, setDoc] = useState<{ documentId: string; filename: string; chunks: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const [messages, setMessages] = useState<Msg[]>([]);
  const [lastSources, setLastSources] = useState<Source[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function upload(file: File) {
    setUploading(true);
    setErr("");
    setMessages([]);
    setLastSources([]);
    setDoc(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "upload failed");
      setDoc(data);
    } catch (e: any) {
      setErr(e?.message || "upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function ask() {
    if (!doc || !q.trim() || busy) return;
    const question = q.trim();
    setQ("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.documentId, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "chat failed");
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
      setLastSources(data.sources || []);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: e?.message || "error" }]);
      setLastSources([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--gh-border)] bg-[var(--gh-canvas)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-[var(--gh-fg)] text-white">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[var(--gh-fg)]">notebooklm-rag</span>
          </div>
          <a
            href="https://github.com/kushaltalati/notebooklm-rag"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-[var(--gh-border)] bg-[var(--gh-canvas-subtle)] px-3 py-1 text-xs font-medium text-[var(--gh-fg)] hover:bg-[#eaeef2]"
          >
            source
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-[var(--gh-fg)]">chat with a document</h1>
          <p className="mt-1 text-sm text-[var(--gh-fg-muted)]">
            upload a pdf or text file. ask questions. answers come only from the document.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          <aside className="flex flex-col gap-4">
            <div className="rounded-md border border-[var(--gh-border)] bg-[var(--gh-canvas)]">
              <div className="border-b border-[var(--gh-border)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gh-fg-muted)]">
                document
              </div>
              <div className="p-3 text-sm">
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                />
                {doc ? (
                  <div className="mb-3">
                    <div className="break-all font-medium text-[var(--gh-fg)]">{doc.filename}</div>
                    <div className="mt-1 text-xs text-[var(--gh-fg-muted)]">
                      {doc.chunks} chunks indexed
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 text-[var(--gh-fg-muted)]">no document yet.</div>
                )}

                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="w-full rounded-md bg-[var(--gh-success)] px-3 py-[5px] text-sm font-medium text-white shadow-sm hover:bg-[var(--gh-success-hover)] disabled:opacity-60"
                >
                  {uploading ? "indexing..." : doc ? "replace document" : "upload document"}
                </button>
                {err && (
                  <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                    {err}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md border border-[var(--gh-border)] bg-[var(--gh-canvas)] p-3 text-xs text-[var(--gh-fg-muted)]">
              <div className="mb-2 font-semibold uppercase tracking-wide">about</div>
              <p className="leading-relaxed">
                rag pipeline: chunk → embed (hf miniLM-L6) → qdrant → retrieve top 4 → groq llama 3.1.
                answers cite page numbers from the source.
              </p>
            </div>
          </aside>

          <section className="flex min-h-[520px] flex-col rounded-md border border-[var(--gh-border)] bg-[var(--gh-canvas)]">
            <div className="flex items-center justify-between border-b border-[var(--gh-border)] px-4 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--gh-fg-muted)]">
                conversation
              </div>
              {lastSources.length > 0 && (
                <button
                  onClick={() => setShowSources((v) => !v)}
                  className="text-xs font-medium text-[var(--gh-accent)] hover:underline"
                >
                  {showSources ? "hide" : "show"} sources ({lastSources.length})
                </button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="grid h-full place-items-center text-sm text-[var(--gh-fg-muted)]">
                  {doc
                    ? "ask anything about the document."
                    : "upload a document on the left to get started."}
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.role === "user"
                        ? "ml-auto max-w-[85%] rounded-md bg-[var(--gh-fg)] px-3 py-2 text-sm text-white"
                        : "mr-auto max-w-[85%] whitespace-pre-wrap rounded-md border border-[var(--gh-border)] bg-[var(--gh-canvas-subtle)] px-3 py-2 text-sm text-[var(--gh-fg)]"
                    }
                  >
                    {m.content}
                  </div>
                ))
              )}
              {busy && (
                <div className="mr-auto rounded-md border border-[var(--gh-border)] bg-[var(--gh-canvas-subtle)] px-3 py-2 text-sm text-[var(--gh-fg-muted)]">
                  thinking…
                </div>
              )}

              {showSources && lastSources.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-dashed border-[var(--gh-border)] pt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--gh-fg-muted)]">
                    retrieved chunks
                  </div>
                  {lastSources.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-md border border-[var(--gh-border)] bg-[var(--gh-canvas-subtle)] p-2 text-xs"
                    >
                      <div className="mb-1 font-medium text-[var(--gh-fg)]">
                        {s.source ?? "document"}
                        {s.page ? ` · page ${s.page}` : ""}
                      </div>
                      <div className="text-[var(--gh-fg-muted)]">{s.snippet}…</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask();
              }}
              className="border-t border-[var(--gh-border)] bg-[var(--gh-canvas-subtle)] px-3 py-2"
            >
              <div className="flex items-center gap-2 rounded-md border border-[var(--gh-border)] bg-[var(--gh-canvas)] px-2 py-1 focus-within:border-[var(--gh-accent)] focus-within:ring-1 focus-within:ring-[var(--gh-accent)]">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={doc ? "ask a question..." : "upload a document first"}
                  disabled={!doc || busy}
                  className="flex-1 bg-transparent px-1 py-1 text-sm outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!doc || busy || !q.trim()}
                  className="rounded-md bg-[var(--gh-success)] px-3 py-1 text-xs font-medium text-white hover:bg-[var(--gh-success-hover)] disabled:opacity-50"
                >
                  ask
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--gh-border)] bg-[var(--gh-canvas)] py-3 text-center text-xs text-[var(--gh-fg-muted)]">
        next.js · qdrant · huggingface · groq
      </footer>
    </div>
  );
}
