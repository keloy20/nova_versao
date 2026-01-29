const API_URL = "https://gerenciador-de-os.onrender.com";

export async function apiFetch(path: string, options: RequestInit = {}) {
  if (!API_URL) {
    throw new Error("API_URL não configurada");
  }

  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  // ✅ AGORA NÃO DÁ ERRO NO TS
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
    } catch {
      message = "Erro interno do servidor";
    }

    throw new Error(message);
  }

  return res.json();
}
