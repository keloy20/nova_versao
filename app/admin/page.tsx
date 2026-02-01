"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  const [osList, setOsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFiltro, setStatusFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  /* =====================================================
     🔥 WHATSAPP AUTOMÁTICO (PC + CELULAR)
     NÃO REMOVE NADA DO DASHBOARD
  ===================================================== */


  /* =====================================================
     CARREGAR OS
  ===================================================== */
  useEffect(() => {
    carregarOS();
  }, []);

 async function carregarOS() {
  try {
    const data = await apiFetch("/projects/admin/all");
    setOsList(data);

    // 🔥 ABRE WHATSAPP SÓ DEPOIS QUE CARREGAR
    const pendente = localStorage.getItem("whatsapp-pendente");
    if (pendente) {
      const { telefone, mensagem } = JSON.parse(pendente);
      localStorage.removeItem("whatsapp-pendente");

      if (telefone) {
        const numero = telefone.replace(/\D/g, "");
        window.location.href =
          `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
      }
    }

  } catch {
    alert("Erro ao carregar OS");
  } finally {
    setLoading(false);
  }
}


  /* =====================================================
     CONTADORES
  ===================================================== */
  const contadores = useMemo(() => {
    return {
      aguardando: osList.filter(o => o.status === "aguardando_tecnico").length,
      andamento: osList.filter(o => o.status === "em_andamento").length,
      concluido: osList.filter(o => o.status === "concluido").length,
    };
  }, [osList]);

  /* =====================================================
     FILTROS
  ===================================================== */
  const listaFiltrada = useMemo(() => {
    return osList.filter(os => {
      if (statusFiltro && os.status !== statusFiltro) return false;

      const texto = `
        ${os.cliente}
        ${os.subcliente || os.Subcliente || os.subgrupo || ""}
        ${os.unidade || ""}
        ${os.marca || ""}
        ${os.osNumero}
        ${os.tecnico?.nome || ""}
      `.toLowerCase();

      if (busca && !texto.includes(busca.toLowerCase())) return false;

      if (dataInicio && new Date(os.createdAt) < new Date(dataInicio)) return false;
      if (dataFim && new Date(os.createdAt) > new Date(dataFim)) return false;

      return true;
    });
  }, [osList, statusFiltro, busca, dataInicio, dataFim]);

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen text-black">

      {/* ================= CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card titulo="Aguardando Técnico" valor={contadores.aguardando} cor="bg-yellow-500" />
        <Card titulo="Em Andamento" valor={contadores.andamento} cor="bg-blue-600" />
        <Card titulo="Concluídas" valor={contadores.concluido} cor="bg-green-600" />
      </div>

      {/* ================= FILTROS ================= */}
      <div className="bg-white p-4 rounded-xl shadow mb-6 grid gap-4 md:grid-cols-4">
        <select
          className="border p-2 rounded"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="aguardando_tecnico">Aguardando Técnico</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluido">Concluído</option>
        </select>

        <input
          className="border p-2 rounded"
          placeholder="Buscar cliente, subcliente, técnico ou OS"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <input
          type="date"
          className="border p-2 rounded"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
        />

        <input
          type="date"
          className="border p-2 rounded"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
        />
      </div>

      {/* ================= LISTA ================= */}
      <div className="space-y-3">
        {listaFiltrada.map((os) => (
          <div
            key={os._id}
            className="bg-white p-4 rounded-lg shadow flex justify-between items-center cursor-pointer hover:bg-gray-50"
            onClick={() => router.push(`/admin/servicos/${os._id}`)}
          >
            <div className="space-y-1">
              <p className="font-bold">{os.osNumero}</p>

              <p className="text-sm text-gray-700">
                Cliente: {os.cliente}
              </p>

              {/* REGRA DASA */}
              {os.cliente === "DASA" ? (
                <>
                  {os.unidade && (
                    <p className="text-xs text-gray-500">
                      Unidade: {os.unidade}
                    </p>
                  )}
                  {os.marca && (
                    <p className="text-xs text-gray-500">
                      Marca: {os.marca}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {(os.subcliente || os.Subcliente || os.subgrupo) && (
                    <p className="text-xs text-gray-500">
                      Subcliente: {os.subcliente || os.Subcliente || os.subgrupo}
                    </p>
                  )}
                </>
              )}

              <p className="text-xs text-gray-500">
                Técnico:{" "}
                {os.tecnico?.nome ||
                  os.tecnicoNome ||
                  os.tecnico_name ||
                  (typeof os.tecnico === "string" ? os.tecnico : "—")}
              </p>

              <p className="text-xs text-gray-400">
                {new Date(os.createdAt).toLocaleDateString()}
              </p>
            </div>

            <span className={`px-3 py-1 rounded-full text-sm ${statusColor(os.status)}`}>
              {os.status}
            </span>
          </div>
        ))}

        {listaFiltrada.length === 0 && (
          <p className="text-center text-gray-600">
            Nenhuma OS encontrada
          </p>
        )}
      </div>
    </div>
  );
}

/* ================= COMPONENTES ================= */

function Card({ titulo, valor, cor }: any) {
  return (
    <div className={`${cor} text-white p-4 rounded-xl shadow`}>
      <p className="text-sm">{titulo}</p>
      <p className="text-3xl font-bold">{valor}</p>
    </div>
  );
}

function statusColor(status: string) {
  if (status === "aguardando_tecnico") return "bg-yellow-100 text-yellow-800";
  if (status === "em_andamento") return "bg-blue-100 text-blue-800";
  if (status === "concluido") return "bg-green-100 text-green-800";
  return "bg-gray-200 text-gray-800";
}
