"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function TecnicosPage() {
  const router = useRouter();
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarTecnicos();
  }, []);

  async function carregarTecnicos() {
    try {
      const data = await apiFetch("/auth/tecnicos");

      // ✅ CORREÇÃO: garante array mesmo com 204
      setTecnicos(data || []);
    } catch (err: any) {
      alert("Erro ao carregar técnicos: " + err.message);
      setTecnicos([]);
    } finally {
      setLoading(false);
    }
  }

  async function excluirTecnico(id: string) {
    const ok = confirm("Tem certeza que deseja excluir este técnico?");
    if (!ok) return;

    try {
      await apiFetch(`/auth/tecnicos/${id}`, {
        method: "DELETE",
      });

      alert("Técnico excluído com sucesso");
      carregarTecnicos();
    } catch (err: any) {
      alert("Erro ao excluir técnico: " + err.message);
    }
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-black">Técnicos</h1>
          <button
            onClick={() => router.push("/admin")}
            className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
          >
            Voltar
          </button>
        </div>

        <button
          onClick={() => router.push("/admin/tecnicos/novo")}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded mb-4"
        >
          + Novo Técnico
        </button>

        {tecnicos.length === 0 && (
          <p className="text-gray-500 mb-3">Nenhum técnico cadastrado.</p>
        )}

        <div className="space-y-3">
          {tecnicos.map((t) => (
            <div
              key={t._id}
              className="flex justify-between items-center border p-3 rounded"
            >
              <div>
                <p className="font-semibold text-black">{t.nome}</p>
                <p className="text-sm text-gray-600">{t.email}</p>
              </div>

              <button
                onClick={() => excluirTecnico(t._id)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded"
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
