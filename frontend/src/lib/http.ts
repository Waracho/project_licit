const baseURL = import.meta.env.VITE_API_URL ?? "";

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(baseURL + path, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
