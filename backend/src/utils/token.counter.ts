/**
 * Rough token counter — uses 4 chars ≈ 1 token heuristic.
 * Replace with tiktoken for more accuracy in production.
 */
export function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function countMessagesTokens(
  messages: Array<{ role: string; content: string }>
): number {
  return messages.reduce((sum, m) => sum + countTokens(m.content) + 4, 0);
}

/**
 * Trim a messages array to fit within a token budget.
 * Always keeps the system message (index 0) and the last user message.
 */
export function trimToTokenBudget(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number
): Array<{ role: string; content: string }> {
  let total = countMessagesTokens(messages);
  if (total <= maxTokens) return messages;

  const result = [...messages];
  // Remove from the middle (keep system + last 2 messages)
  let i = 1;
  while (total > maxTokens && i < result.length - 2) {
    total -= countTokens(result[i].content) + 4;
    result.splice(i, 1);
  }
  return result;
}
