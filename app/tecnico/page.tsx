"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function TecnicoPage() {
  const router = useRouter();
  const [servicos, setServicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "tecnico") {
      router.push("/login");
      return;
    }

    carregarServicos();
  }, []);

  async function carregarServicos() {
    try {
      const data = await apiFetch("/projects/tecnico/my");
      setServicos(data);
    } catch (err: any) {
      alert(err.message || "Erro ao carregar serviços");
    } finally {
      setLoading(false);
    }
  }

  async function abrirChamado(id: string) {
    try {
      await apiFetch(`/projects/tecnico/abrir/${id}`, {
        method: "PUT"
      });

      router.push(`/tecnico/servicos/${id}`);
    } catch (err: any) {
      alert(err.message || "Erro ao abrir chamado");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-black">
      <h1 className="text-2xl font-bold mb-4">Meus Chamados</h1>

      {servicos.length === 0 && <p>Nenhum chamado atribuído.</p>}

      <div className="grid gap-4">
        {servicos.map((s) => (
          <div key={s._id} className="bg-white p-4 rounded shadow flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-bold">{s.osNumero}</span>
              <span className="text-sm">
                {s.status === "aguardando_tecnico" && "Aguardando"}
                {s.status === "em_andamento" && "Em andamento"}
                {s.status === "concluido" && "Concluído"}
              </span>
            </div>

            <div><b>Cliente:</b> {s.cliente}</div>

            <div className="flex gap-2 mt-2 flex-wrap">
              <button
                onClick={() => router.push(`/tecnico/servicos/${s._id}`)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Ver
              </button>

              {s.status === "aguardando_tecnico" && (
                <button
                  onClick={() => abrirChamado(s._id)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Abrir chamado
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
