"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, Plus, Search, Trash2, UserRoundPen, Wrench } from "lucide-react";
import { apiFetch } from "@/app/lib/api";

type Tecnico = {
  _id: string;
  nome?: string;
  email?: string;
  telefone?: string;
};

export default function TecnicosPage() {
  const router = useRouter();
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarTecnicos();
  }, []);

  async function carregarTecnicos() {
    try {
      const data = await apiFetch("/auth/tecnicos");
      setTecnicos(Array.isArray(data) ? (data as Tecnico[]) : []);
    } catch (err: unknown) {
      alert("Erro ao carregar tecnicos: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  async function excluirTecnico(id: string) {
    const ok = confirm("Tem certeza que deseja excluir este tecnico?");
    if (!ok) return;

    try {
      await apiFetch(`/auth/tecnicos/${id}`, { method: "DELETE" });
      await carregarTecnicos();
    } catch (err: unknown) {
      alert("Erro ao excluir tecnico: " + (err instanceof Error ? err.message : "erro desconhecido"));
    }
  }

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return tecnicos;

    return tecnicos.filter((tecnico) =>
      [tecnico.nome, tecnico.email, tecnico.telefone].join(" ").toLowerCase().includes(termo)
    );
  }, [busca, tecnicos]);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard titulo="Tecnicos ativos" valor={tecnicos.length} cor="bg-sky-700" />
        <MetricCard titulo="Com telefone" valor={tecnicos.filter((t) => Boolean(t.telefone)).length} cor="bg-indigo-700" />
        <MetricCard titulo="Com email" valor={tecnicos.filter((t) => Boolean(t.email)).length} cor="bg-emerald-700" />
      </section>

      <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Tecnicos</h2>
            <p className="text-sm text-slate-500">Cadastre e gerencie a equipe responsavel pelos atendimentos.</p>
          </div>
          <button
            onClick={() => router.push("/admin/tecnicos/novo")}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
          >
            <Plus size={16} />
            Novo tecnico
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5">
          <Search size={16} className="text-slate-400" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Buscar por nome, email ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        {loading && <p className="p-4 text-sm text-slate-500">Carregando tecnicos...</p>}
        {!loading && lista.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Nenhum tecnico encontrado.
          </p>
        )}

        <div className="space-y-3">
          {lista.map((tecnico) => (
            <article
              key={tecnico._id}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-slate-900">{tecnico.nome || "Sem nome"}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Mail size={14} />
                        {tecnico.email || "-"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone size={14} />
                        {tecnico.telefone || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push(`/admin/tecnicos/${tecnico._id}/editar`)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <UserRoundPen size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => excluirTecnico(tecnico._id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-3 py-2 text-sm font-bold text-white hover:bg-rose-800"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ titulo, valor, cor }: { titulo: string; valor: number; cor: string }) {
  return (
    <div className={`${cor} rounded-2xl p-4 text-white shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/85">{titulo}</p>
      <p className="mt-1 text-3xl font-extrabold">{valor}</p>
    </div>
  );
}
