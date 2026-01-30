
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
    carregarTecnicos();
  }, []);

  async function carregarTecnicos() {
    const data = await apiFetch("/auth/tecnicos");
    setTecnicos(data);
  }

  async function carregarClientes(nomeCliente: string) {
    const data = await apiFetch(`/clientes/by-cliente/${nomeCliente}`);
    setClientesDB(data);
  }

  function selecionarClienteDB(c: any) {
    setCliente(c.cliente || "");
    setSubcliente(c.subcliente || "");
    setEndereco(c.endereco || "");
    setTelefone(c.telefone || "");
    setMarca(c.marca || "");
    setUnidade(c.unidade || "");

    setClientesDB([]);
    setMostrarLista(false); // 🔥 FECHA A LISTA
  }

 async function salvarOS() {
  if (!cliente || !tecnicoId) {
    alert("Cliente e técnico são obrigatórios");
    return;
  }

  setLoading(true);

  try {
    const osCriada = await apiFetch("/projects/admin/create", {
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

  const tecnicoSelecionado = tecnicos.find(t => t._id === tecnicoId);

if (!tecnicoSelecionado || !tecnicoSelecionado.telefone) {
  alert("Técnico sem telefone cadastrado");
  return;
}

const telefoneLimpo = tecnicoSelecionado.telefone.replace(/\D/g, "");

    

    // 🔥 MENSAGEM WHATSAPP
const mensagem = `
Uma nova OS foi atribuída ao sistema Sertch.
Favor verificar!

`;


    // 🔥 URL WHATSAPP (APP NO CELULAR)
    const urlWhats = `whatsapp://send?phone=55${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`;

    // 🔥 ABRE O WHATSAPP
    window.location.href = urlWhats;

    // ⏱️ pequeno delay antes de voltar
    setTimeout(() => {
      router.push("/admin");
    }, 500);

  } catch (err) {
    alert("Erro ao salvar OS");
  } finally {
    setLoading(false);
  }
}


  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">

        <h1 className="text-2xl font-bold mb-6">Nova Ordem de Serviço</h1>

        {/* CLIENTE */}
        <input
          className="border p-2 rounded w-full mb-2"
          placeholder="Cliente (ex: DASA ou Brinks)"
          value={cliente}
          onChange={(e) => {
            const valor = e.target.value;
            setCliente(valor);

            setSubcliente("");
            setEndereco("");
            setTelefone("");
            setMarca("");
            setUnidade("");

            if (valor.trim().length >= 2) {
              setMostrarLista(true);
              carregarClientes(valor);
            } else {
              setMostrarLista(false);
              setClientesDB([]);
            }
          }}
        />

        {/* LISTA CLIENTES */}
        {mostrarLista && clientesDB.length > 0 && (
          <div className="border rounded mb-4 bg-white max-h-60 overflow-y-auto">
            {clientesDB.map((c) => (
              <div
                key={c._id}
                onClick={() => selecionarClienteDB(c)}
                className="p-2 cursor-pointer hover:bg-blue-100 border-b"
              >
                <b>{c.cliente}</b>
                {c.subcliente && ` — ${c.subcliente}`}
                {c.unidade && ` — ${c.unidade}`}
              </div>
            ))}
          </div>
        )}

        {/* SUBCLIENTE NORMAL */}
        {!isDASA && (
          <input
            className="border p-2 rounded w-full mb-3"
            placeholder="Subcliente"
            value={subcliente}
            onChange={(e) => setSubcliente(e.target.value)}
          />
        )}

        {/* DASA */}
        {isDASA && (
          <>
            <input
              className="border p-2 rounded w-full mb-3 bg-gray-100"
              placeholder="Unidade"
              value={unidade}
              readOnly
            />
            <input
              className="border p-2 rounded w-full mb-3 bg-gray-100"
              placeholder="Marca"
              value={marca}
              readOnly
            />
          </>
        )}

        {/* ENDEREÇO */}
        <input
          className="border p-2 rounded w-full mb-3"
          placeholder="Endereço"
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
        />

        {/* TELEFONE */}
        <input
          className="border p-2 rounded w-full mb-3"
          placeholder="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        {/* DETALHAMENTO */}
        <textarea
          className="border p-2 rounded w-full mb-4"
          rows={4}
          placeholder="Detalhamento do serviço"
          value={detalhamento}
          onChange={(e) => setDetalhamento(e.target.value)}
        />

        {/* TÉCNICO */}
        <select
          className="border p-2 rounded w-full mb-6"
          value={tecnicoId}
          onChange={(e) => setTecnicoId(e.target.value)}
        >
          <option value="">Selecione o técnico</option>
          {tecnicos.map((t) => (
            <option key={t._id} value={t._id}>{t.nome}</option>
          ))}
        </select>

        <button
          onClick={salvarOS}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg w-full"
        >
          {loading ? "Salvando..." : "Salvar OS"}
        </button>

      </div>
    </div>
  );
}
