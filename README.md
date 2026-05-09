# notebooklm-rag

assignment 03 submission. small notebooklm clone — upload a pdf or text file, ask questions about it, get answers from the file.

live: https://notebooklm-rag-eta.vercel.app

## stack

- next.js (app router) + typescript
- qdrant cloud (vector db, free tier)
- huggingface inference for embeddings (`sentence-transformers/all-MiniLM-L6-v2`)
- groq for the llm (`llama-3.1-8b-instant`)
- unpdf for parsing pdfs

all free.

## how it works

upload flow:
1. file goes to `/api/upload`
2. text extracted (per page for pdfs)
3. chunked with `RecursiveCharacterTextSplitter`, size 1000 with 200 overlap
4. each chunk embedded with hf
5. pushed into a qdrant collection named after the document id

ask flow:
1. question goes to `/api/chat` with the document id
2. embed the question, pull top 4 chunks from the matching qdrant collection
3. send chunks + question to groq with a system prompt that says "only answer from the context, otherwise say you can't find it"
4. return the answer + the chunks used

i went with the recursive splitter because it tries to break on paragraph -> line -> sentence boundaries instead of slicing mid-word. the 200 char overlap helps when an answer sits across a chunk boundary. one collection per uploaded file means questions about doc A can't accidentally pull from doc B.

## running it locally

```
npm install
cp .env.example .env.local
npm run dev
```

then fill in `.env.local`:

```
GROQ_API_KEY=
HUGGINGFACEHUB_API_KEY=
QDRANT_URL=
QDRANT_API_KEY=
```

keys are from https://console.groq.com, https://huggingface.co/settings/tokens, https://cloud.qdrant.io.

if you'd rather run qdrant locally instead of cloud:

```
docker run -p 6333:6333 qdrant/qdrant
```

then `QDRANT_URL=http://localhost:6333` and leave the api key empty.

## deploying

pushed the repo to github, imported it on vercel, pasted the four env vars in project settings, hit deploy. that was it.
