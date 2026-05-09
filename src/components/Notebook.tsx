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
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setDoc(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
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
      if (!res.ok) throw new Error(data.error || "Chat failed");
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
      setLastSources(data.sources || []);
    } catch (e: unknown) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: e instanceof Error ? e.message : "Error" },
      ]);
      setLastSources([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-[var(--gh-border)] bg-[var(--gh-canvas)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" width="32" height="32" aria-hidden="true">
              <path
                fill="#1f2328"
                d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"
              />
            </svg>
            <span className="text-sm font-semibold text-[var(--gh-fg)]">
              kushaltalati / <span className="font-bold">notebooklm-rag</span>
            </span>
            <span className="ml-1 rounded-full border border-[var(--gh-border)] px-2 py-[1px] text-[11px] font-medium text-[var(--gh-fg-muted)]">
              Public
            </span>
          </div>
          <a
            href="https://github.com/kushaltalati/notebooklm-rag"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-[var(--gh-border)] bg-[var(--gh-canvas-subtle)] px-3 py-1 text-xs font-medium text-[var(--gh-fg)] hover:bg-[#eaeef2]"
          >
            View on GitHub
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-[var(--gh-fg)]">Chat with a document</h1>
          <p className="mt-1 text-sm text-[var(--gh-fg-muted)]">
            Upload a PDF or text file. Ask questions. Answers come only from the document.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="flex flex-col gap-4">
            <div className="rounded-md border border-[var(--gh-border)] bg-[var(--gh-canvas)]">
              <div className="border-b border-[var(--gh-border)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gh-fg-muted)]">
                Document
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
                  <div className="mb-3 text-[var(--gh-fg-muted)]">No document yet.</div>
                )}

                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="w-full rounded-md bg-[var(--gh-success)] px-3 py-[5px] text-sm font-medium text-white shadow-sm hover:bg-[var(--gh-success-hover)] disabled:opacity-60"
                >
                  {uploading ? "Indexing..." : doc ? "Replace document" : "Upload document"}
                </button>
                {err && (
                  <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                    {err}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md border border-[var(--gh-border)] bg-[var(--gh-canvas)] p-3 text-xs text-[var(--gh-fg-muted)]">
              <div className="mb-2 font-semibold uppercase tracking-wide">About</div>
              <p className="leading-relaxed">
                RAG pipeline: chunk → embed (HF MiniLM-L6) → Qdrant → retrieve top 4 → Groq Llama 3.1.
                Answers cite page numbers from the source.
              </p>
            </div>
          </aside>

          {/* Chat panel */}
          <section className="flex min-h-[520px] flex-col rounded-md border border-[var(--gh-border)] bg-[var(--gh-canvas)]">
            <div className="flex items-center justify-between border-b border-[var(--gh-border)] px-4 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--gh-fg-muted)]">
                Conversation
              </div>
              {lastSources.length > 0 && (
                <button
                  onClick={() => setShowSources((v) => !v)}
                  className="text-xs font-medium text-[var(--gh-accent)] hover:underline"
                >
                  {showSources ? "Hide" : "Show"} sources ({lastSources.length})
                </button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="grid h-full place-items-center text-sm text-[var(--gh-fg-muted)]">
                  {doc
                    ? "Ask anything about the document."
                    : "Upload a document on the left to get started."}
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
                  Thinking…
                </div>
              )}

              {showSources && lastSources.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-dashed border-[var(--gh-border)] pt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--gh-fg-muted)]">
                    Retrieved chunks
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
                  placeholder={doc ? "Ask a question..." : "Upload a document first"}
                  disabled={!doc || busy}
                  className="flex-1 bg-transparent px-1 py-1 text-sm outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!doc || busy || !q.trim()}
                  className="rounded-md bg-[var(--gh-success)] px-3 py-1 text-xs font-medium text-white hover:bg-[var(--gh-success-hover)] disabled:opacity-50"
                >
                  Ask
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--gh-border)] bg-[var(--gh-canvas)] py-3 text-center text-xs text-[var(--gh-fg-muted)]">
        Built with Next.js · Qdrant · HuggingFace · Groq
      </footer>
    </div>
  );
}
