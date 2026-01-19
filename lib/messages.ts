import type { CoreMessage } from "ai";

export function limitMessagesForContext(
  messages: CoreMessage[],
  limit?: number | null,
) {
  if (!limit || limit <= 0) {
    return messages;
  }
  const systemMessages = messages.filter((message) => message.role === "system");
  const regularMessages = messages.filter((message) => message.role !== "system");
  if (regularMessages.length <= limit) {
    return messages;
  }
  return [...systemMessages, ...regularMessages.slice(-limit)];
}
