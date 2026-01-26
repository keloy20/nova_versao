"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { CheckCircle, Clock, AlertCircle, Calendar } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();

  const [servicos, setServicos] = useState<any[]>([]);
  const [servicosFiltrados, setServicosFiltrados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const [osHoje, setOsHoje] = useState(0);

  // CALENDÁRIO
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [periodoAtivo, setPeriodoAtivo] = useState("");

  useEffect(() => {
    carregarServicos();
  }, []);

  async function carregarServicos() {
    try {
      const data = await apiFetch("/projects/admin/all");

      console.log("ADMIN DEBUG - TOTAL DE OS:", data.length);

      // ORDENA: MAIOR -> MENOR
      const ordenado = [...data].sort((a, b) => {
        const osA = a.osNumero || "";
        const osB = b.osNumero || "";
        return osB.localeCompare(osA);
      });

      setServicos(ordenado);
      setServicosFiltrados(ordenado);
      calcularOsHoje(ordenado);

    } catch (err: any) {
      alert("Erro ao carregar serviços: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function calcularOsHoje(lista: any[]) {
    const hoje = new Date().toISOString().split("T")[0];

    const totalHoje = lista.filter((s) => {
      if (!s.createdAt) return false;
      const data = new Date(s.createdAt).toISOString().split("T")[0];
      return data === hoje;
    }).length;

    setOsHoje(totalHoje);
  }

  async function cancelarServico(id: string) {
    const ok = confirm("Tem certeza que deseja cancelar este serviço?");
    if (!ok) return;

    try {
      await apiFetch(`/projects/admin/cancelar/${id}`, {
        method: "PUT",
      });

      alert("Serviço cancelado com sucesso");
      carregarServicos();
    } catch (err: any) {
      alert("Erro ao cancelar: " + err.message);
    }
  }

  function filtrarPorData(inicio: string, fim: string) {
    const filtrados = servicos.filter((s) => {
      if (!s.createdAt) return false;
      const dataOS = new Date(s.createdAt).toISOString().split("T")[0];
      return dataOS >= inicio && dataOS <= fim;
    });

    setServicosFiltrados(filtrados);
    setPeriodoAtivo(
      `Mostrando OS de ${inicio.split("-").reverse().join("/")} até ${fim
        .split("-")
        .reverse()
        .join("/")}`
    );
  }

  function limparFiltroData() {
    setServicosFiltrados(servicos);
    setPeriodoAtivo("");
  }

  const total = servicos.length;
  const concluidos = servicos.filter((s) => s.status === "concluido").length;
  const emAndamento = servicos.filter((s) => s.status === "em_andamento").length;
  const aguardando = servicos.filter(
    (s) => s.status === "aguardando_tecnico"
  ).length;

  const listaFinal = servicosFiltrados.filter((s) => {
    const cliente = (s.cliente || "").toLowerCase();
    const subcliente = (s.Subcliente || s.subgrupo || "").toLowerCase();
    const buscaLower = busca.toLowerCase();

    const matchBusca =
      cliente.includes(buscaLower) ||
      subcliente.includes(buscaLower);

    const matchStatus = filtroStatus ? s.status === filtroStatus : true;

    return matchBusca && matchStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      {/* TOPO */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-3">
        <h1 className="text-3xl font-bold">Painel do Administrador</h1>

        <div className="flex gap-2 flex-wrap">

  <button
    onClick={() => router.push("/admin/servicos/novo")}
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
  >
    + Nova OS
  </button>

  <button
    onClick={() => router.push("/admin/tecnicos")}
    className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg transition"
  >
    Técnicos
  </button>

  <button
    onClick={() => router.push("/admin/clientes")}
    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
  >
    Clientes
  </button>

  <button
    onClick={() => {
      const hoje = new Date().toISOString().split("T")[0];
      setDataInicio(hoje);
      setDataFim(hoje);
      setMostrarCalendario(true);
    }}
    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
  >
    <Calendar size={18} /> Calendário
  </button>

</div>

      </div>

      {/* CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-3">
          <Calendar className="text-blue-600" />
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-xl font-bold">{total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-3">
          <CheckCircle className="text-green-600" />
          <div>
            <p className="text-sm text-gray-500">Concluídos</p>
            <p className="text-xl font-bold">{concluidos}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-3">
          <Clock className="text-yellow-500" />
          <div>
            <p className="text-sm text-gray-500">Em andamento</p>
            <p className="text-xl font-bold">{emAndamento}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-3">
          <AlertCircle className="text-orange-500" />
          <div>
            <p className="text-sm text-gray-500">Aguardando</p>
            <p className="text-xl font-bold">{aguardando}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-3">
          <Calendar className="text-purple-600" />
          <div>
            <p className="text-sm text-gray-500">OS Hoje</p>
            <p className="text-xl font-bold">{osHoje}</p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow mb-4 flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por cliente ou subcliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="border p-2 rounded-lg w-full text-black"
        />

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="border p-2 rounded-lg w-full md:w-60 text-black"
        >
          <option value="">Todos os status</option>
          <option value="aguardando_tecnico">Aguardando</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluido">Concluído</option>
        </select>
      </div>

      {/* LISTA */}
      {listaFinal.length === 0 && (
        <p className="text-gray-600">Nenhuma OS encontrada.</p>
      )}

      <div className="grid gap-4">
        {listaFinal.map((s) => (
          <div
            key={s._id}
            className="bg-white rounded-xl shadow p-4 flex flex-col gap-2"
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">{s.osNumero}</span>

              <span
                className={`text-sm px-3 py-1 rounded-full font-medium
                  ${
                    s.status === "concluido"
                      ? "bg-green-100 text-green-700"
                      : s.status === "em_andamento"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-orange-100 text-orange-700"
                  }
                `}
              >
                {s.status === "concluido" && "Concluído"}
                {s.status === "em_andamento" && "Em andamento"}
                {s.status === "aguardando_tecnico" && "Aguardando"}
              </span>
            </div>

            <div className="text-gray-800">
              <b>Cliente:</b> {s.cliente}
            </div>

            {(s.Subcliente || s.subgrupo) && (
              <div className="text-gray-600 text-sm">
                <b>Subcliente:</b> {s.Subcliente || s.subgrupo}
              </div>
            )}

            <div className="text-gray-600 text-sm">
              <b>Técnico:</b>{" "}
              {typeof s.tecnico === "string"
                ? s.tecnico
                : s.tecnico?.nome || "-"}
            </div>
            

            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                onClick={() => router.push(`/admin/servicos/${s._id}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                Ver
              </button>

              <button
                onClick={() => cancelarServico(s._id)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CALENDÁRIO */}
      {mostrarCalendario && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Filtrar por período</h2>

            <div className="mb-3">
              <label className="block text-sm mb-1">Data início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-1">Data fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMostrarCalendario(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 transition"
              >
                Fechar
              </button>

              <button
                onClick={() => {
                  filtrarPorData(dataInicio, dataFim);
                  setMostrarCalendario(false);
                }}
                className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition"
              >
                Filtrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
