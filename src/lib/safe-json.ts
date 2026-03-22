/** Safely parse JSON from a fetch Response. Prevents crashes when API returns HTML/plain text (e.g. error pages). */
export async function safeJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    return { error: "Invalid response", _raw: text?.slice(0, 200) } as T;
  }
}
