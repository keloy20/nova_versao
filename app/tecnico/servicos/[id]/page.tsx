"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, projectOsPath } from "@/app/lib/api";
import { formatDate, formatDuration, statusBadgeClass, statusLabel, normalizeStatus, STATUS } from "@/app/lib/os";

type HistoricoBloco = {
  relatorio?: string;
  observacao?: string;
  fotos?: string[];
};

type ServicoDetalhe = {
  osNumero?: string;
  cliente?: string;
  subcliente?: string;
  status?: string;
  solicitante_nome?: string;
  tipo_manutencao?: string;
  prioridade?: string;
  orcamento_previsto?: string;
  equipamento_nome?: string;
  equipamento_fabricante?: string;
  equipamento_modelo?: string;
  equipamento_numero_serie?: string;
  equipamento_patrimonio?: string;
  equipamento_especificacoes?: string;
  data_abertura?: string;
  data_inicio_atendimento?: string;
  data_pausa_atendimento?: string;
  data_retomada_atendimento?: string;
  data_inicio_deslocamento?: string;
  data_fim_deslocamento?: string;
  deslocamento_segundos?: number;
  deslocamento_concluido?: boolean;
  detalhamento?: string;
  feedback_admin?: string;
  antes?: HistoricoBloco;
  depois?: HistoricoBloco;
  botao_gps_endereco?: string;
  botao_ligar_telefone?: string;
  problem_photo_url?: string;
  foto_abertura?: string;
  materiais_solicitados?: MaterialSolicitado[];
};

type MaterialSolicitado = {
  nome?: string;
  fabricante?: string;
  modelo?: string;
  quantidade?: number;
  unidade?: string;
  observacao?: string;
};

export default function ServicoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [os, setOs] = useState<ServicoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarOS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarOS() {
    try {
      const data = (await apiFetch(`/projects/tecnico/view/${id}`)) as ServicoDetalhe;
      setOs(data);
    } catch {
      setOs(null);
    } finally {
      setLoading(false);
    }
  }

  async function mudarStatus(acao: "iniciar" | "pausar" | "retomar") {
    try {
      const map: Record<"iniciar" | "pausar" | "retomar", string> = {
        iniciar: "start",
        pausar: "pause",
        retomar: "resume",
      };
      await apiFetch(projectOsPath(`/${id}/${map[acao]}`), { method: "POST" });
      await carregarOS();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar status");
    }
  }

  async function mudarDeslocamento(acao: "iniciar" | "finalizar") {
    try {
      const endpoint =
        acao === "iniciar"
          ? `/projects/tecnico/deslocamento/iniciar/${id}`
          : `/projects/tecnico/deslocamento/finalizar/${id}`;
      await apiFetch(endpoint, { method: "PUT" });
      await carregarOS();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar deslocamento");
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!os) return <div className="p-6">OS não encontrada</div>;

  const status = normalizeStatus(os.status);
  const canGoDepois =
    status === STATUS.EM_ATENDIMENTO || status === STATUS.PAUSADA || status === STATUS.DEVOLVIDA_PARA_AJUSTE;
  const canEditar = canGoDepois || status === STATUS.ABERTA;
  const podeIniciarDeslocamento =
    !os.data_inicio_deslocamento && !os.data_fim_deslocamento && !os.deslocamento_concluido;
  const podeFinalizarDeslocamento =
    Boolean(os.data_inicio_deslocamento) && !os.data_fim_deslocamento && !os.deslocamento_concluido;

  return (
    <div className="min-h-screen p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">OS {os.osNumero}</h1>
            <p className="text-sm text-slate-600">{os.cliente}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(status)}`}>
            {statusLabel(status)}
          </span>
        </div>

        <div className="mt-5 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
          <p><b>Subcliente:</b> {os.subcliente || "-"}</p>
          <p><b>Solicitante:</b> {os.solicitante_nome || "-"}</p>
          <p><b>Tipo:</b> {os.tipo_manutencao || "-"}</p>
          <p><b>Prioridade:</b> {os.prioridade || "MEDIA"}</p>
          <p><b>Equipamento:</b> {os.equipamento_nome || "-"}</p>
          <p><b>Fabricante:</b> {os.equipamento_fabricante || "-"}</p>
          <p><b>Modelo:</b> {os.equipamento_modelo || "-"}</p>
          <p><b>Número de série:</b> {os.equipamento_numero_serie || "-"}</p>
          <p><b>Patrimônio:</b> {os.equipamento_patrimonio || "-"}</p>
          <p><b>Orçamento previsto:</b> {os.orcamento_previsto || "-"}</p>
          <p><b>Abertura:</b> {formatDate(os.data_abertura)}</p>
          <p><b>Início:</b> {formatDate(os.data_inicio_atendimento)}</p>
          <p><b>Pausa:</b> {formatDate(os.data_pausa_atendimento)}</p>
          <p><b>Retomada:</b> {formatDate(os.data_retomada_atendimento)}</p>
        </div>

        {os.equipamento_especificacoes && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-1 text-sm font-semibold text-slate-700">Especificações técnicas</p>
            <p className="whitespace-pre-line text-sm text-slate-700">{os.equipamento_especificacoes}</p>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-4">
          <p className="mb-1 text-sm font-semibold text-sky-700">Detalhamento do serviço</p>
          <p className="whitespace-pre-line text-sm text-slate-700">{os.detalhamento || "-"}</p>
        </div>

        {(os.problem_photo_url || os.foto_abertura) && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Foto enviada na solicitação</p>
            <img
              src={`data:image/jpeg;base64,${os.problem_photo_url || os.foto_abertura}`}
              alt="Foto da solicitação"
              className="h-44 w-full max-w-sm rounded-lg object-cover"
            />
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {podeIniciarDeslocamento && (
            <button
              onClick={() => mudarDeslocamento("iniciar")}
              className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600"
            >
              Iniciar deslocamento
            </button>
          )}

          {podeFinalizarDeslocamento && (
            <button
              onClick={() => mudarDeslocamento("finalizar")}
              className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700"
            >
              Finalizar deslocamento
            </button>
          )}

          {status === STATUS.ABERTA && (
            <button
              onClick={() => mudarStatus("iniciar")}
              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
            >
              Iniciar atendimento
            </button>
          )}

          {status === STATUS.EM_ATENDIMENTO && (
            <button
              onClick={() => mudarStatus("pausar")}
              className="rounded-xl bg-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-fuchsia-700"
            >
              Pausar
            </button>
          )}

          {status === STATUS.PAUSADA && (
            <button
              onClick={() => mudarStatus("retomar")}
              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
            >
              Retomar
            </button>
          )}

          {canEditar && (
            <button
              onClick={() => router.push(`/tecnico/servicos/${id}/antes`)}
              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
            >
              Registrar ANTES
            </button>
          )}

          {canEditar && (
            <button
              onClick={() => router.push(`/tecnico/servicos/${id}/depois`)}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={!canGoDepois}
            >
              Revisar DEPOIS e Enviar
            </button>
          )}

          <button
            onClick={() => router.push("/tecnico")}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Voltar
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p><b>Início deslocamento:</b> {formatDate(os.data_inicio_deslocamento)}</p>
          <p><b>Fim deslocamento:</b> {formatDate(os.data_fim_deslocamento)}</p>
          <p><b>Tempo deslocamento:</b> {formatDuration(os.deslocamento_segundos)}</p>
          {os.deslocamento_concluido && <p><b>Status deslocamento:</b> concluído e bloqueado para esta OS</p>}
        </div>

        {status === STATUS.FINALIZADA_PELO_TECNICO && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            Serviço enviado. Aguarda aprovação do admin. Agora você só pode visualizar.
          </div>
        )}

        {status === STATUS.DEVOLVIDA_PARA_AJUSTE && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p className="font-bold">Admin pediu correção. Revise e reenvie.</p>
            <p>{os.feedback_admin || "Sem observação do admin."}</p>
          </div>
        )}

        {status === STATUS.VALIDADA_PELO_ADMIN && (
          <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-800">
            OS concluída e validada pelo admin.
          </div>
        )}

        {(os.botao_gps_endereco || os.botao_ligar_telefone) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {os.botao_gps_endereco && (
              <a href={os.botao_gps_endereco} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">Abrir GPS</a>
            )}
            {os.botao_ligar_telefone && (
              <a href={os.botao_ligar_telefone} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">
                Ligar
              </a>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-5 border-t border-slate-200 pt-5 lg:grid-cols-2">
          <SectionHistorico titulo="ANTES" bloco={os.antes} />
          <SectionHistorico titulo="DEPOIS" bloco={os.depois} />
        </div>

        {Array.isArray(os.materiais_solicitados) && os.materiais_solicitados.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-extrabold text-slate-800">Materiais necessários</p>
            <div className="space-y-2">
              {os.materiais_solicitados.map((m, idx) => (
                <div key={`${m.nome || "material"}-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
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
      </div>
    </div>
  );
}

function SectionHistorico({ titulo, bloco }: { titulo: string; bloco?: HistoricoBloco }) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-extrabold text-slate-800">{titulo}</h2>
      <p className="text-sm"><b>Parecer:</b> {bloco?.relatorio || "-"}</p>
      <p className="text-sm"><b>Observação:</b> {bloco?.observacao || "-"}</p>

      {bloco?.fotos && bloco.fotos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {bloco.fotos.map((f, i) => (
            <img key={i} src={`data:image/jpeg;base64,${f}`} alt={`${titulo} foto ${i + 1}`} className="h-28 w-full rounded-lg object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}
