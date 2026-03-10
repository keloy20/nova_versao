"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { formatDate, statusBadgeClass, statusLabel } from "@/app/lib/os";

type Servico = {
  _id: string;
  osNumero?: string;
  cliente?: string;
  status?: string;
  data_abertura?: string;
};

export default function AdminServicosPage() {
  const router = useRouter();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      router.push("/login");
      return;
    }

    carregar();
  }, [router]);

  async function carregar() {
    try {
      const data = await apiFetch("/projects/admin/all");
      setServicos(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar servicos";
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  async function excluirOS(id: string) {
    const ok = confirm("Tem certeza que deseja EXCLUIR esta OS?");
    if (!ok) return;

    try {
      await apiFetch(`/projects/admin/delete/${id}`, { method: "DELETE" });
      setServicos((prev) => prev.filter((s) => s._id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao excluir OS";
      alert(message);
    }
  }

  if (loading) return <p className="rounded-2xl border border-slate-200 bg-white p-4">Carregando...</p>;

  return (
    <div className="space-y-3">
      {servicos.map((s) => (
        <div key={s._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-lg font-extrabold text-slate-900">{s.osNumero}</p>
              <p className="text-sm text-slate-700">{s.cliente}</p>
              <p className="text-xs text-slate-500">Abertura: {formatDate(s.data_abertura)}</p>
            </div>

            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(s.status)}`}>
              {statusLabel(s.status)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => router.push(`/admin/servicos/${s._id}`)} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-white">Ver</button>
            <button onClick={() => excluirOS(s._id)} className="rounded-xl bg-rose-700 px-3 py-2 text-sm font-bold text-white">Excluir</button>
          </div>
        </div>
      ))}
    </div>
  );
}
