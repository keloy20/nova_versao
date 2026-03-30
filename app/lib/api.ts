const API_URL_RAW =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:3001";

const API_URL = API_URL_RAW.replace("://localhost", "://127.0.0.1");

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
  const isFormData = options.body instanceof FormData;
  const shouldBypassProxy = isBrowser && isFormData;
  const base = isBrowser ? (shouldBypassProxy ? API_URL : "/lib/proxy") : API_URL;
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers,
    cache: options.cache || "no-store",
  });

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("nome");

    const isLoginRoute = window.location.pathname.startsWith("/login");
    if (!isLoginRoute) {
      window.location.href = "/login?reason=session-expired";
    }
  }

  if (!res.ok) {
    let message = "Erro no servidor";
    const raw = await res.text();
    if (raw) {
      try {
        const data = JSON.parse(raw) as { error?: string; message?: string };
        message = data.error || data.message || message;
      } catch {
        const trimmed = raw.trim();
        if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html")) {
          message = `Erro ${res.status}: servico indisponivel ou falha no backend`;
        } else {
          message = raw;
        }
      }
    }
    throw new Error(message);
  }

  const raw = await res.text();
  if (!raw) return null;

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return raw;
}

export { API_URL };
