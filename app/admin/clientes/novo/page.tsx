"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function NovoClientePage() {
  const isProductionDeploy = process.env.NODE_ENV === "production";
  const router = useRouter();

  const [tipo, setTipo] = useState<"normal" | "dasa" | "">("");

  const [cliente, setCliente] = useState("");
  const [subcliente, setSubcliente] = useState("");
  const [unidade, setUnidade] = useState("");
  const [marca, setMarca] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);

  async function salvarCliente() {
    if (!tipo) {
      alert("Selecione o tipo de cliente");
      return;
    }

    if (tipo === "normal" && !cliente) {
      alert("Cliente e obrigatorio");
      return;
    }

    if (tipo === "dasa" && (!unidade || !marca)) {
      alert("Unidade e marca sao obrigatorias para DASA");
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/clientes", {
        method: "POST",
        body: JSON.stringify({
          cliente: tipo === "dasa" ? "DASA" : cliente,
          subcliente: tipo === "normal" ? subcliente : "",
          unidade: tipo === "dasa" ? unidade : "",
          marca: tipo === "dasa" ? marca : "",
          endereco,
          telefone,
          ...(isProductionDeploy ? {} : { email }),
        }),
      });

      alert("Cliente salvo com sucesso!");
      router.push("/admin/clientes");
    } catch (err: unknown) {
      alert("Erro ao salvar cliente: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f8ff] flex items-center justify-center p-4 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Novo Cliente</h1>

          <button
            onClick={() => router.back()}
            className="border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-blue-700 font-semibold"
          >
            Voltar
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1">Tipo de Cliente</label>
          <select className="w-full border rounded-lg p-2" value={tipo} onChange={(e) => setTipo(e.target.value as "normal" | "dasa" | "")}>
            <option value="">Selecione</option>
            <option value="normal">Cliente Normal</option>
            <option value="dasa">DASA</option>
          </select>
        </div>

        {tipo === "normal" && (
          <>
            <input
              className="w-full border rounded-lg p-2 mb-3"
              placeholder="Cliente (ex: Brinks)"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
            />

            <input
              className="w-full border rounded-lg p-2 mb-3"
              placeholder="Subcliente (ex: Brinks Recife)"
              value={subcliente}
              onChange={(e) => setSubcliente(e.target.value)}
            />
          </>
        )}

        {tipo === "dasa" && (
          <>
            <input className="w-full border rounded-lg p-2 mb-3 bg-gray-100" value="DASA" disabled />

            <input className="w-full border rounded-lg p-2 mb-3" placeholder="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} />

            <input className="w-full border rounded-lg p-2 mb-3" placeholder="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
          </>
        )}

        <input className="w-full border rounded-lg p-2 mb-3" placeholder="Endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />

        <input className="w-full border rounded-lg p-2 mb-3" placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />

        {!isProductionDeploy && (
          <input className="w-full border rounded-lg p-2 mb-6" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}

        <button
          onClick={salvarCliente}
          disabled={loading}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg"
        >
          {loading ? "Salvando..." : "Salvar Cliente"}
        </button>
      </div>
    </div>
  );
}
