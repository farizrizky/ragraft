import { getSupermemoryKey } from "@/lib/settings";

const SUPERMEMORY_BASE_URL = "https://api.supermemory.ai";
const DEFAULT_CONTAINER_TAG = "ragnara_default";

type SupermemorySearchResult = {
  chunks?: unknown[];
  results?: unknown[];
  matches?: unknown[];
  data?: unknown[];
};

async function getApiKey(userId: string) {
  const dbKey = await getSupermemoryKey(userId);
  if (dbKey) {
    return dbKey;
  }
  return "";
}

function getContainerTag() {
  const value = process.env.SUPERMEMORY_CONTAINER_TAG?.trim();
  if (value) {
    return value;
  }
  return DEFAULT_CONTAINER_TAG;
}

function extractText(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      extractText(record.content) ||
      extractText(record.body) ||
      extractText(record.summary) ||
      extractText(record.text) ||
      extractText(record.chunk) ||
      extractText(record.chunkContent) ||
      extractText(record.value)
    );
  }
  return null;
}

function extractChunks(payload: SupermemorySearchResult): string[] {
  const buckets = [
    payload.chunks,
    (payload as Record<string, unknown>).documents,
    (payload as Record<string, unknown>).memories,
    payload.results,
    payload.matches,
    payload.data,
  ];
  const texts: string[] = [];

  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) {
      continue;
    }
    for (const item of bucket) {
      const record = item as Record<string, unknown>;
      const nestedChunks = record.chunks;
      if (Array.isArray(nestedChunks)) {
        for (const nested of nestedChunks) {
          const nestedText = extractText(nested);
          if (nestedText) {
            texts.push(nestedText);
          }
        }
      }

      const text =
        extractText(item) ||
        extractText(record.document) ||
        extractText(record.memory) ||
        extractText(record.chunk);
      if (text) {
        texts.push(text);
      }
    }
  }

  return texts;
}

export async function addSupermemoryDocument(
  content: string,
  title?: string,
  options: { containerTag?: string; tag?: string; userId: string },
) {
  const apiKey = await getApiKey(options.userId);
  if (!apiKey) {
    throw new Error("SUPERMEMORY_API_KEY is not set.");
  }

  const containerTag =
    options?.containerTag ?? options?.tag ?? getContainerTag();
  const response = await fetch(`${SUPERMEMORY_BASE_URL}/v3/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      containerTag,
      metadata: title || options?.tag ? { title, tag: options?.tag } : undefined,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to add Supermemory document.");
  }

  return response.json();
}

export function getSupermemoryMemoryId(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const directId = record.memoryId ?? record.id;
  if (typeof directId === "string" && directId.trim()) {
    return directId.trim();
  }
  const data = record.data as Record<string, unknown> | undefined;
  if (data) {
    const dataId = data.memoryId ?? data.id;
    if (typeof dataId === "string" && dataId.trim()) {
      return dataId.trim();
    }
  }
  const memory = record.memory as Record<string, unknown> | undefined;
  if (memory) {
    const memoryId = memory.id ?? memory.memoryId;
    if (typeof memoryId === "string" && memoryId.trim()) {
      return memoryId.trim();
    }
  }
  return null;
}

export async function updateSupermemoryDocument(
  documentId: string,
  content: string,
  title?: string,
  options: { containerTag?: string; tag?: string; userId: string },
) {
  const apiKey = await getApiKey(options.userId);
  if (!apiKey) {
    throw new Error("SUPERMEMORY_API_KEY is not set.");
  }

  const containerTag =
    options?.containerTag ?? options?.tag ?? getContainerTag();
  const response = await fetch(`${SUPERMEMORY_BASE_URL}/v3/documents/${documentId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      containerTag,
      containerTags: [containerTag],
      content,
      metadata: title || options?.tag ? { title, tag: options?.tag } : undefined,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to update Supermemory document.");
  }

  return response.json();
}

export async function searchSupermemory(
  query: string,
  options: { containerTags?: string[]; userId: string },
) {
  const apiKey = await getApiKey(options.userId);
  if (!apiKey) {
    throw new Error("SUPERMEMORY_API_KEY is not set.");
  }

  const containerTags =
    options?.containerTags && options.containerTags.length > 0
      ? options.containerTags
      : [getContainerTag()];
  const response = await fetch(`${SUPERMEMORY_BASE_URL}/v3/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      containerTags,
      chunkThreshold: 0,
      documentThreshold: 0,
      onlyMatchingChunks: true,
      includeFullDocs: false,
      includeSummary: false,
      limit: 6,
      rerank: false,
      rewriteQuery: false,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to search Supermemory.");
  }

  const payload = (await response.json()) as SupermemorySearchResult;
  return extractChunks(payload);
}

export async function deleteSupermemoryById(memoryId: string, userId: string) {
  const apiKey = await getApiKey(userId);
  if (!apiKey) {
    throw new Error("SUPERMEMORY_API_KEY is not set.");
  }

  const response = await fetch(`${SUPERMEMORY_BASE_URL}/v3/documents/bulk`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids: [memoryId] }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to delete Supermemory memory.");
  }

  return response.json();
}

export async function deleteSupermemoryByTag(containerTag: string, userId: string) {
  const apiKey = await getApiKey(userId);
  if (!apiKey) {
    throw new Error("SUPERMEMORY_API_KEY is not set.");
  }

  const response = await fetch(`${SUPERMEMORY_BASE_URL}/v4/memories`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ containerTag }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to delete Supermemory memories.");
  }

  return response.json();
}
