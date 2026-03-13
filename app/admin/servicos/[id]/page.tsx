"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, FilePenLine, MapPinned, Phone, Printer, RotateCcw, Send, Trash2, XCircle } from "lucide-react";
import { API_URL, apiFetch, projectOsPath } from "@/app/lib/api";
import { formatDate, formatDuration, statusBadgeClass, statusLabel, normalizeStatus, STATUS } from "@/app/lib/os";

type OSDetalhe = {
  _id?: string;
  osNumero?: string;
  status?: string;
  cliente?: string;
  subcliente?: string;
  Subcliente?: string;
  subgrupo?: string;
  solicitante_nome?: string;
  tipo_manutencao?: string;
  orcamento_previsto?: string;
  equipamento_nome?: string;
  equipamento_fabricante?: string;
  equipamento_modelo?: string;
  equipamento_numero_serie?: string;
  equipamento_patrimonio?: string;
  equipamento_especificacoes?: string;
  endereco?: string;
  email?: string;
  telefone?: string;
  tecnico?: { nome?: string };
  createdAt?: string;
  data_abertura?: string;
  data_inicio_atendimento?: string;
  data_pausa_atendimento?: string;
  data_retomada_atendimento?: string;
  data_inicio_deslocamento?: string;
  data_fim_deslocamento?: string;
  deslocamento_segundos?: number;
  data_finalizacao_tecnico?: string;
  data_validacao_admin?: string;
  assinatura_tecnico?: string;
  assinatura_cliente?: string;
  cliente_nome?: string;
  cliente_funcao?: string;
  cliente_nao_assinou?: boolean;
  motivo_nao_assinou?: string;
  feedback_admin?: string;
  detalhamento?: string;
  prioridade?: string;
  started_at?: string;
  finished_at?: string;
  created_at?: string;
  botao_gps_endereco?: string;
  botao_ligar_telefone?: string;
  antes?: HistoricoBloco;
  depois?: HistoricoBloco;
  materiais_solicitados?: MaterialSolicitado[];
};

type HistoricoBloco = {
  relatorio?: string;
  observacao?: string;
  fotos?: string[];
};

type TimerData = {
  active_seconds?: number;
  pause_seconds?: number;
  pause_count?: number;
  started_at?: string;
  finished_at?: string;
};

type MaterialSolicitado = {
  nome?: string;
  fabricante?: string;
  modelo?: string;
  quantidade?: number;
  unidade?: string;
  observacao?: string;
};

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

export default function DetalheOSPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [os, setOs] = useState<OSDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [timer, setTimer] = useState<TimerData | null>(null);
  const [events, setEvents] = useState<Array<{ _id: string; old_status?: string; new_status?: string; createdAt?: string }>>([]);
  const [deliveryPhone, setDeliveryPhone] = useState("");

  useEffect(() => {
    carregarOS();
    setUserRole(localStorage.getItem("role"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarOS() {
    try {
      const data = await apiFetch(`/projects/admin/view/${id}`);
      setOs(data as OSDetalhe);
      setDeliveryPhone(String((data as OSDetalhe)?.telefone || ""));
      try {
        const timerData = await apiFetch(projectOsPath(`/${id}/timer`));
        setTimer(timerData as TimerData);
      } catch {
        setTimer(null);
      }
      try {
        const eventsData = await apiFetch(projectOsPath(`/${id}/events`));
        setEvents(Array.isArray(eventsData) ? eventsData : []);
      } catch {
        setEvents([]);
      }
    } catch (err: unknown) {
      alert("Erro ao carregar OS: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  async function cancelarOS() {
    const ok = confirm("Tem certeza que deseja cancelar esta OS?");
    if (!ok) return;

    try {
      await apiFetch(`/projects/admin/cancelar/${id}`, { method: "PUT" });
      await carregarOS();
    } catch (err: unknown) {
      alert("Erro ao cancelar: " + (err instanceof Error ? err.message : "erro desconhecido"));
    }
  }

  async function excluirOS() {
    const ok = confirm("A exclusão é definitiva. Deseja continuar?");
    if (!ok) return;

    try {
      await apiFetch(`/projects/admin/delete/${id}`, { method: "DELETE" });
      router.push("/admin");
    } catch (err: unknown) {
      alert("Erro ao excluir OS: " + (err instanceof Error ? err.message : "erro desconhecido"));
    }
  }

  async function validarOS() {
    try {
      const resposta = await apiFetch(projectOsPath(`/${id}/validate`), {
        method: "POST",
        body: JSON.stringify({
          channel: "WHATSAPP",
          delivery_email: "",
          delivery_phone_e164: deliveryPhone,
        }),
      }) as { whatsapp_cliente?: { queued?: boolean; reason?: string; error?: string; status?: string; to?: string | null; raw?: unknown } } | null;

      const whatsappCliente = resposta?.whatsapp_cliente;
      if (whatsappCliente?.queued) {
        alert(`OS validada pelo admin e WhatsApp do cliente enviado com sucesso para ${whatsappCliente.to || "numero informado"}.`);
      } else if (whatsappCliente) {
        const motivo = whatsappCliente.reason || whatsappCliente.error || whatsappCliente.status || "Falha ao enviar WhatsApp do cliente";
        const extra = whatsappCliente.raw ? `\nDetalhe: ${JSON.stringify(whatsappCliente.raw)}` : "";
        alert(`OS validada, mas o WhatsApp do cliente nao foi enviado para ${whatsappCliente.to || "numero informado"}: ${motivo}${extra}`);
      } else {
        alert("OS validada pelo admin");
      }
      await carregarOS();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao validar OS");
    }
  }

  async function reabrirOS() {
    try {
      await apiFetch(projectOsPath(`/${id}/reopen`), { method: "POST" });
      alert("OS reaberta com sucesso");
      await carregarOS();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao reabrir OS");
    }
  }

  async function devolverParaAjuste() {
    const reason = prompt("Descreva o que o técnico precisa corrigir:");
    if (reason === null) return;

    try {
      await apiFetch(projectOsPath(`/${id}/request-changes`), {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      alert("OS devolvida para ajuste");
      await carregarOS();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao devolver OS");
    }
  }

  async function gerarPDF() {
    if (!os) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}${projectOsPath(`/${id}/report?variant=admin`)}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(await readPdfError(res, "Erro ao gerar PDF"));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `RELATORIO-OS-${os.osNumero || id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao baixar PDF");
    }
  }

  if (loading) return <div className="p-6 text-center">Carregando...</div>;
  if (!os) return <div className="p-6 text-center text-rose-700">OS não encontrada</div>;

  const status = normalizeStatus(os.status);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold">Detalhes da OS</h1>
            <p className="text-sm text-slate-600">{os.osNumero}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(status)}`}>
            {statusLabel(status)}
          </span>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <ActionButton onClick={gerarPDF} icon={<Printer size={16} />} variant="primary" iconOnly>
            Gerar PDF
          </ActionButton>

          {userRole === "admin" && status === STATUS.FINALIZADA_PELO_TECNICO && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                placeholder="Telefone com DDD"
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
              />
              <ActionButton onClick={validarOS} icon={<Send size={16} />} variant="success">
                Validar e Enviar no WhatsApp
              </ActionButton>
              <ActionButton onClick={devolverParaAjuste} icon={<XCircle size={16} />} variant="warning">
                Devolver para ajuste
              </ActionButton>
            </div>
          )}
          {userRole === "admin" && [STATUS.FINALIZADA_PELO_TECNICO, STATUS.VALIDADA_PELO_ADMIN, STATUS.CANCELADA].includes(status as typeof STATUS.FINALIZADA_PELO_TECNICO | typeof STATUS.VALIDADA_PELO_ADMIN | typeof STATUS.CANCELADA) && (
            <ActionButton onClick={reabrirOS} icon={<RotateCcw size={16} />} variant="dark">
              Reabrir OS
            </ActionButton>
          )}

          {userRole === "admin" && (
            <>
              <ActionButton onClick={() => router.push(`/admin/servicos/${id}/editar`)} icon={<FilePenLine size={16} />} variant="secondary" iconOnly>
                Editar
              </ActionButton>
              <ActionButton onClick={cancelarOS} icon={<XCircle size={16} />} variant="warning" iconOnly>
                Cancelar
              </ActionButton>
              <ActionButton onClick={excluirOS} icon={<Trash2 size={16} />} variant="danger" iconOnly>
                Excluir
              </ActionButton>
            </>
          )}

          <ActionButton onClick={() => router.back()} icon={<ArrowLeft size={16} />} variant="secondary" iconOnly>
            Voltar
          </ActionButton>
        </div>

        <div className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
          <Info label="Cliente" value={os.cliente} />
          <Info label="Subcliente" value={os.subcliente || os.Subcliente || os.subgrupo} />
          <Info label="Solicitante" value={os.solicitante_nome} />
          <Info label="Tipo manutenção" value={os.tipo_manutencao} />
          <Info label="Prioridade" value={os.prioridade} />
          <Info label="Equipamento" value={os.equipamento_nome} />
          <Info label="Fabricante" value={os.equipamento_fabricante} />
          <Info label="Modelo" value={os.equipamento_modelo} />
          <Info label="Número de série" value={os.equipamento_numero_serie} />
          <Info label="Patrimônio" value={os.equipamento_patrimonio} />
          <Info label="Orçamento previsto" value={os.orcamento_previsto} />
          <Info label="Endereço" value={os.endereco} />
          <Info label="Email" value={os.email} />
          <Info label="Telefone" value={os.telefone} />
          <Info label="Técnico" value={os.tecnico?.nome} />
          <Info label="Abertura" value={formatDate(os.data_abertura || os.createdAt)} />
          <Info label="Início atendimento" value={formatDate(os.data_inicio_atendimento)} />
          <Info label="Início deslocamento" value={formatDate(os.data_inicio_deslocamento)} />
          <Info label="Fim deslocamento" value={formatDate(os.data_fim_deslocamento)} />
          <Info label="Tempo deslocamento" value={formatDuration(os.deslocamento_segundos)} />
          <Info label="Pausa" value={formatDate(os.data_pausa_atendimento)} />
          <Info label="Retomada" value={formatDate(os.data_retomada_atendimento)} />
          <Info label="Finalização técnico" value={formatDate(os.data_finalizacao_tecnico)} />
          <Info label="Validação admin" value={formatDate(os.data_validacao_admin)} />
          <Info label="Assinatura técnico" value={os.assinatura_tecnico} />
          <Info label="Assinatura cliente" value={os.assinatura_cliente} />
          <Info label="Cliente nome" value={os.cliente_nome} />
          <Info label="Cliente função" value={os.cliente_funcao} />
          <Info label="Cliente não assinou" value={os.cliente_nao_assinou ? "Sim" : "Não"} />
          <Info label="Motivo não assinou" value={os.motivo_nao_assinou} />
          <Info label="Feedback admin" value={os.feedback_admin} />
        </div>

        {(os.botao_gps_endereco || os.botao_ligar_telefone) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {os.botao_gps_endereco && (
              <ActionLink href={os.botao_gps_endereco} icon={<MapPinned size={16} />} target="_blank" rel="noreferrer">
                Abrir GPS
              </ActionLink>
            )}
            {os.botao_ligar_telefone && (
              <ActionLink href={os.botao_ligar_telefone} icon={<Phone size={16} />}>
                Ligar
              </ActionLink>
            )}
          </div>
        )}

        {timer && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p><b>Timer ativo:</b> {formatDuration(timer.active_seconds)}</p>
            <p><b>Tempo em pausa:</b> {formatDuration(timer.pause_seconds)}</p>
            <p><b>Qtd pausas:</b> {timer.pause_count || 0}</p>
          </div>
        )}

        {events.length > 0 && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Eventos</p>
            <div className="space-y-2 text-xs text-slate-600">
              {events.map((ev) => (
                <div key={ev._id}>
                  {ev.old_status || "-"} {'->'} {ev.new_status || "-"} ({formatDate(ev.createdAt)})
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-1 text-sm font-semibold text-slate-700">Detalhamento</p>
          <p className="whitespace-pre-line text-sm text-slate-700">{os.detalhamento || "-"}</p>
        </div>

        {os.equipamento_especificacoes && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-1 text-sm font-semibold text-slate-700">Especificações técnicas</p>
            <p className="whitespace-pre-line text-sm text-slate-700">{os.equipamento_especificacoes}</p>
          </div>
        )}

        {Array.isArray(os.materiais_solicitados) && os.materiais_solicitados.length > 0 && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Materiais necessários</p>
            <div className="space-y-2">
              {os.materiais_solicitados.map((m, i) => (
                <div key={`${m.nome || "material"}-${i}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-800">{m.nome || "-"}</p>
                  <p>
                    {(m.quantidade ?? 0)} {m.unidade || "un"}
                    {m.fabricante ? ` | ${m.fabricante}` : ""}
                    {m.modelo ? ` | ${m.modelo}` : ""}
                  </p>
                  {m.observacao ? <p>{m.observacao}</p> : null}
                </div>
              ))}
            </div>
          </div>
        )}

        <PreviewBloco title="Preview ANTES" bloco={os.antes} />
        <PreviewBloco title="Preview DEPOIS" bloco={os.depois} />
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  icon,
  variant = "secondary",
  iconOnly = false,
}: {
  children: ReactNode;
  onClick: () => void;
  icon: ReactNode;
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "dark";
  iconOnly?: boolean;
}) {
  const styles = {
    primary: "border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    success: "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    warning: "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    danger: "border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
    dark: "border border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
  } as const;

  return (
    <button
      onClick={onClick}
      title={typeof children === "string" ? children : undefined}
      aria-label={typeof children === "string" ? children : undefined}
      className={`inline-flex items-center justify-center rounded-xl text-sm font-bold transition ${iconOnly ? "h-10 w-10 px-0 py-0" : "gap-2 px-4 py-2"} ${styles[variant]}`}
    >
      {icon}
      {!iconOnly && children}
    </button>
  );
}

function ActionLink({
  children,
  href,
  icon,
  target,
  rel,
}: {
  children: ReactNode;
  href: string;
  icon: ReactNode;
  target?: string;
  rel?: string;
}) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
    >
      {icon}
      {children}
    </a>
  );
}

function PreviewBloco({ title, bloco }: { title: string; bloco?: HistoricoBloco }) {
  if (!bloco) return null;
  const fotos = bloco.fotos || [];
  const semConteudo = !bloco.relatorio && !bloco.observacao && fotos.length === 0;
  if (semConteudo) return null;

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 text-sm font-semibold text-slate-700">{title}</p>
      {fotos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {fotos.map((foto, i) => (
            <img
              key={`${title}-${i}`}
              src={`data:image/jpeg;base64,${foto}`}
              alt={`${title} foto ${i + 1}`}
              className="h-28 w-full rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-3 grid gap-2 text-sm text-slate-700">
        <p>
          <b>Parecer:</b> {bloco.relatorio || "-"}
        </p>
        <p>
          <b>Observação:</b> {bloco.observacao || "-"}
        </p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  const isImage = Boolean(value && String(value).startsWith("data:image/"));
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {isImage ? (
        <img
          src={String(value)}
          alt={label}
          className="mt-2 h-28 w-full rounded-lg border border-slate-200 bg-white object-contain"
          style={{ transform: "scaleX(1)" }}
        />
      ) : (
        <p className="font-semibold text-slate-800">{value || "-"}</p>
      )}
    </div>
  );
}
