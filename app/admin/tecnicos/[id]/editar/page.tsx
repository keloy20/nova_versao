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
  }, []);

  async function carregarTecnico() {
    try {
      const data = await apiFetch(`/auth/tecnicos/${id}`);
      setNome(data.nome);
      setEmail(data.email);
      setTelefone(data.telefone || "");
    } catch (err: any) {
      alert("Erro ao carregar técnico: " + err.message);
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

      alert("Técnico atualizado com sucesso");
      router.push("/admin/tecnicos");
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4 text-black">
          Editar Técnico
        </h1>

        <input
          className="border p-2 rounded w-full mb-3"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <input
          className="border p-2 rounded w-full mb-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 rounded w-full mb-4"
          placeholder="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={salvar}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Salvar
          </button>

          <button
            onClick={() => router.push("/admin/tecnicos")}
            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
