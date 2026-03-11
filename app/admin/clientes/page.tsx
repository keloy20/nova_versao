"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Search, Trash2, UserRoundPen } from "lucide-react";
import { apiFetch } from "@/app/lib/api";

type Cliente = {
  _id: string;
  cliente?: string;
  subcliente?: string;
  unidade?: string;
  marca?: string;
  telefone?: string;
  email?: string;
};

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarClientes();
  }, []);

  async function carregarClientes() {
    try {
      const data = await apiFetch("/clientes");
      setClientes(Array.isArray(data) ? (data as Cliente[]) : []);
    } catch (err: unknown) {
      alert("Erro ao carregar clientes: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  async function excluirCliente(id: string) {
    const ok = confirm("Tem certeza que deseja excluir este cliente?");
    if (!ok) return;

    try {
      await apiFetch(`/clientes/${id}`, { method: "DELETE" });
      await carregarClientes();
    } catch (err: unknown) {
      alert("Erro ao excluir cliente: " + (err instanceof Error ? err.message : "erro desconhecido"));
    }
  }

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;

    return clientes.filter((item) =>
      [item.cliente, item.subcliente, item.unidade, item.marca, item.telefone, item.email]
        .join(" ")
        .toLowerCase()
        .includes(termo)
    );
  }, [busca, clientes]);

  const totalDasa = clientes.filter((c) => String(c.cliente || "").toLowerCase() === "dasa").length;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard titulo="Total de clientes" valor={clientes.length} cor="bg-sky-700" />
        <MetricCard titulo="Registros DASA" valor={totalDasa} cor="bg-indigo-700" />
        <MetricCard titulo="Clientes comuns" valor={Math.max(0, clientes.length - totalDasa)} cor="bg-emerald-700" />
      </section>

      <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Clientes</h2>
            <p className="text-sm text-slate-500">Gerencie clientes, subclientes e unidades vinculadas.</p>
          </div>
          <button
            onClick={() => router.push("/admin/clientes/novo")}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
          >
            <Plus size={16} />
            Novo cliente
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5">
          <Search size={16} className="text-slate-400" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Buscar por cliente, subcliente, marca, unidade, telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        {loading && <p className="p-4 text-sm text-slate-500">Carregando clientes...</p>}
        {!loading && lista.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Nenhum cliente encontrado.
          </p>
        )}

        <div className="space-y-3">
          {lista.map((cliente) => {
            const isDasa = String(cliente.cliente || "").toLowerCase() === "dasa";

            return (
              <article
                key={cliente._id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-slate-900">{cliente.cliente || "Sem nome"}</p>
                      <p className="text-sm text-slate-600">
                        {isDasa
                          ? `Marca: ${cliente.marca || "-"} | Unidade: ${cliente.unidade || "-"}`
                          : `Subcliente: ${cliente.subcliente || "-"}`}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Telefone: {cliente.telefone || "-"}{cliente.email ? ` | Email: ${cliente.email}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push(`/admin/clientes/${cliente._id}/editar`)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <UserRoundPen size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => excluirCliente(cliente._id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-3 py-2 text-sm font-bold text-white hover:bg-rose-800"
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
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
