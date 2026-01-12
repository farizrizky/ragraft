const SUPERMEMORY_BASE_URL = "https://api.supermemory.ai";
const DEFAULT_CONTAINER_TAG = "ragraft_default";

type SupermemorySearchResult = {
  chunks?: unknown[];
  results?: unknown[];
  matches?: unknown[];
  data?: unknown[];
};

function getApiKey() {
  return process.env.SUPERMEMORY_API_KEY ?? "";
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
  options?: { containerTag?: string },
) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("SUPERMEMORY_API_KEY is not set.");
  }

  const containerTag = options?.containerTag ?? getContainerTag();
  const response = await fetch(`${SUPERMEMORY_BASE_URL}/v3/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      containerTag,
      metadata: title ? { title } : undefined,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to add Supermemory document.");
  }

  return response.json();
}

export async function searchSupermemory(
  query: string,
  options?: { containerTags?: string[] },
) {
  const apiKey = getApiKey();
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

export async function deleteSupermemoryByTag(containerTag: string) {
  const apiKey = getApiKey();
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
