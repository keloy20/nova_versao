"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function EditarClientePage() {
  const isProductionDeploy = process.env.NODE_ENV === "production";
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [cliente, setCliente] = useState("");
  const [subcliente, setSubcliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarCliente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarCliente() {
    try {
      const data = await apiFetch(`/clientes/${id}`);
      setCliente(data.cliente || "");
      setSubcliente(data.subcliente || "");
      setTelefone(data.telefone || "");
      setEmail(data.email || "");
    } catch {
      alert("Erro ao carregar cliente");
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    setSalvando(true);

    try {
      await apiFetch(`/clientes/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          cliente,
          subcliente,
          telefone,
          ...(isProductionDeploy ? {} : { email }),
        }),
      });

      alert("Cliente atualizado com sucesso!");
      router.push("/admin/clientes");
    } catch {
      alert("Erro ao salvar cliente");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f3f8ff] p-6">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6 border border-blue-100">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Editar Cliente</h1>
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
          >
            Voltar
          </button>
        </div>

        <input className="border p-2 rounded w-full mb-3" placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />

        <input className="border p-2 rounded w-full mb-3" placeholder="Subcliente" value={subcliente} onChange={(e) => setSubcliente(e.target.value)} />

        <input className="border p-2 rounded w-full mb-3" placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />

        {!isProductionDeploy && (
          <input className="border p-2 rounded w-full mb-4" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}

        <div className="flex gap-2">
          <button
            onClick={salvar}
            disabled={salvando}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>

          <button
            onClick={() => router.push("/admin/clientes")}
            className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
