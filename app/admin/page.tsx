"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Printer } from "lucide-react";
import { API_URL, apiFetch } from "@/app/lib/api";
import { formatDate, isOpenStatus, normalizeStatus, STATUS } from "@/app/lib/os";

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
  data_validacao_admin?: string | null;
  data_inicio_deslocamento?: string | null;
  data_fim_deslocamento?: string | null;
  deslocamento_segundos?: number | null;
  tipo_manutencao?: string;
  solicitante_nome?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  prioridade?: string;
  antes?: HistoricoBloco;
  depois?: HistoricoBloco;
  assinatura_tecnico?: string;
  assinatura_cliente?: string;
  cliente_nome?: string;
  cliente_funcao?: string;
  materiais_solicitados?: MaterialSolicitado[];
};

type HistoricoBloco = {
  relatorio?: string;
  observacao?: string;
  fotos?: string[];
};

type MaterialSolicitado = {
  nome?: string;
  fabricante?: string;
  modelo?: string;
  quantidade?: number;
  unidade?: string;
  observacao?: string;
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

type NotificationItem = {
  _id: string;
  type?: "CLIENT_REQUEST" | "STATUS_CHANGED" | "SYSTEM" | string;
  title: string;
  message: string;
  os_id?: string | { _id?: string } | null;
};

const STATUS_SOLICITACOES_CLIENTE = "solicitacoes_cliente";
const STATUS_AGUARDANDO_TECNICO = "aguardando_tecnico";
const STATUS_EM_DESLOCAMENTO = "em_deslocamento";
const STATUS_EM_ANDAMENTO = "em_andamento";
const STATUS_PAUSADA = "pausada";
const STATUS_AGUARDANDO_VALIDACAO = "aguardando_validacao";
const STATUS_FINALIZADAS = "finalizadas";
const ADMIN_FILTER_STORAGE_KEY = "admin-dashboard-filters";

function getOsSequence(osNumero?: string) {
  const match = String(osNumero || "").match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
}

function sortByOsAscending(items: OSItem[]) {
  return [...items].sort((a, b) => {
    const diff = getOsSequence(a.osNumero) - getOsSequence(b.osNumero);
    if (diff !== 0) return diff;
    return String(a.osNumero || "").localeCompare(String(b.osNumero || ""));
  });
}

function sortByOsDescending(items: OSItem[]) {
  return [...items].sort((a, b) => {
    const diff = getOsSequence(b.osNumero) - getOsSequence(a.osNumero);
    if (diff !== 0) return diff;
    return String(b.osNumero || "").localeCompare(String(a.osNumero || ""));
  });
}

export default function AdminDashboard() {
  const router = useRouter();
  const isProductionDeploy = process.env.NODE_ENV === "production";

  const [osList, setOsList] = useState<OSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificacoes, setNotificacoes] = useState<NotificationItem[]>([]);
  const [statusFiltro, setStatusFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(ADMIN_FILTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          statusFiltro?: string;
          busca?: string;
          dataInicio?: string;
          dataFim?: string;
        };
        setStatusFiltro(parsed.statusFiltro || "");
        setBusca(parsed.busca || "");
        setDataInicio(parsed.dataInicio || "");
        setDataFim(parsed.dataFim || "");
      }
    } catch {
      // noop
    }

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

  useEffect(() => {
    sessionStorage.setItem(
      ADMIN_FILTER_STORAGE_KEY,
      JSON.stringify({ statusFiltro, busca, dataInicio, dataFim })
    );
  }, [statusFiltro, busca, dataInicio, dataFim]);

  async function carregarOS() {
    try {
      const lista = await apiFetch("/projects/admin/all");
      setOsList(Array.isArray(lista) ? lista : []);
      try {
        const notificacoesData = await apiFetch("/admin/notifications?unread=true");
        setNotificacoes(Array.isArray(notificacoesData) ? (notificacoesData as NotificationItem[]) : []);
      } catch {
        setNotificacoes([]);
      }
      try {
        const month = new Date().toISOString().slice(0, 7);
        const metricas = (await apiFetch(`/dashboard/metrics?month=${month}`)) as MetricsResponse;
        if (metricas && typeof metricas === "object") {
          // metricas carregadas para manter compatibilidade com a rota atual
        }
      } catch {
        // noop
      }

    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao carregar OS");
    } finally {
      setLoading(false);
    }
  }

  async function baixarOSRapido(os: OSItem) {
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
        let message = "Erro ao gerar PDF";
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
    const byBucket = osList.reduce(
      (acc, os) => {
        const bucket = dashboardStatusBucket(os);
        acc[bucket] = (acc[bucket] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      solicitacoesCliente: byBucket[STATUS_SOLICITACOES_CLIENTE] || 0,
      aguardando: byBucket[STATUS_AGUARDANDO_TECNICO] || 0,
      deslocamento: byBucket[STATUS_EM_DESLOCAMENTO] || 0,
      andamento: byBucket[STATUS_EM_ANDAMENTO] || 0,
      pausadas: byBucket[STATUS_PAUSADA] || 0,
      aguardandoValidacao: byBucket[STATUS_AGUARDANDO_VALIDACAO] || 0,
      finalizadas: byBucket[STATUS_FINALIZADAS] || 0,
    };
  }, [osList]);

  const listaFiltrada = useMemo(() => {
    return osList.filter((os) => {
      const statusAtual = dashboardStatusBucket(os);
      const finalizada = statusAtual === STATUS_FINALIZADAS;

      if (statusFiltro) {
        if (statusAtual !== statusFiltro) {
          return false;
        }
      }

      if (!busca.trim() && !statusFiltro && finalizada) return false;

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
  }, [osList, statusFiltro, busca, dataInicio, dataFim]);

  const grupos = useMemo(() => {
    const ativas: OSItem[] = [];
    const finalizadas: OSItem[] = [];

    for (const os of listaFiltrada) {
      const statusAtual = dashboardStatusBucket(os);
      if (statusAtual === STATUS_FINALIZADAS) finalizadas.push(os);
      else ativas.push(os);
    }

    return {
      ativas: sortByOsAscending(ativas),
      finalizadas: sortByOsDescending(finalizadas),
    };
  }, [listaFiltrada]);

  const mostrarFinalizadas =
    Boolean(busca.trim()) ||
    statusFiltro === STATUS_FINALIZADAS;
  const hasFiltroAtivo = Boolean(statusFiltro || busca.trim() || dataInicio || dataFim);

  function limparFiltros() {
    setStatusFiltro("");
    setBusca("");
    setDataInicio("");
    setDataFim("");
    sessionStorage.removeItem(ADMIN_FILTER_STORAGE_KEY);
  }

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6">Carregando...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <Card titulo="Solicitações do cliente" valor={contadores.solicitacoesCliente ?? 0} cor="bg-indigo-600" onClick={() => setStatusFiltro(STATUS_SOLICITACOES_CLIENTE)} active={statusFiltro === STATUS_SOLICITACOES_CLIENTE} />
        <Card titulo="Aguardando técnico" valor={contadores.aguardando ?? 0} cor="bg-amber-500" onClick={() => setStatusFiltro(STATUS_AGUARDANDO_TECNICO)} active={statusFiltro === STATUS_AGUARDANDO_TECNICO} />
        <Card titulo="Em deslocamento" valor={contadores.deslocamento ?? 0} cor="bg-cyan-600" onClick={() => setStatusFiltro(STATUS_EM_DESLOCAMENTO)} active={statusFiltro === STATUS_EM_DESLOCAMENTO} />
        <Card titulo="Em andamento" valor={contadores.andamento ?? 0} cor="bg-sky-600" onClick={() => setStatusFiltro(STATUS_EM_ANDAMENTO)} active={statusFiltro === STATUS_EM_ANDAMENTO} />
        <Card titulo="Pausada" valor={contadores.pausadas ?? 0} cor="bg-purple-600" onClick={() => setStatusFiltro(STATUS_PAUSADA)} active={statusFiltro === STATUS_PAUSADA} />
        <Card titulo="Aguardando validação" valor={contadores.aguardandoValidacao ?? 0} cor="bg-orange-600" onClick={() => setStatusFiltro(STATUS_AGUARDANDO_VALIDACAO)} active={statusFiltro === STATUS_AGUARDANDO_VALIDACAO} />
        <Card titulo="Concluída" valor={contadores.finalizadas ?? 0} cor="bg-green-700" onClick={() => setStatusFiltro(STATUS_FINALIZADAS)} active={statusFiltro === STATUS_FINALIZADAS} />
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value={STATUS_SOLICITACOES_CLIENTE}>Solicitações do cliente</option>
          <option value={STATUS_AGUARDANDO_TECNICO}>Aguardando técnico</option>
          <option value={STATUS_EM_DESLOCAMENTO}>Em deslocamento</option>
          <option value={STATUS_EM_ANDAMENTO}>Em andamento</option>
          <option value={STATUS_PAUSADA}>Pausada</option>
          <option value={STATUS_AGUARDANDO_VALIDACAO}>Aguardando validação</option>
          <option value={STATUS_FINALIZADAS}>Concluída</option>
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

      {hasFiltroAtivo && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={limparFiltros}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Limpar filtros
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notificações</p>
            <h2 className="text-lg font-extrabold text-slate-900">Página inicial</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {notificacoes.length}
          </span>
        </div>

        {notificacoes.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Sem notificações pendentes.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {notificacoes.slice(0, 6).map((notificacao) => {
              const osId =
                typeof notificacao.os_id === "string" ? notificacao.os_id : notificacao.os_id?._id;
              const href = osId
                ? notificacao.type === "CLIENT_REQUEST"
                  ? `/admin/servicos/${osId}/editar?returnTo=${encodeURIComponent("/admin")}`
                  : `/admin/servicos/${osId}?returnTo=${encodeURIComponent("/admin")}`
                : "/admin";

              return (
                <button
                  key={notificacao._id}
                  type="button"
                  onClick={() => router.push(href)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {notificacao.type === "CLIENT_REQUEST" ? "Cliente" : notificacao.type === "STATUS_CHANGED" ? "Técnico" : "Sistema"}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{notificacao.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{notificacao.message}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {grupos.ativas.map((os) => renderOsCard(os, isProductionDeploy, router, baixarOSRapido))}

        {mostrarFinalizadas && grupos.finalizadas.length > 0 && (
          <>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
              Finalizadas
            </div>
            {grupos.finalizadas.map((os) => renderOsCard(os, isProductionDeploy, router, baixarOSRapido))}
          </>
        )}

        {grupos.ativas.length === 0 &&
          (!mostrarFinalizadas || grupos.finalizadas.length === 0) && (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
            Nenhuma OS encontrada para os filtros aplicados.
          </p>
          )}
      </div>
    </div>
  );
}

function Card({
  titulo,
  valor,
  cor,
  onClick,
  active,
}: {
  titulo: string;
  valor: number;
  cor: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cor} rounded-2xl p-4 text-left text-white shadow transition hover:-translate-y-0.5 hover:shadow-md ${active ? "ring-4 ring-slate-200" : ""}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-white/85">{titulo}</p>
      <p className="mt-1 text-3xl font-extrabold">{valor}</p>
    </button>
  );
}

function renderOsCard(
  os: OSItem,
  isProductionDeploy: boolean,
  router: { push: (href: string) => void },
  onQuickDownload: (os: OSItem) => void
) {
  const tecnicoNome =
    (typeof os.tecnico === "object" ? os.tecnico?.nome : os.tecnico) ||
    os.tecnicoNome ||
    "Não definido";
  const osId = os._id || os.id;
  const detalheHref = `/admin/servicos/${osId}?returnTo=${encodeURIComponent("/admin")}`;

  if (!osId) return null;

  return (
    <div
      key={osId}
      role="button"
      tabIndex={0}
      className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      onClick={() => router.push(detalheHref)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(detalheHref);
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
            isProductionDeploy ? legacyStatusColor(os.status, os) : legacyStatusColor(os.status, os)
          }`}
        >
          {isProductionDeploy ? legacyStatusLabel(os.status, os) : legacyStatusLabel(os.status, os)}
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

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <b>Descrição inicial:</b> {os.detalhamento || "-"}
      </div>

      {!isProductionDeploy && isOpenStatus(os.status) && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-blue-700">OS em aberto</p>
      )}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          title="Baixar PDF"
          aria-label="Baixar PDF"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={(e) => {
            e.stopPropagation();
            onQuickDownload(os);
          }}
        >
          <Printer size={16} />
          <span>Baixar PDF</span>
        </button>
        <button
          type="button"
          title="Abrir detalhes"
          aria-label="Abrir detalhes"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={(e) => {
            e.stopPropagation();
            router.push(detalheHref);
          }}
        >
          <ArrowRight size={16} />
          <span>Detalhes</span>
        </button>
      </div>
    </div>
  );
}

function dashboardStatusBucket(os: OSItem) {
  const status = normalizeStatus(os.status);
  const emDeslocamento = Boolean(os.data_inicio_deslocamento) && !os.data_fim_deslocamento;
  const tecnicoNome =
    (typeof os.tecnico === "object" ? os.tecnico?.nome : os.tecnico) ||
    os.tecnicoNome ||
    "";

  if (status === STATUS.ABERTA && !String(tecnicoNome).trim()) return STATUS_SOLICITACOES_CLIENTE;
  if (status === STATUS.PAUSADA) return STATUS_PAUSADA;
  if (emDeslocamento) return STATUS_EM_DESLOCAMENTO;
  if (status === STATUS.EM_ATENDIMENTO) return STATUS_EM_ANDAMENTO;
  if (status === STATUS.FINALIZADA_PELO_TECNICO) return STATUS_AGUARDANDO_VALIDACAO;
  if (status === STATUS.VALIDADA_PELO_ADMIN) return STATUS_FINALIZADAS;
  return STATUS_AGUARDANDO_TECNICO;
}

function legacyStatusLabel(rawStatus?: string, os?: OSItem) {
  const bucket = os ? dashboardStatusBucket(os) : STATUS_SOLICITACOES_CLIENTE;
  if (bucket === STATUS_SOLICITACOES_CLIENTE) return "Solicitação do cliente";
  if (bucket === STATUS_AGUARDANDO_TECNICO) return "Aguardando técnico";
  if (bucket === STATUS_EM_DESLOCAMENTO) return "Em deslocamento";
  if (bucket === STATUS_EM_ANDAMENTO) return "Em andamento";
  if (bucket === STATUS_PAUSADA) return "Pausada";
  if (bucket === STATUS_AGUARDANDO_VALIDACAO) return "Aguardando validação";
  if (bucket === STATUS_FINALIZADAS) return "Concluída";
  return rawStatus || "status";
}

function legacyStatusColor(rawStatus?: string, os?: OSItem) {
  const bucket = os ? dashboardStatusBucket(os) : STATUS_SOLICITACOES_CLIENTE;
  if (bucket === STATUS_SOLICITACOES_CLIENTE) return "bg-indigo-100 text-indigo-800";
  if (bucket === STATUS_AGUARDANDO_TECNICO) return "bg-amber-100 text-amber-800";
  if (bucket === STATUS_EM_DESLOCAMENTO) return "bg-cyan-100 text-cyan-800";
  if (bucket === STATUS_EM_ANDAMENTO) return "bg-sky-100 text-sky-800";
  if (bucket === STATUS_PAUSADA) return "bg-purple-100 text-purple-800";
  if (bucket === STATUS_AGUARDANDO_VALIDACAO) return "bg-orange-100 text-orange-800";
  if (bucket === STATUS_FINALIZADAS) return "bg-green-100 text-green-800";
  return "bg-gray-200 text-gray-800";
}
