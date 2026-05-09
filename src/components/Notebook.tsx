"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Notebook() {
  const [doc, setDoc] = useState<{ documentId: string; filename: string; chunks: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const [messages, setMessages] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setErr("");
    setMessages([]);
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
    } catch (e: unknown) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: e instanceof Error ? e.message : "Error" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-semibold">NotebookLM RAG</h1>

      <div className="rounded border border-neutral-300 bg-white p-3">
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
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            {doc ? (
              <>
                <div>{doc.filename}</div>
                <div className="text-xs text-neutral-500">{doc.chunks} chunks indexed</div>
              </>
            ) : (
              <span className="text-neutral-500">No file uploaded</span>
            )}
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {uploading ? "Indexing..." : doc ? "Replace" : "Upload PDF / Text"}
          </button>
        </div>
        {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
      </div>

      <div className="flex flex-1 flex-col rounded border border-neutral-300 bg-white">
        <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-neutral-500">
              {doc ? "Ask anything about the document" : "Upload a file to start"}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded bg-black px-3 py-2 text-white"
                  : "mr-auto max-w-[85%] whitespace-pre-wrap rounded bg-neutral-100 px-3 py-2"
              }
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="mr-auto max-w-[85%] rounded bg-neutral-100 px-3 py-2 text-neutral-500">
              ...
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
          className="flex gap-2 border-t border-neutral-200 p-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={doc ? "Ask a question..." : "Upload a file first"}
            disabled={!doc || busy}
            className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-sm outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!doc || busy || !q.trim()}
            className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
