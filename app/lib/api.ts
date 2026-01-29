const API_URL = "https://gerenciador-de-os.onrender.com";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = "Erro no servidor";
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}
