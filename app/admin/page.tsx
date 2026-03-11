"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, apiFetch } from "@/app/lib/api";
import { formatDate, isOpenStatus, normalizeStatus, statusBadgeClass, statusLabel, STATUS, STATUS_OPTIONS } from "@/app/lib/os";

type OSItem = {
  _id: string;
  id?: string;
  osNumero?: string;
  cliente?: string;
  subcliente?: string;
  Subcliente?: string;
  subgrupo?: string;
  unidade?: string;
  marca?: string;
  detalhamento?: string;
  tecnico?: { _id?: string; nome?: string } | string;
  tecnicoNome?: string;
  status?: string;
  createdAt?: string;
  data_abertura?: string;
  tipo_manutencao?: string;
  solicitante_nome?: string;
};

type MetricsResponse = {
  total_abertas?: number;
  total_em_atendimento?: number;
  total_pausadas?: number;
  total_finalizadas_tecnico?: number;
  total_validadas_admin?: number;
  total_canceladas?: number;
  total_fechadas?: number;
  total_pendentes?: number;
};

const STATUS_CONCLUIDAS = "CONCLUIDAS";

export default function AdminDashboard() {
  const router = useRouter();
  const useLegacyDashboard = process.env.NEXT_PUBLIC_USE_LEGACY_DASHBOARD === "true";

  const [osList, setOsList] = useState<OSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

  const [statusFiltro, setStatusFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      router.replace("/login");
      return;
    }

    carregarOS();

    const onFocus = () => carregarOS();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") carregarOS();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  async function carregarOS() {
    try {
      const lista = await apiFetch("/projects/admin/all");
      setOsList(Array.isArray(lista) ? lista : []);
      try {
        const month = new Date().toISOString().slice(0, 7);
        const metricas = (await apiFetch(`/dashboard/metrics?month=${month}`)) as MetricsResponse;
        if (metricas && typeof metricas === "object") {
          setMetrics({
            total_abertas: Number(metricas.total_abertas || 0),
            total_em_atendimento: Number(metricas.total_em_atendimento || 0),
            total_pausadas: Number(metricas.total_pausadas || 0),
            total_finalizadas_tecnico: Number(metricas.total_finalizadas_tecnico || 0),
            total_fechadas: Number(metricas.total_fechadas || 0),
            total_pendentes: Number(metricas.total_pendentes || 0),
          });
        } else {
          setMetrics(null);
        }
      } catch {
        setMetrics(null);
      }

      const pendente = localStorage.getItem("whatsapp-pendente");
      if (pendente) {
        const { telefone, mensagem } = JSON.parse(pendente);
        localStorage.removeItem("whatsapp-pendente");

        if (telefone) {
          const numero = telefone.replace(/\D/g, "");
          window.location.href = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
        }
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao carregar OS");
    } finally {
      setLoading(false);
    }
  }

  async function baixarOS(os: OSItem) {
    try {
      const osId = os._id || os.id;
      if (!osId) throw new Error("OS sem identificador");

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/os/${osId}/report?variant=client&force=true`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });

      if (!res.ok) {
        let message = "Erro ao baixar OS";
        const raw = await res.text();
        if (raw) {
          try {
            const data = JSON.parse(raw) as { error?: string; message?: string };
            message = data.error || data.message || message;
          } catch {
            message = raw;
          }
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `RELATORIO-OS-${os.osNumero || osId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao baixar OS");
    }
  }

  const contadores = useMemo(() => {
    if (useLegacyDashboard) {
      return {
        aguardando: osList.filter((o) => legacyStatusBucket(o.status) === "aguardando_tecnico").length,
        andamento: osList.filter((o) => legacyStatusBucket(o.status) === "em_andamento").length,
        concluido: osList.filter((o) => legacyStatusBucket(o.status) === "concluido").length,
      };
    }

    return {
      abertas: metrics?.total_abertas ?? osList.filter((o) => normalizeStatus(o.status) === STATUS.ABERTA).length,
      atendimento: metrics?.total_em_atendimento ?? osList.filter((o) => normalizeStatus(o.status) === STATUS.EM_ATENDIMENTO).length,
      pausadas: metrics?.total_pausadas ?? osList.filter((o) => normalizeStatus(o.status) === STATUS.PAUSADA).length,
      pendentes:
        metrics
          ? (metrics.total_abertas ?? 0) + (metrics.total_em_atendimento ?? 0) + (metrics.total_pausadas ?? 0)
          : osList.filter((o) => {
              const s = normalizeStatus(o.status);
              return s === STATUS.ABERTA || s === STATUS.EM_ATENDIMENTO || s === STATUS.PAUSADA || s === STATUS.DEVOLVIDA_PARA_AJUSTE;
            }).length,
      aguardandoValidacao:
        metrics?.total_finalizadas_tecnico ?? osList.filter((o) => normalizeStatus(o.status) === STATUS.FINALIZADA_PELO_TECNICO).length,
      finalizadas:
        metrics?.total_validadas_admin ?? osList.filter((o) => normalizeStatus(o.status) === STATUS.VALIDADA_PELO_ADMIN).length,
    };
  }, [useLegacyDashboard, metrics, osList]);

  const listaFiltrada = useMemo(() => {
    return osList.filter((os) => {
      const statusAtual = useLegacyDashboard ? legacyStatusBucket(os.status) : normalizeStatus(os.status);
      const finalizadaOuValidada =
        statusAtual === STATUS.FINALIZADA_PELO_TECNICO ||
        statusAtual === STATUS.VALIDADA_PELO_ADMIN ||
        statusAtual === "concluido";

      if (statusFiltro) {
        if (statusFiltro === STATUS_CONCLUIDAS) {
          if (!finalizadaOuValidada) return false;
        } else if (statusAtual !== statusFiltro) {
          return false;
        }
      }

      const filtroEhConcluida =
        statusFiltro === STATUS_CONCLUIDAS ||
        statusFiltro === STATUS.FINALIZADA_PELO_TECNICO ||
        statusFiltro === STATUS.VALIDADA_PELO_ADMIN ||
        statusFiltro === "concluido";
      if (!busca.trim() && !filtroEhConcluida && finalizadaOuValidada) return false;

      const texto = `
        ${os.cliente || ""}
        ${os.subcliente || os.Subcliente || os.subgrupo || ""}
        ${os.unidade || ""}
        ${os.marca || ""}
        ${os.osNumero || ""}
        ${typeof os.tecnico === "object" ? os.tecnico?.nome || "" : os.tecnico || ""}
        ${os.solicitante_nome || ""}
        ${os.tipo_manutencao || ""}
      `.toLowerCase();

      if (busca && !texto.includes(busca.toLowerCase())) return false;

      const dataBase = new Date(os.data_abertura || os.createdAt || "");
      if (dataInicio && dataBase < new Date(`${dataInicio}T00:00:00`)) return false;
      if (dataFim && dataBase > new Date(`${dataFim}T23:59:59`)) return false;

      return true;
    }).sort((a, b) => {
      const da = new Date(a.data_abertura || a.createdAt || 0).getTime();
      const db = new Date(b.data_abertura || b.createdAt || 0).getTime();
      return da - db;
    });
  }, [useLegacyDashboard, osList, statusFiltro, busca, dataInicio, dataFim]);

  const grupos = useMemo(() => {
    const ativas: OSItem[] = [];
    const concluidas: OSItem[] = [];

    for (const os of listaFiltrada) {
      const statusAtual = useLegacyDashboard ? legacyStatusBucket(os.status) : normalizeStatus(os.status);
      const finalizadaOuValidada =
        statusAtual === STATUS.FINALIZADA_PELO_TECNICO ||
        statusAtual === STATUS.VALIDADA_PELO_ADMIN ||
        statusAtual === "concluido";

      if (finalizadaOuValidada) concluidas.push(os);
      else ativas.push(os);
    }

    return { ativas, concluidas };
  }, [useLegacyDashboard, listaFiltrada]);

  const mostrarConcluidas =
    Boolean(busca.trim()) ||
    statusFiltro === STATUS_CONCLUIDAS ||
    statusFiltro === STATUS.FINALIZADA_PELO_TECNICO ||
    statusFiltro === STATUS.VALIDADA_PELO_ADMIN ||
    statusFiltro === "concluido";

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6">Carregando...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {useLegacyDashboard ? (
          <>
            <Card titulo="Aguardando Técnico" valor={contadores.aguardando ?? 0} cor="bg-yellow-500" />
            <Card titulo="Em Andamento" valor={contadores.andamento ?? 0} cor="bg-blue-600" />
            <Card titulo="Concluídas" valor={contadores.concluido ?? 0} cor="bg-green-600" />
          </>
        ) : (
          <>
            <Card titulo="Abertas" valor={contadores.abertas ?? 0} cor="bg-amber-500" />
            <Card titulo="Em andamento" valor={contadores.atendimento ?? 0} cor="bg-sky-600" />
            <Card titulo="Pausadas" valor={contadores.pausadas ?? 0} cor="bg-purple-600" />
            <Card titulo="Pendentes" valor={contadores.pendentes ?? 0} cor="bg-indigo-600" />
            <Card titulo="Aguardando validacao" valor={contadores.aguardandoValidacao ?? 0} cor="bg-emerald-600" />
            <Card titulo="Finalizadas" valor={contadores.finalizadas ?? 0} cor="bg-teal-700" />
          </>
        )}
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
        >
          <option value="">Todos os status</option>
          {useLegacyDashboard ? (
            <>
              <option value="aguardando_tecnico">Aguardando Técnico</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluído</option>
            </>
          ) : (
            <>
              <option value={STATUS_CONCLUIDAS}>Encerradas (todas)</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </>
          )}
        </select>

        <input
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          placeholder="Cliente, técnico, OS, solicitante..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <input
          type="date"
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
        />

        <input
          type="date"
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {grupos.ativas.map((os) => renderOsCard(os, useLegacyDashboard, router, baixarOS))}

        {mostrarConcluidas && grupos.concluidas.length > 0 && (
          <>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
              Encerradas
            </div>
            {grupos.concluidas.map((os) => renderOsCard(os, useLegacyDashboard, router, baixarOS))}
          </>
        )}

        {grupos.ativas.length === 0 && (!mostrarConcluidas || grupos.concluidas.length === 0) && (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
            Nenhuma OS encontrada para os filtros aplicados.
          </p>
        )}
      </div>
    </div>
  );
}

function Card({ titulo, valor, cor }: { titulo: string; valor: number; cor: string }) {
  return (
    <div className={`${cor} rounded-2xl p-4 text-white shadow`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/85">{titulo}</p>
      <p className="mt-1 text-3xl font-extrabold">{valor}</p>
    </div>
  );
}

function renderOsCard(
  os: OSItem,
  isProductionDeploy: boolean,
  router: { push: (href: string) => void },
  onDownload: (os: OSItem) => void
) {
  const tecnicoNome =
    (typeof os.tecnico === "object" ? os.tecnico?.nome : os.tecnico) ||
    os.tecnicoNome ||
    "Não definido";
  const osId = os._id || os.id;

  if (!osId) return null;

  return (
    <div
      key={osId}
      role="button"
      tabIndex={0}
      className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      onClick={() => router.push(`/admin/servicos/${osId}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/admin/servicos/${osId}`);
        }
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold text-slate-900">{os.osNumero || "Sem número"}</p>
          <p className="text-sm font-semibold text-slate-700">{os.cliente || "Sem cliente"}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            isProductionDeploy ? legacyStatusColor(os.status) : statusBadgeClass(os.status)
          }`}
        >
          {isProductionDeploy ? legacyStatusLabel(os.status) : statusLabel(os.status)}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
        <p>
          <b>Solicitante:</b> {os.solicitante_nome || "-"}
        </p>
        <p>
          <b>Tipo:</b> {os.tipo_manutencao || "-"}
        </p>
        <p>
          <b>Técnico:</b> {tecnicoNome}
        </p>
        <p>
          <b>Abertura:</b> {formatDate(os.data_abertura || os.createdAt)}
        </p>
      </div>

      {!isProductionDeploy && isOpenStatus(os.status) && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-blue-700">OS em aberto</p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(os);
          }}
        >
          Baixar OS
        </button>
      </div>
    </div>
  );
}

function legacyStatusBucket(rawStatus?: string) {
  const status = normalizeStatus(rawStatus);
  if (status === STATUS.ABERTA) return "aguardando_tecnico";
  if (status === STATUS.EM_ATENDIMENTO || status === STATUS.PAUSADA) return "em_andamento";
  if (status === STATUS.FINALIZADA_PELO_TECNICO || status === STATUS.VALIDADA_PELO_ADMIN) return "concluido";
  return rawStatus || "";
}

function legacyStatusLabel(rawStatus?: string) {
  const bucket = legacyStatusBucket(rawStatus);
  if (bucket === "aguardando_tecnico") return "aguardando_tecnico";
  if (bucket === "em_andamento") return "em_andamento";
  if (bucket === "concluido") return "concluido";
  return bucket || "status";
}

function legacyStatusColor(rawStatus?: string) {
  const bucket = legacyStatusBucket(rawStatus);
  if (bucket === "aguardando_tecnico") return "bg-yellow-100 text-yellow-800";
  if (bucket === "em_andamento") return "bg-blue-100 text-blue-800";
  if (bucket === "concluido") return "bg-green-100 text-green-800";
  return "bg-gray-200 text-gray-800";
}
