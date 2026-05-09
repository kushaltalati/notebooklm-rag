# NotebookLM RAG

Assignment 03 — small NotebookLM clone. Upload a PDF or text file, ask questions, get answers based on the document.

## Stack

- Next.js 16 (App Router)
- Qdrant (vector DB)
- HuggingFace Inference API for embeddings (`all-MiniLM-L6-v2`)
- Groq for the LLM (`llama-3.1-8b-instant`)
- `unpdf` for PDF parsing

All free tier.

## Chunking

Used LangChain's `RecursiveCharacterTextSplitter`:

- chunk size: 1000 chars
- overlap: 200 chars

Recursive splitting tries to break on paragraphs first, then lines, then words, so chunks usually stay on natural boundaries. The 200 char overlap helps when an answer is split across two chunks.

For PDFs each page is split separately and the page number is stored as metadata, so the model can cite pages.

## Pipeline

1. `POST /api/upload` — accepts PDF or txt, extracts text, chunks it, embeds with HF, stores in a Qdrant collection (one per uploaded file).
2. `POST /api/chat` — embeds the question, pulls top 4 chunks from the collection, sends them to Groq with a system prompt that says "only use the context".

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in `.env.local`:

- `GROQ_API_KEY` — from https://console.groq.com
- `HUGGINGFACEHUB_API_KEY` — from https://huggingface.co/settings/tokens
- `QDRANT_URL` and `QDRANT_API_KEY` — from https://cloud.qdrant.io (free tier)

Running Qdrant locally instead:

```bash
docker run -p 6333:6333 qdrant/qdrant
```

then set `QDRANT_URL=http://localhost:6333` and leave the api key empty.

## Deploy

Push to GitHub, import on Vercel, add the four env vars in project settings.

## Notes

The model is told only to answer from the context. If the answer isn't in the document it should say so. Temperature is set low (0.2) to keep answers tied to the source.
