const API_URL = "https://gerenciador-de-os.onrender.com";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

  const headers: any = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  // ❗ SÓ define JSON se NÃO for FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(API_URL + path, {
    ...options,
    headers
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("❌ Backend não retornou JSON. Resposta foi:", text);
    throw new Error("Resposta inválida do servidor");
  }
}
