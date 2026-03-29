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
      const marginX = 10;
      const contentWidth = pageWidth - marginX * 2;
      const footerHeight = 10;
      let y = 8;

      const tecnicoNome =
        (typeof detalhe.tecnico === "object" ? detalhe.tecnico?.nome : detalhe.tecnico) ||
        detalhe.tecnicoNome ||
        "-";

      const statusTexto = legacyStatusLabel(detalhe.status, detalhe);
      const statusCor = dashboardStatusBucket(detalhe) === STATUS_FINALIZADAS ? [34, 197, 94] : [245, 158, 11];
      const addFooter = () => {
        pdf.setDrawColor(245, 158, 11);
        pdf.setLineWidth(0.6);
        pdf.line(marginX, pageHeight - footerHeight, pageWidth - marginX, pageHeight - footerHeight);
        pdf.setTextColor(71, 85, 105);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text("SERTECH Solucoes Integradas Ltda - Av. Recife, 4900 - Estancia, Recife - PE", marginX, pageHeight - 4);
        pdf.text(`OS: ${detalhe.osNumero || "-"}`, pageWidth - marginX, pageHeight - 4, { align: "right" });
      };

      const addPage = () => {
        pdf.addPage();
        y = 8;
        drawHeader(true);
        addFooter();
      };

      const ensureSpace = (heightNeeded: number) => {
        if (y + heightNeeded <= pageHeight - footerHeight - 8) return;
        addPage();
      };

      const drawHeader = (compact = false) => {
        const headerHeight = compact ? 22 : 30;
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, y, pageWidth, headerHeight, "F");
        pdf.setFillColor(21, 101, 192);
        pdf.roundedRect(marginX + 2, y + 7, 20, 14, 1.5, 1.5, "F");
        pdf.setFillColor(245, 158, 11);
        pdf.roundedRect(marginX + 2, y + 20, 10, 4, 1, 1, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(compact ? 13 : 15);
        pdf.text(`RELATORIO OS ${detalhe.osNumero || ""}`.trim(), marginX + 28, y + 13);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.text("Ordem de Servico  -  Gerenciador", marginX + 28, y + 20);
        pdf.text(formatDate(detalhe.data_validacao_admin || detalhe.data_abertura || detalhe.createdAt), pageWidth - marginX, y + 8, {
          align: "right",
        });
        pdf.setFillColor(statusCor[0], statusCor[1], statusCor[2]);
        pdf.roundedRect(pageWidth - 52, y + 9, 34, 8, 2, 2, "F");
        pdf.setFontSize(7);
        pdf.setTextColor(15, 23, 42);
        pdf.text(statusTexto, pageWidth - 35, y + 14, { align: "center" });
        pdf.setDrawColor(245, 158, 11);
        pdf.setLineWidth(1);
        pdf.line(0, y + headerHeight, pageWidth, y + headerHeight);
        y += headerHeight + 6;
      };

      const drawSectionTitle = (title: string) => {
        ensureSpace(8);
        pdf.setFillColor(23, 37, 84);
        pdf.rect(marginX, y, contentWidth, 7, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(title.toUpperCase(), marginX + 3, y + 4.8);
        y += 9;
      };

      const drawFieldTable = (rows: Array<[string, string | undefined | null]>) => {
        const lineHeight = 6;
        const labelWidth = 28;
        rows.forEach(([label, value]) => {
          const text = String(value || "-");
          const wrapped = pdf.splitTextToSize(text, contentWidth - labelWidth - 6);
          const rowHeight = Math.max(lineHeight, wrapped.length * 4.5 + 1.5);
          ensureSpace(rowHeight);
          pdf.setDrawColor(203, 213, 225);
          pdf.setFillColor(255, 255, 255);
          pdf.rect(marginX, y, labelWidth, rowHeight);
          pdf.rect(marginX + labelWidth, y, contentWidth - labelWidth, rowHeight);
          pdf.setTextColor(30, 41, 59);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.5);
          pdf.text(`${label}:`, marginX + 2, y + 4.2);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.5);
          pdf.text(wrapped, marginX + labelWidth + 2, y + 4.2);
          y += rowHeight;
        });
        y += 3;
      };

      const drawLongField = (label: string, value?: string | null, color: [number, number, number] = [226, 232, 240]) => {
        const safeValue = String(value || "-");
        const wrapped = pdf.splitTextToSize(safeValue, contentWidth - 6);
        const height = Math.max(9, wrapped.length * 4.5 + 3);
        ensureSpace(height);
        pdf.setDrawColor(color[0], color[1], color[2]);
        pdf.rect(marginX, y, contentWidth, height);
        pdf.setTextColor(30, 41, 59);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.text(label, marginX + 2, y + 3.8);
        pdf.setFont("helvetica", "normal");
        pdf.text(wrapped, marginX + 28, y + 3.8);
        y += height + 3;
      };

      const drawImageGrid = async (title: string, fotos?: string[], pageLimit = 4) => {
        if (!Array.isArray(fotos) || fotos.length === 0) return;
        drawSectionTitle(title);
        const imageWidth = (contentWidth - 8) / 2;
        const imageHeight = 42;
        const gap = 8;
        let col = 0;
        const visibleFotos = fotos.slice(0, pageLimit);

        for (let index = 0; index < visibleFotos.length; index += 1) {
          if (col === 0) {
            ensureSpace(imageHeight + 10);
          }

          const x = marginX + col * (imageWidth + gap);
          const currentFoto = visibleFotos[index];
          const imageData = currentFoto?.startsWith("data:image/")
            ? currentFoto
            : `data:image/jpeg;base64,${currentFoto}`;
          const imageFormat = imageData.startsWith("data:image/png") ? "PNG" : "JPEG";

          pdf.setDrawColor(title.includes("ANTES") ? 248 : 134, title.includes("ANTES") ? 113 : 239, title.includes("ANTES") ? 113 : 172);
          pdf.rect(x, y, imageWidth, imageHeight);
          pdf.addImage(imageData, imageFormat, x + 1.5, y + 1.5, imageWidth - 3, imageHeight - 3);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7);
          pdf.setTextColor(71, 85, 105);
          pdf.text(`Foto ${index + 1}`, x, y + imageHeight + 4);

          col += 1;
          if (col === 2) {
            col = 0;
            y += imageHeight + 10;
          }
        }

        if (col !== 0) {
          y += imageHeight + 10;
        }
      };

      const drawSignatureRow = () => {
        ensureSpace(44);
        const boxWidth = (contentWidth - 6) / 2;
        const titles = [
          { label: "Assinatura do Técnico", value: detalhe.assinatura_tecnico, fallback: tecnicoNome },
          { label: "Assinatura do Cliente", value: detalhe.assinatura_cliente, fallback: detalhe.cliente || "-" },
        ];

        titles.forEach((item, index) => {
          const x = marginX + index * (boxWidth + 6);
          pdf.setDrawColor(59, 130, 246);
          pdf.rect(x, y, boxWidth, 30);
          pdf.setTextColor(30, 41, 59);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7.5);
          pdf.text(item.label, x + 2, y + 4);
          if (item.value && String(item.value).startsWith("data:image/")) {
            pdf.addImage(String(item.value), "PNG", x + 2, y + 6, boxWidth - 4, 18);
          } else {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7);
            pdf.text(String(item.fallback || "-"), x + boxWidth / 2, y + 22, { align: "center" });
          }
        });
        y += 36;
      };

      drawHeader();
      addFooter();

      drawSectionTitle("Dados principais");
      drawFieldTable([
        ["OS", detalhe.osNumero || osId],
        ["Status", statusTexto],
        ["Cliente", detalhe.cliente],
        ["Solicitante", detalhe.solicitante_nome],
        ["Tipo", detalhe.tipo_manutencao],
        ["Técnico", tecnicoNome],
        ["Abertura", formatDate(detalhe.data_abertura || detalhe.createdAt)],
        ["Telefone", detalhe.telefone],
        ["E-mail", detalhe.email],
        ["Endereço", detalhe.endereco],
      ]);

      drawSectionTitle("Descrição do serviço");
      drawLongField("Detalhamento", detalhe.detalhamento);

      drawSectionTitle("Situação inicial");
      drawLongField("Parecer inicial", detalhe.antes?.relatorio, [252, 165, 165]);
      drawLongField("Observações", detalhe.antes?.observacao, [252, 165, 165]);

      await drawImageGrid("Fotos iniciais", detalhe.antes?.fotos, 2);

      addPage();

      await drawImageGrid("Fotos finais", detalhe.depois?.fotos, 2);
      drawSectionTitle("Situação final");
      drawLongField("Parecer final", detalhe.depois?.relatorio, [134, 239, 172]);
      drawLongField("Observações", detalhe.depois?.observacao, [134, 239, 172]);

      if (Array.isArray(detalhe.materiais_solicitados) && detalhe.materiais_solicitados.length > 0) {
        drawSectionTitle("Materiais");
        detalhe.materiais_solicitados.slice(0, 3).forEach((material, index) => {
          drawLongField(
            `Item ${index + 1}`,
            `${material.nome || "-"} | ${material.quantidade ?? 0} ${material.unidade || "un"}${
              material.fabricante ? ` | ${material.fabricante}` : ""
            }${material.modelo ? ` | ${material.modelo}` : ""}${material.observacao ? ` | ${material.observacao}` : ""}`
          );
        });
      }

      drawSectionTitle("Assinaturas");
      drawSignatureRow();

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
