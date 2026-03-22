export function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim() || "";
  if (!apiKey) return "";
  if (apiKey === "sk-your-key-here") return "";
  if (apiKey.includes("your-key-here")) return "";
  return apiKey;
}

export function hasOpenAiApiKey() {
  return Boolean(getOpenAiApiKey());
}
