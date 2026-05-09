import { NextRequest, NextResponse } from "next/server";
import { Document } from "@langchain/core/documents";
import { extractText, getDocumentProxy } from "unpdf";
import { nanoid } from "nanoid";
import { indexDocs, splitter } from "@/lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const isPdf = name.endsWith(".pdf");
    const isText = name.endsWith(".txt") || name.endsWith(".md");

    if (!isPdf && !isText) {
      return NextResponse.json(
        { error: "Only PDF or text files" },
        { status: 400 }
      );
    }

    const buf = await file.arrayBuffer();
    const id = `doc_${nanoid(10)}`;
    const split = splitter();
    const docs: Document[] = [];

    if (isPdf) {
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(pdf, { mergePages: false });
      const pages = Array.isArray(text) ? text : [text];

      for (let i = 0; i < pages.length; i++) {
        const pageText = pages[i];
        if (!pageText.trim()) continue;
        const chunks = await split.splitText(pageText);
        for (const c of chunks) {
          docs.push(
            new Document({
              pageContent: c,
              metadata: { source: file.name, page: i + 1, documentId: id },
            })
          );
        }
      }
    } else {
      const text = new TextDecoder().decode(buf);
      const chunks = await split.splitText(text);
      for (const c of chunks) {
        docs.push(
          new Document({
            pageContent: c,
            metadata: { source: file.name, page: 1, documentId: id },
          })
        );
      }
    }

    if (docs.length === 0) {
      return NextResponse.json(
        { error: "Couldn't extract any text" },
        { status: 422 }
      );
    }

    await indexDocs(id, docs);

    return NextResponse.json({
      documentId: id,
      filename: file.name,
      chunks: docs.length,
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
