import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const DIM = 384;

export function embeddings() {
  return new HuggingFaceInferenceEmbeddings({
    model: MODEL,
    apiKey: process.env.HUGGINGFACEHUB_API_KEY,
  });
}

export function splitter() {
  return new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
}

function qdrantConfig() {
  return {
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY,
  };
}

async function ensureCollection(name: string) {
  const client = new QdrantClient(qdrantConfig());
  const exists = await client.collectionExists(name);
  if (!exists.exists) {
    await client.createCollection(name, {
      vectors: { size: DIM, distance: "Cosine" },
    });
  }
}

export async function indexDocs(collection: string, docs: Document[]) {
  await ensureCollection(collection);
  await QdrantVectorStore.fromDocuments(docs, embeddings(), {
    ...qdrantConfig(),
    collectionName: collection,
  });
}

export async function retriever(collection: string, k = 4) {
  const store = await QdrantVectorStore.fromExistingCollection(embeddings(), {
    ...qdrantConfig(),
    collectionName: collection,
  });
  return store.asRetriever({ k });
}
