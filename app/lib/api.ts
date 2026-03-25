const API_URL_RAW =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:10000";

const API_URL = API_URL_RAW.replace("://localhost", "://127.0.0.1");

export function projectOsPath(path: string) {
  return `/projects/os${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const base = typeof window !== "undefined" ? "/lib/proxy" : API_URL;
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers,
    cache: options.cache || "no-store",
  });

  if (!res.ok) {
    let message = "Erro no servidor";
    const raw = await res.text();
    if (raw) {
      try {
        const data = JSON.parse(raw) as { error?: string; message?: string };
        message = data.error || data.message || message;
      } catch {
        message = raw;
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

export function downloadJsonFile(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export { API_URL };
