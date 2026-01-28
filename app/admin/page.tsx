"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [servicos, setServicos] = useState<any[]>([]);
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
      setServicos(data || []);
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
    return <p>Carregando...</p>;
  }

  return (
    <div className="grid gap-4">
      {servicos.map((s) => (
        <div key={s._id} className="bg-white p-4 rounded shadow">
          <b>{s.osNumero}</b>
          <p>Cliente: {s.cliente}</p>
          <p>Status: {s.status}</p>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => router.push(`/admin/servicos/${s._id}`)}
              className="btn-blue"
            >
              Ver
            </button>
            <button
              onClick={() => cancelarServico(s._id)}
              className="btn-red"
            >
              Cancelar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
