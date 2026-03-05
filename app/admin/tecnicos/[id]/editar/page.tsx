"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function EditarTecnicoPage() {
  const { id } = useParams();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarTecnico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarTecnico() {
    try {
      const data = await apiFetch(`/auth/tecnicos/${id}`);
      setNome(data.nome);
      setEmail(data.email);
      setTelefone(data.telefone || "");
    } catch (err: unknown) {
      alert("Erro ao carregar tecnico: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    try {
      await apiFetch(`/auth/tecnicos/${id}`, {
        method: "PUT",
        body: JSON.stringify({ nome, email, telefone }),
      });

      alert("Tecnico atualizado com sucesso");
      router.push("/admin/tecnicos");
    } catch (err: unknown) {
      alert("Erro ao salvar: " + (err instanceof Error ? err.message : "erro desconhecido"));
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#f3f8ff] p-6">
      <div className="mx-auto max-w-md rounded-xl border border-blue-100 bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Editar Tecnico</h1>
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
          >
            Voltar
          </button>
        </div>

        <input
          className="mb-3 w-full rounded border p-2"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <input
          className="mb-3 w-full rounded border p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="mb-4 w-full rounded border p-2"
          placeholder="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        <div className="flex gap-2">
          <button onClick={salvar} className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800">
            Salvar
          </button>

          <button
            onClick={() => router.push("/admin/tecnicos")}
            className="rounded bg-slate-500 px-4 py-2 text-white hover:bg-slate-600"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
