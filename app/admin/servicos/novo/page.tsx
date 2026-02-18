"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function NovaOSPage() {
  const router = useRouter();

  const [cliente, setCliente] = useState("");
  const [subcliente, setSubcliente] = useState("");
  const [clientesDB, setClientesDB] = useState<any[]>([]);
  const [mostrarLista, setMostrarLista] = useState(false);

  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [marca, setMarca] = useState("");
  const [unidade, setUnidade] = useState("");
  const [detalhamento, setDetalhamento] = useState("");

  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [tecnicoId, setTecnicoId] = useState("");

  const [loading, setLoading] = useState(false);

  const isDASA = cliente.trim().toLowerCase() === "dasa";

  useEffect(() => {
    apiFetch("/auth/tecnicos").then(setTecnicos).catch(() => setTecnicos([]));
  }, []);

  async function carregarClientes(nome: string) {
    try {
      const data = await apiFetch(`/clientes/by-cliente/${nome}`);
      setClientesDB(data);
    } catch {
      setClientesDB([]);
    }
  }

  function selecionarClienteDB(c: any) {
    setCliente(c.cliente || "");
    setSubcliente(c.subcliente || "");
    setEndereco(c.endereco || "");
    setTelefone(c.telefone || "");
    setMarca(c.marca || "");
    setUnidade(c.unidade || "");
    setClientesDB([]);
    setMostrarLista(false);
  }

  async function salvarOS() {
    if (!cliente || !tecnicoId) {
      alert("Cliente e técnico são obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const tecnicoSelecionado = tecnicos.find(t => t._id === tecnicoId);

      const res = await apiFetch("/projects/admin/create", {
        method: "POST",
        body: JSON.stringify({
          cliente,
          subcliente: isDASA ? "" : subcliente,
          endereco,
          telefone,
          marca: isDASA ? marca : "",
          unidade: isDASA ? unidade : "",
          detalhamento,
          tecnicoId,
        }),
      });

      if (tecnicoSelecionado?.telefone && res?.osNumero) {
        localStorage.setItem(
          "whatsapp-pendente",
          JSON.stringify({
            telefone: tecnicoSelecionado.telefone,
            mensagem: `
Olá! 👋
Você recebeu uma nova Ordem de Serviço.

🆔 OS: ${res.osNumero}
👤 Cliente: ${cliente}
📍 Endereço: ${endereco}

Acesse o sistema para mais detalhes.
            `,
          })
        );
      }

      router.push("/admin");
    } catch {
      alert("Erro ao salvar OS");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Nova Ordem de Serviço</h1>

        <input
          className="border p-2 rounded w-full mb-2"
          placeholder="Cliente"
          value={cliente}
          onChange={(e) => {
            const v = e.target.value;
            setCliente(v);
            setSubcliente("");
            setEndereco("");
            setTelefone("");
            setMarca("");
            setUnidade("");

            if (v.trim().length >= 2) {
              setMostrarLista(true);
              carregarClientes(v);
            } else {
              setMostrarLista(false);
              setClientesDB([]);
            }
          }}
        />

        {mostrarLista && clientesDB.length > 0 && (
          <div className="border rounded mb-4 bg-white shadow-lg overflow-hidden">
            {clientesDB.map((c) => (
              <div
                key={c._id}
                onClick={() => selecionarClienteDB(c)}
                className="p-3 cursor-pointer hover:bg-blue-100 border-b last:border-b-0 transition-colors"
              >
                <span className="font-bold">{c.cliente}</span>
                {/* Aqui está a modificação para mostrar unidade e marca se for DASA */}
                {c.cliente?.toLowerCase() === "dasa" ? (
                   <span className="text-sm text-gray-600 ml-2">
                     - Unidade: <strong>{c.unidade}</strong> | Marca: <strong>{c.marca}</strong>
                   </span>
                ) : (
                  c.subcliente && <span className="text-sm text-gray-600 ml-2">- {c.subcliente}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {!isDASA && (
          <input
            className="border p-2 rounded w-full mb-3"
            placeholder="Subcliente"
            value={subcliente}
            onChange={(e) => setSubcliente(e.target.value)}
          />
        )}

        {isDASA && (
          <>
            <input className="border p-2 rounded w-full mb-3 bg-gray-100" placeholder="Unidade" value={unidade} readOnly />
            <input className="border p-2 rounded w-full mb-3 bg-gray-100" placeholder="Marca" value={marca} readOnly />
          </>
        )}

        <input className="border p-2 rounded w-full mb-3" placeholder="Endereço" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        <input className="border p-2 rounded w-full mb-3" placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />

        <textarea className="border p-2 rounded w-full mb-4" rows={4} placeholder="Detalhamento" value={detalhamento} onChange={(e) => setDetalhamento(e.target.value)} />

        <select className="border p-2 rounded w-full mb-6" value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
          <option value="">Selecione o técnico</option>
          {tecnicos.map((t) => (
            <option key={t._id} value={t._id}>
              {t.nome}
            </option>
          ))}
        </select>

        <button
          onClick={salvarOS}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg w-full font-bold"
        >
          {loading ? "Salvando..." : "Salvar OS"}
        </button>
      </div>
    </div>
  );
}