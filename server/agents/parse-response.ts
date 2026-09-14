/** Tolerate one enclosing Markdown code fence, then require complete valid JSON. */
export function parseModelJson(content: string): unknown {
  const trimmed = content.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fence ? fence[1] : trimmed);
}
