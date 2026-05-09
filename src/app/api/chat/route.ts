import { NextRequest, NextResponse } from "next/server";
import { ChatGroq } from "@langchain/groq";
import { retriever } from "@/lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { documentId, question } = await req.json();
    if (!documentId || !question) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const r = await retriever(documentId, 4);
    const chunks = await r.invoke(question);

    if (chunks.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find anything for this document. Try uploading it first.",
        sources: [],
      });
    }

    const context = chunks
      .map((c, i) => `[${i + 1} | page ${c.metadata?.page ?? "?"}]\n${c.pageContent}`)
      .join("\n\n---\n\n");

    const system = `You are a helpful assistant answering questions about a document the user uploaded.

Rules:
- Only answer using the context below.
- If the answer isn't in the context, say "I couldn't find that in the document."
- Don't use outside knowledge.
- Cite the page like (page 3) when referencing facts.

Context:
${context}`;

    const llm = new ChatGroq({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      apiKey: process.env.GROQ_API_KEY,
    });

    const res = await llm.invoke([
      { role: "system", content: system },
      { role: "user", content: question },
    ]);

    const answer = typeof res.content === "string" ? res.content : String(res.content);

    return NextResponse.json({
      answer,
      sources: chunks.map((c) => ({
        page: c.metadata?.page ?? null,
        source: c.metadata?.source ?? null,
        snippet: c.pageContent.slice(0, 240),
      })),
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
