"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
      await apiFetch(projectOsPath(`/${id}/validate`), {
        method: "POST",
        body: JSON.stringify({
          channel: "WHATSAPP",
          delivery_email: "",
          delivery_phone_e164: deliveryPhone,
        }),
      });
      const numero = String(deliveryPhone || "").replace(/\D/g, "");
      if (numero) {
        const texto = `OS ${os?.osNumero || id} validada. O relatório em PDF foi liberado no sistema.`;
        window.location.href = `https://wa.me/55${numero}?text=${encodeURIComponent(texto)}`;
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
      const res = await fetch(`${API_URL}/os/${id}/report?variant=client&force=true`, {
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
          <button onClick={gerarPDF} className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800">Gerar PDF</button>

          {userRole === "admin" && status === STATUS.FINALIZADA_PELO_TECNICO && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                placeholder="Telefone com DDD"
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
              />
              <button onClick={validarOS} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">Validar e Enviar no WhatsApp</button>
              <button onClick={devolverParaAjuste} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800">Devolver para ajuste</button>
            </div>
          )}
          {userRole === "admin" && [STATUS.FINALIZADA_PELO_TECNICO, STATUS.VALIDADA_PELO_ADMIN, STATUS.CANCELADA].includes(status as typeof STATUS.FINALIZADA_PELO_TECNICO | typeof STATUS.VALIDADA_PELO_ADMIN | typeof STATUS.CANCELADA) && (
            <button onClick={reabrirOS} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-800">Reabrir OS</button>
          )}

          {userRole === "admin" && (
            <>
              <button onClick={() => router.push(`/admin/servicos/${id}/editar`)} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600">Editar</button>
              <button onClick={cancelarOS} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700">Cancelar</button>
              <button onClick={excluirOS} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800">Excluir</button>
            </>
          )}

          <button onClick={() => router.back()} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Voltar</button>
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
              <a href={os.botao_gps_endereco} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
                Abrir GPS
              </a>
            )}
            {os.botao_ligar_telefone && (
              <a href={os.botao_ligar_telefone} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
                Ligar
              </a>
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
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-semibold text-slate-800">{value || "-"}</p>
    </div>
  );
}
