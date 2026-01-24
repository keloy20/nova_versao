"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

export default function NovaOSPage() {
  const router = useRouter();

  const [clientes, setClientes] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);

  const [cliente, setCliente] = useState("");
  const [subcliente, setSubcliente] = useState("");
  const [marca, setMarca] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [detalhamento, setDetalhamento] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");

  const [buscaDasa, setBuscaDasa] = useState("");
  const [listaRelacionada, setListaRelacionada] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarClientes();
    carregarTecnicos();
  }, []);

  async function carregarClientes() {
    try {
      const data = await apiFetch("/clientes");
      setClientes(data);
    } catch {
      alert("Erro ao carregar clientes");
    }
  }

  async function carregarTecnicos() {
    try {
      const data = await apiFetch("/auth/tecnicos");
      setTecnicos(data);
    } catch {
      alert("Erro ao carregar técnicos");
    }
  }

  function selecionarCliente(nome: string) {
    setCliente(nome);
    setSubcliente("");
    setMarca("");
    setEndereco("");
    setTelefone("");
    setBuscaDasa("");

    const relacionados = clientes.filter(
      (c) => c.cliente.toLowerCase() === nome.toLowerCase()
    );

    setListaRelacionada(relacionados);
  }

  function selecionarRelacionado(item: any) {
    setSubcliente(item.subcliente || "");
    setMarca(item.marca || "");
    setEndereco(item.endereco || "");
    setTelefone(item.telefone || "");
  }

  const isDASA = cliente.toLowerCase() === "dasa";

  const listaDasaFiltrada = listaRelacionada.filter((c) =>
    `${c.subcliente || ""} ${c.marca || ""}`
      .toLowerCase()
      .includes(buscaDasa.toLowerCase())
  );

  async function salvarOS() {
    if (!cliente || !tecnicoId) {
      alert("Cliente e técnico são obrigatórios");
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/projects/admin/create", {
        method: "POST",
        body: JSON.stringify({
          cliente,
          subcliente,
          marca,
          endereco,
          telefone,
          detalhamento,
          tecnicoId,
        }),
      });

      alert("OS criada com sucesso!");
      router.push("/admin");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 space-y-4">

        <h1 className="text-2xl font-bold">Nova Ordem de Serviço</h1>

        {/* CLIENTE */}
        <select
          className="border p-2 rounded w-full"
          value={cliente}
          onChange={(e) => selecionarCliente(e.target.value)}
        >
          <option value="">Selecione o cliente</option>
          {[...new Set(clientes.map((c) => c.cliente))].map((nome) => (
            <option key={nome} value={nome}>
              {nome}
            </option>
          ))}
        </select>

        {/* ===== DASA ===== */}
        {isDASA && listaRelacionada.length > 0 && (
          <>
            <input
              className="border p-2 rounded w-full"
              placeholder="Buscar unidade ou marca (ex: João Pessoa, CERPE)"
              value={buscaDasa}
              onChange={(e) => setBuscaDasa(e.target.value)}
            />

            <div className="border rounded max-h-60 overflow-y-auto">
              {listaDasaFiltrada.map((c) => (
                <div
                  key={c._id}
                  onClick={() => selecionarRelacionado(c)}
                  className="p-2 cursor-pointer hover:bg-blue-100 border-b"
                >
                  <b>{c.subcliente}</b>
                  {c.marca && ` — ${c.marca}`}
                </div>
              ))}

              {listaDasaFiltrada.length === 0 && (
                <p className="p-2 text-sm text-gray-500">
                  Nenhum resultado encontrado
                </p>
              )}
            </div>
          </>
        )}

        {/* ===== NÃO DASA ===== */}
        {!isDASA && listaRelacionada.length > 0 && (
          <select
            className="border p-2 rounded w-full"
            value={subcliente}
            onChange={(e) => {
              const item = listaRelacionada.find(
                (i) => i.subcliente === e.target.value
              );
              if (item) selecionarRelacionado(item);
            }}
          >
            <option value="">Selecione o subcliente</option>
            {listaRelacionada.map((c) => (
              <option key={c._id} value={c.subcliente}>
                {c.subcliente}
              </option>
            ))}
          </select>
        )}

        {/* MARCA */}
        {marca && (
          <input
            className="border p-2 rounded w-full bg-gray-100"
            value={`Marca: ${marca}`}
            readOnly
          />
        )}

        {/* ENDEREÇO */}
        <input
          className="border p-2 rounded w-full bg-gray-100"
          placeholder="Endereço"
          value={endereco}
          readOnly
        />

        {/* TELEFONE */}
        <input
          className="border p-2 rounded w-full bg-gray-100"
          placeholder="Telefone"
          value={telefone}
          readOnly
        />

        {/* DETALHAMENTO */}
        <textarea
          className="border p-2 rounded w-full"
          rows={4}
          placeholder="Detalhamento do serviço"
          value={detalhamento}
          onChange={(e) => setDetalhamento(e.target.value)}
        />

        {/* TÉCNICO */}
        <select
          className="border p-2 rounded w-full"
          value={tecnicoId}
          onChange={(e) => setTecnicoId(e.target.value)}
        >
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
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded w-full"
        >
          {loading ? "Salvando..." : "Salvar OS"}
        </button>

      </div>
    </div>
  );
}
