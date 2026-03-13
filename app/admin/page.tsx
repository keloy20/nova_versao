"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, Printer, X } from "lucide-react";
import { API_URL, apiFetch, projectOsPath } from "@/app/lib/api";
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

const STATUS_CONCLUIDAS = "CONCLUIDAS";

async function readPdfError(res: Response, fallback: string) {
  let message = fallback;
  const raw = await res.text();
  if (!raw) return message;

  try {
    const data = JSON.parse(raw) as { error?: string; message?: string };
    return data.error || data.message || message;
  } catch {
    if (raw.includes("<!DOCTYPE html") || raw.includes("<html")) {
      return "O backend do PDF respondeu com erro de servidor. Verifique o deploy do backend.";
    }
    return raw;
  }
}

export default function AdminDashboard() {
  const router = useRouter();
  const useLegacyDashboard = process.env.NEXT_PUBLIC_USE_LEGACY_DASHBOARD === "true";

  const [osList, setOsList] = useState<OSItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFiltro, setStatusFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLabel, setPreviewLabel] = useState("");

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
      const res = await fetch(`${API_URL}${projectOsPath(`/${osId}/report?variant=client`)}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(await readPdfError(res, "Erro ao baixar OS"));
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

  async function previewOS(os: OSItem) {
    try {
      const osId = os._id || os.id;
      if (!osId) throw new Error("OS sem identificador");

      setPreviewOpen(true);
      setPreviewLoading(true);
      setPreviewLabel(os.osNumero || osId);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
      }

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}${projectOsPath(`/${osId}/report?variant=client`)}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(await readPdfError(res, "Erro ao carregar preview da OS"));
      }

      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err: unknown) {
      setPreviewOpen(false);
      alert(err instanceof Error ? err.message : "Erro ao carregar preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  const listaBaseDashboard = useMemo(() => {
    const query = normalizeSearch(busca);
    const tecnicoMode =
      Boolean(query) &&
      osList.some((os) => normalizeSearch(getTecnicoNome(os)).includes(query));

    return osList.filter((os) => {
      const texto = buildOsSearchText(os);

      if (query) {
        if (tecnicoMode) {
          if (!normalizeSearch(getTecnicoNome(os)).includes(query)) return false;
        } else if (!texto.includes(query)) {
          return false;
        }
      }

      const dataBase = new Date(os.data_abertura || os.createdAt || "");
      if (dataInicio && dataBase < new Date(`${dataInicio}T00:00:00`)) return false;
      if (dataFim && dataBase > new Date(`${dataFim}T23:59:59`)) return false;

      return true;
    });
  }, [osList, busca, dataInicio, dataFim]);

  const contadores = useMemo(() => {
    if (useLegacyDashboard) {
      return {
        aguardando: listaBaseDashboard.filter((o) => legacyStatusBucket(o.status) === "aguardando_tecnico").length,
        andamento: listaBaseDashboard.filter((o) => legacyStatusBucket(o.status) === "em_andamento").length,
        concluido: listaBaseDashboard.filter((o) => legacyStatusBucket(o.status) === "concluido").length,
      };
    }

    return {
      abertas: listaBaseDashboard.filter((o) => normalizeStatus(o.status) === STATUS.ABERTA).length,
      atendimento: listaBaseDashboard.filter((o) => normalizeStatus(o.status) === STATUS.EM_ATENDIMENTO).length,
      pausadas: listaBaseDashboard.filter((o) => normalizeStatus(o.status) === STATUS.PAUSADA).length,
      pendentes: listaBaseDashboard.filter((o) => {
        const s = normalizeStatus(o.status);
        return s === STATUS.ABERTA || s === STATUS.EM_ATENDIMENTO || s === STATUS.PAUSADA || s === STATUS.DEVOLVIDA_PARA_AJUSTE;
      }).length,
      aguardandoValidacao: listaBaseDashboard.filter((o) => normalizeStatus(o.status) === STATUS.FINALIZADA_PELO_TECNICO).length,
      finalizadas: listaBaseDashboard.filter((o) => normalizeStatus(o.status) === STATUS.VALIDADA_PELO_ADMIN).length,
    };
  }, [useLegacyDashboard, listaBaseDashboard]);

  const listaFiltrada = useMemo(() => {
    return listaBaseDashboard.filter((os) => {
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

      return true;
    }).sort((a, b) => {
      const da = new Date(a.data_abertura || a.createdAt || 0).getTime();
      const db = new Date(b.data_abertura || b.createdAt || 0).getTime();
      return da - db;
    });
  }, [useLegacyDashboard, listaBaseDashboard, statusFiltro]);

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
            <Card titulo="Abertas" valor={contadores.abertas ?? 0} cor="bg-amber-500" onClick={() => setStatusFiltro(STATUS.ABERTA)} />
            <Card titulo="Em andamento" valor={contadores.atendimento ?? 0} cor="bg-sky-600" onClick={() => setStatusFiltro(STATUS.EM_ATENDIMENTO)} />
            <Card titulo="Pausadas" valor={contadores.pausadas ?? 0} cor="bg-purple-600" onClick={() => setStatusFiltro(STATUS.PAUSADA)} />
            <Card titulo="Pendentes" valor={contadores.pendentes ?? 0} cor="bg-indigo-600" onClick={() => setStatusFiltro("")} />
            <Card titulo="Aguardando validacao" valor={contadores.aguardandoValidacao ?? 0} cor="bg-emerald-600" onClick={() => setStatusFiltro(STATUS.FINALIZADA_PELO_TECNICO)} />
            <Card titulo="Finalizadas" valor={contadores.finalizadas ?? 0} cor="bg-teal-700" onClick={() => setStatusFiltro(STATUS.VALIDADA_PELO_ADMIN)} />
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
        {grupos.ativas.map((os) => renderOsCard(os, useLegacyDashboard, router, baixarOS, previewOS))}

        {mostrarConcluidas && grupos.concluidas.length > 0 && (
          <>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
              Encerradas
            </div>
            {grupos.concluidas.map((os) => renderOsCard(os, useLegacyDashboard, router, baixarOS, previewOS))}
          </>
        )}

        {grupos.ativas.length === 0 && (!mostrarConcluidas || grupos.concluidas.length === 0) && (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
            Nenhuma OS encontrada para os filtros aplicados.
          </p>
        )}
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 p-3 sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-extrabold text-slate-900">Preview da OS {previewLabel}</p>
                <p className="text-xs text-slate-500">Visualização rápida sem entrar no detalhe da OS</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl("");
                  setPreviewOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                <X size={14} />
                Fechar
              </button>
            </div>
            <div className="flex-1 p-4">
              {previewLoading && (
                <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600">
                  Carregando preview...
                </div>
              )}
              {!previewLoading && previewUrl && (
                <iframe title={`Preview ${previewLabel}`} src={previewUrl} className="h-full w-full rounded-2xl border border-slate-200" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ titulo, valor, cor, onClick }: { titulo: string; valor: number; cor: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${cor} rounded-2xl p-4 text-left text-white shadow`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/85">{titulo}</p>
      <p className="mt-1 text-3xl font-extrabold">{valor}</p>
    </button>
  );
}

function ActionButton({
  label,
  onClick,
  icon,
  variant = "secondary",
  iconOnly = false,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  variant?: "secondary" | "primary" | "dark";
  iconOnly?: boolean;
}) {
  const styles = {
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    primary: "border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
    dark: "border border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
  } as const;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-xl text-xs font-bold transition ${iconOnly ? "h-9 w-9 px-0 py-0" : "gap-2 px-3.5 py-2"} ${styles[variant]}`}
      onClick={onClick}
    >
      {icon}
      {!iconOnly && label}
    </button>
  );
}

function renderOsCard(
  os: OSItem,
  isProductionDeploy: boolean,
  router: { push: (href: string) => void },
  onDownload: (os: OSItem) => void,
  onPreview: (os: OSItem) => void
) {
  const tecnicoNome =
    getTecnicoNome(os) || "Não definido";
  const osId = os._id || os.id;
  const clienteLinha = getClienteLinha(os);

  if (!osId) return null;

  return (
    <div
      key={osId}
      className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold text-slate-900">{os.osNumero || "Sem número"}</p>
          <p className="text-sm font-semibold text-slate-700">{clienteLinha}</p>
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
        <div className="flex flex-wrap justify-end gap-2">
          <ActionButton label="Preview" icon={<Eye size={14} />} onClick={() => onPreview(os)} />
          <ActionButton label="Baixar OS" icon={<Printer size={14} />} onClick={() => onDownload(os)} variant="primary" iconOnly />
          <ActionButton label="Ver detalhes" icon={<ArrowRight size={14} />} onClick={() => router.push(`/admin/servicos/${osId}`)} variant="dark" />
        </div>
      </div>
    </div>
  );
}

function getTecnicoNome(os: OSItem) {
  return (typeof os.tecnico === "object" ? os.tecnico?.nome : os.tecnico) || os.tecnicoNome || "";
}

function normalizeSearch(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function buildOsSearchText(os: OSItem) {
  return normalizeSearch(
    [
      os.cliente || "",
      os.subcliente || os.Subcliente || os.subgrupo || "",
      os.unidade || "",
      os.marca || "",
      os.osNumero || "",
      getTecnicoNome(os),
      os.solicitante_nome || "",
      os.tipo_manutencao || "",
    ].join(" ")
  );
}

function getClienteLinha(os: OSItem) {
  const cliente = os.cliente || "Sem cliente";
  const isDasa = normalizeSearch(cliente) === "dasa";

  if (isDasa) {
    const detalhes = [os.marca || "", os.unidade || ""].filter(Boolean).join(" - ");
    return detalhes ? `${cliente} - ${detalhes}` : cliente;
  }

  const subcliente = os.subcliente || os.Subcliente || os.subgrupo || "";
  return subcliente ? `${cliente} - ${subcliente}` : cliente;
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
