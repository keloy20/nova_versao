"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

type OS = {
  _id: string;
  osNumero: string;
  cliente?: string;
  status?: string;
};

const statusColor: Record<string, string> = {
  concluido: "bg-green-100 text-green-700",
  em_andamento: "bg-yellow-100 text-yellow-700",
  aguardando_tecnico: "bg-blue-100 text-blue-700",
  cancelado: "bg-red-100 text-red-700",
};

export default function AdminPage() {
  const router = useRouter();
  const [servicos, setServicos] = useState<OS[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      router.replace("/login");
      return;
    }

    carregarServicos();
  }, []);

  async function carregarServicos() {
    try {
      const data = await apiFetch("/projects/admin/all");
      setServicos(Array.isArray(data) ? data : []);
    } catch {
      localStorage.clear();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  async function cancelarServico(id: string) {
    if (!confirm("Deseja cancelar esta OS?")) return;
    await apiFetch(`/projects/admin/cancelar/${id}`, { method: "PUT" });
    carregarServicos();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <h1 className="text-3xl font-bold mb-6">Painel do Administrador</h1>

      {servicos.length === 0 && (
        <p className="text-gray-600">Nenhuma OS encontrada.</p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {servicos.map((s) => (
          <div
            key={s._id}
            className="bg-white rounded-xl shadow p-5 flex flex-col justify-between"
          >
            <div>
              <p className="text-sm text-gray-500">OS</p>
              <p className="text-xl font-bold">{s.osNumero}</p>

              <p className="mt-2 text-gray-700">
                <b>Cliente:</b> {s.cliente || "Não informado"}
              </p>

              <span
                className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium ${
                  statusColor[s.status || ""] ||
                  "bg-gray-100 text-gray-700"
                }`}
              >
                {s.status}
              </span>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => router.push(`/admin/servicos/${s._id}`)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
              >
                Ver
              </button>

              <button
                onClick={() => cancelarServico(s._id)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
