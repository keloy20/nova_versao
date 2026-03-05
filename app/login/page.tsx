"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      });

      if (!data.token) {
        throw new Error("Token não recebido");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("nome", data.nome || "");

      if (data.role === "admin") {
        router.replace("/admin");
      } else if (data.role === "tecnico") {
        router.replace("/tecnico");
      } else if (data.role === "terceiro" || data.role === "cliente") {
        router.replace("/terceiro");
      } else {
        router.replace("/login");
      }
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_45%),radial-gradient(circle_at_90%_10%,#bfdbfe,transparent_40%)]" />

      <div className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-2">
        <div className="hidden lg:block">
          <p className="mb-2 inline-block rounded-full border border-blue-200 bg-white/75 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            Gerenciador de OS
          </p>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900">
            Login rápido, painel limpo e fluxo de atendimento completo.
          </h1>
          <p className="mt-4 max-w-md text-slate-600">
            Acompanhe abertura, atendimento, pausa, finalização técnica e validação admin em um único lugar.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-300/40 backdrop-blur sm:p-8"
        >
          <h2 className="text-2xl font-extrabold text-slate-900">Entrar no sistema</h2>
          <p className="mt-1 text-sm text-slate-500">Use seu e-mail e senha para continuar.</p>

          {erro && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {erro}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">E-mail</span>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Senha</span>
              <input
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

