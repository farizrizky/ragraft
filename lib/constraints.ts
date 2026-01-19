import type { CoreMessage } from "ai";

type ConstraintOptions = {
  maxOutputTokens?: number | null;
  ragMaxChunks?: number | null;
  ragChunkMaxChars?: number | null;
  ragMaxContextChars?: number | null;
};

export function buildConstraintMessage(
  options: ConstraintOptions,
): CoreMessage | null {
  const parts: string[] = [];

  if (options.maxOutputTokens && options.maxOutputTokens > 0) {
    parts.push(`max_output_tokens=${options.maxOutputTokens}`);
  }
  if (options.ragMaxChunks && options.ragMaxChunks > 0) {
    parts.push(`rag_max_chunks=${options.ragMaxChunks}`);
  }
  if (options.ragChunkMaxChars && options.ragChunkMaxChars > 0) {
    parts.push(`rag_chunk_max_chars=${options.ragChunkMaxChars}`);
  }
  if (options.ragMaxContextChars && options.ragMaxContextChars > 0) {
    parts.push(`rag_max_context_chars=${options.ragMaxContextChars}`);
  }

  if (parts.length === 0) {
    return null;
  }

  return {
    role: "system",
    content: [
      `Generation constraints: ${parts.join(", ")}.`,
      "Knowledge chunks may be truncated at sentence boundaries.",
      "Write complete sentences and avoid ending mid-sentence.",
      "If you are near the limit, shorten the response but keep it complete.",
    ].join(" "),
  };
}
