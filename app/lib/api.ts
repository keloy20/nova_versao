const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.VITE_API_URL ||
  "https://gerenciador-de-os.onrender.com";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const isBrowser = typeof window !== "undefined";
  const localAlt = API_URL.replace("http://localhost", "http://127.0.0.1");
  const bases = isBrowser ? [API_URL, localAlt, "/lib/proxy"] : [API_URL];
  const uniqueBases = Array.from(new Set(bases));

  let res: Response | null = null;
  let lastFetchError: unknown = null;

  for (const base of uniqueBases) {
    try {
      res = await fetch(`${base}${path}`, {
        ...options,
        headers,
        cache: options.cache || "no-store",
      });
      break;
    } catch (err) {
      lastFetchError = err;
    }
  }

  if (!res) {
    throw lastFetchError instanceof Error ? lastFetchError : new Error("Falha de conexao com a API");
  }

  if (!res.ok) {
    let message = "Erro no servidor";
    try {
      const data = await res.json();
      message = data.error || data.message || message;
    } catch {
      const text = await res.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    return text;
  }
  return res.json();
}

export { API_URL };
