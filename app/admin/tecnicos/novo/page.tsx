"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function NovoTecnicoPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          nome,
          email,
          senha,
          telefone,
          role: "tecnico",
        }),
      });

      alert("Técnico cadastrado com sucesso!");
      router.push("/admin/tecnicos");

    } catch (err: unknown) {
      alert("Erro: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f8ff] p-6 text-slate-900">
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow border border-blue-100">

        <h1 className="text-2xl font-bold mb-4">Cadastrar Técnico</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          <input
            type="text"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <input
            type="tel"
            placeholder="Telefone (DDD + número)"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin/tecnicos")}
              className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded"
            >
              Voltar
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
