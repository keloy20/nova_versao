"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, Printer } from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import { formatDate, isOpenStatus, normalizeStatus, statusBadgeClass, statusLabel, STATUS } from "@/app/lib/os";

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

const STATUS_AGUARDANDO_TECNICO = "aguardando_tecnico";
const STATUS_EM_DESLOCAMENTO = "em_deslocamento";
const STATUS_EM_ANDAMENTO = "em_andamento";
const STATUS_PAUSADA = "pausada";
const STATUS_FINALIZADAS = "finalizadas";

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
            total_validadas_admin: Number(metricas.total_validadas_admin || metricas.total_fechadas || 0),
            total_fechadas: Number(metricas.total_fechadas || 0),
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

  async function baixarOSRapido(os: OSItem) {
    try {
      const osId = os._id || os.id;
      if (!osId) throw new Error("OS sem identificador");

      const detalhe = (await apiFetch(`/projects/admin/view/${osId}`)) as OSItem;

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 14;
      const contentWidth = pageWidth - marginX * 2;
      let y = 16;

      const tecnicoNome =
        (typeof detalhe.tecnico === "object" ? detalhe.tecnico?.nome : detalhe.tecnico) ||
        detalhe.tecnicoNome ||
        "-";

      const ensureSpace = (heightNeeded: number) => {
        if (y + heightNeeded <= pageHeight - 14) return;
        pdf.addPage();
        y = 16;
      };

      const drawHeader = () => {
        pdf.setFillColor(15, 23, 42);
        pdf.roundedRect(marginX, y, contentWidth, 24, 3, 3, "F");
        pdf.setFillColor(245, 158, 11);
        pdf.roundedRect(marginX + 4, y + 4, 20, 16, 2, 2, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text("SERT", marginX + 8, y + 14);
        pdf.setFontSize(16);
        pdf.text(`RELATORIO OS ${detalhe.osNumero || ""}`.trim(), marginX + 28, y + 10);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text("Ordem de servico - Gerenciador", marginX + 28, y + 17);
        y += 30;
      };

      const drawSectionTitle = (title: string) => {
        ensureSpace(12);
        pdf.setFillColor(241, 245, 249);
        pdf.roundedRect(marginX, y, contentWidth, 10, 2, 2, "F");
        pdf.setTextColor(30, 41, 59);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(title, marginX + 4, y + 6.8);
        y += 14;
      };

      const drawField = (label: string, value?: string | null) => {
        const safeValue = String(value || "-");
        const wrapped = pdf.splitTextToSize(safeValue, contentWidth - 42);
        ensureSpace(Math.max(8, wrapped.length * 5 + 2));
        pdf.setTextColor(51, 65, 85);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.text(`${label}:`, marginX, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(wrapped, marginX + 40, y);
        y += Math.max(8, wrapped.length * 5 + 2);
      };

      const drawImageGrid = async (title: string, fotos?: string[]) => {
        if (!Array.isArray(fotos) || fotos.length === 0) return;
        drawSectionTitle(title);
        const imageWidth = 56;
        const imageHeight = 42;
        const gap = 6;
        let col = 0;

        for (let index = 0; index < fotos.length; index += 1) {
          if (col === 0) {
            ensureSpace(imageHeight + 10);
          }

          const x = marginX + col * (imageWidth + gap);
          const imageData = fotos[index]?.startsWith("data:image/")
            ? fotos[index]
            : `data:image/jpeg;base64,${fotos[index]}`;
          const imageFormat = imageData.startsWith("data:image/png") ? "PNG" : "JPEG";

          pdf.setDrawColor(203, 213, 225);
          pdf.roundedRect(x, y, imageWidth, imageHeight, 2, 2);
          pdf.addImage(imageData, imageFormat, x + 1, y + 1, imageWidth - 2, imageHeight - 2);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(71, 85, 105);
          pdf.text(`Foto ${index + 1}`, x, y + imageHeight + 4);

          col += 1;
          if (col === 3) {
            col = 0;
            y += imageHeight + 10;
          }
        }

        if (col !== 0) {
          y += imageHeight + 10;
        }
      };

      const drawSignature = (title: string, signature?: string | null) => {
        if (!signature) return;
        ensureSpace(42);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(51, 65, 85);
        pdf.text(title, marginX, y);
        y += 4;
        pdf.setDrawColor(203, 213, 225);
        pdf.roundedRect(marginX, y, 80, 32, 2, 2);
        if (String(signature).startsWith("data:image/")) {
          pdf.addImage(String(signature), "PNG", marginX + 2, y + 2, 76, 28);
        }
        y += 38;
      };

      drawHeader();

      drawSectionTitle("Dados principais");
      drawField("OS", detalhe.osNumero || osId);
      drawField("Status", statusLabel(detalhe.status));
      drawField("Cliente", detalhe.cliente);
      drawField("Solicitante", detalhe.solicitante_nome);
      drawField("Tipo", detalhe.tipo_manutencao);
      drawField("Tecnico", tecnicoNome);
      drawField("Abertura", formatDate(detalhe.data_abertura || detalhe.createdAt));
      drawField("Telefone", detalhe.telefone);
      drawField("Email", detalhe.email);
      drawField("Endereco", detalhe.endereco);

      drawSectionTitle("Descricao do servico");
      drawField("Detalhamento", detalhe.detalhamento);

      drawSectionTitle("ANTES");
      drawField("Parecer inicial", detalhe.antes?.relatorio);
      drawField("Observacao inicial", detalhe.antes?.observacao);
      await drawImageGrid("Fotos do ANTES", detalhe.antes?.fotos);

      drawSectionTitle("DEPOIS");
      drawField("Parecer final", detalhe.depois?.relatorio);
      drawField("Observacao final", detalhe.depois?.observacao);
      await drawImageGrid("Fotos do DEPOIS", detalhe.depois?.fotos);

      if (Array.isArray(detalhe.materiais_solicitados) && detalhe.materiais_solicitados.length > 0) {
        drawSectionTitle("Materiais");
        detalhe.materiais_solicitados.forEach((material, index) => {
          drawField(
            `Item ${index + 1}`,
            `${material.nome || "-"} | ${material.quantidade ?? 0} ${material.unidade || "un"}${
              material.fabricante ? ` | ${material.fabricante}` : ""
            }${material.modelo ? ` | ${material.modelo}` : ""}${material.observacao ? ` | ${material.observacao}` : ""}`
          );
        });
      }

      drawSectionTitle("Assinaturas");
      drawField("Cliente", detalhe.cliente_nome || "-");
      drawField("Funcao", detalhe.cliente_funcao || "-");
      drawSignature("Assinatura do tecnico", detalhe.assinatura_tecnico);
      drawSignature("Assinatura do cliente", detalhe.assinatura_cliente);

      pdf.save(`RELATORIO-OS-${detalhe.osNumero || osId}.pdf`);
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
      aguardando: byBucket[STATUS_AGUARDANDO_TECNICO] || 0,
      deslocamento: byBucket[STATUS_EM_DESLOCAMENTO] || 0,
      andamento: byBucket[STATUS_EM_ANDAMENTO] || 0,
      pausadas: byBucket[STATUS_PAUSADA] || 0,
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
  }, [isProductionDeploy, osList, statusFiltro, busca, dataInicio, dataFim]);

  const grupos = useMemo(() => {
    const ativas: OSItem[] = [];
    const esperandoValidacao: OSItem[] = [];
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

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6">Carregando...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card titulo="Aguardando técnico" valor={contadores.aguardando ?? 0} cor="bg-amber-500" onClick={() => setStatusFiltro(STATUS_AGUARDANDO_TECNICO)} active={statusFiltro === STATUS_AGUARDANDO_TECNICO} />
        <Card titulo="Em deslocamento" valor={contadores.deslocamento ?? 0} cor="bg-cyan-600" onClick={() => setStatusFiltro(STATUS_EM_DESLOCAMENTO)} active={statusFiltro === STATUS_EM_DESLOCAMENTO} />
        <Card titulo="Em andamento" valor={contadores.andamento ?? 0} cor="bg-sky-600" onClick={() => setStatusFiltro(STATUS_EM_ANDAMENTO)} active={statusFiltro === STATUS_EM_ANDAMENTO} />
        <Card titulo="Pausada" valor={contadores.pausadas ?? 0} cor="bg-purple-600" onClick={() => setStatusFiltro(STATUS_PAUSADA)} active={statusFiltro === STATUS_PAUSADA} />
        <Card titulo="Finalizada" valor={contadores.finalizadas ?? 0} cor="bg-green-700" onClick={() => setStatusFiltro(STATUS_FINALIZADAS)} active={statusFiltro === STATUS_FINALIZADAS} />
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value={STATUS_AGUARDANDO_TECNICO}>Aguardando técnico</option>
          <option value={STATUS_EM_DESLOCAMENTO}>Em deslocamento</option>
          <option value={STATUS_EM_ANDAMENTO}>Em andamento</option>
          <option value={STATUS_PAUSADA}>Pausada</option>
          <option value={STATUS_FINALIZADAS}>Finalizada</option>
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

      {!isProductionDeploy && isOpenStatus(os.status) && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-blue-700">OS em aberto</p>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          title="Baixar OS"
          aria-label="Baixar OS"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
          onClick={(e) => {
            e.stopPropagation();
            onQuickDownload(os);
          }}
        >
          <Printer size={16} />
        </button>
        <button
          type="button"
          title="Preview"
          aria-label="Preview"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/servicos/${osId}`);
          }}
        >
          <Eye size={16} />
        </button>
        <button
          type="button"
          title="Abrir detalhes"
          aria-label="Abrir detalhes"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/servicos/${osId}`);
          }}
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function dashboardStatusBucket(os: OSItem) {
  const status = normalizeStatus(os.status);
  const emDeslocamento = Boolean(os.data_inicio_deslocamento) && !os.data_fim_deslocamento;

  if (status === STATUS.PAUSADA) return STATUS_PAUSADA;
  if (emDeslocamento) return STATUS_EM_DESLOCAMENTO;
  if (status === STATUS.EM_ATENDIMENTO) return STATUS_EM_ANDAMENTO;
  if (status === STATUS.FINALIZADA_PELO_TECNICO || status === STATUS.VALIDADA_PELO_ADMIN) return STATUS_FINALIZADAS;
  return STATUS_AGUARDANDO_TECNICO;
}

function legacyStatusLabel(rawStatus?: string, os?: OSItem) {
  const bucket = os ? dashboardStatusBucket(os) : STATUS_AGUARDANDO_TECNICO;
  if (bucket === STATUS_AGUARDANDO_TECNICO) return "Aguardando técnico";
  if (bucket === STATUS_EM_DESLOCAMENTO) return "Em deslocamento";
  if (bucket === STATUS_EM_ANDAMENTO) return "Em andamento";
  if (bucket === STATUS_PAUSADA) return "Pausada";
  if (bucket === STATUS_FINALIZADAS) return "Finalizada";
  return rawStatus || "status";
}

function legacyStatusColor(rawStatus?: string, os?: OSItem) {
  const bucket = os ? dashboardStatusBucket(os) : STATUS_AGUARDANDO_TECNICO;
  if (bucket === STATUS_AGUARDANDO_TECNICO) return "bg-amber-100 text-amber-800";
  if (bucket === STATUS_EM_DESLOCAMENTO) return "bg-cyan-100 text-cyan-800";
  if (bucket === STATUS_EM_ANDAMENTO) return "bg-sky-100 text-sky-800";
  if (bucket === STATUS_PAUSADA) return "bg-purple-100 text-purple-800";
  if (bucket === STATUS_FINALIZADAS) return "bg-green-100 text-green-800";
  return "bg-gray-200 text-gray-800";
}
