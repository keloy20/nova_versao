"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, MapPinned, Pause, Play } from "lucide-react";
import { apiFetch, projectOsPath } from "@/app/lib/api";
import { formatDate, normalizeStatus, statusBadgeClass, statusLabel, STATUS } from "@/app/lib/os";

type Servico = {
  _id: string;
  osNumero?: string;
  cliente?: string;
  subcliente?: string;
  Subcliente?: string;
  subgrupo?: string;
  unidade?: string;
  marca?: string;
  endereco?: string;
  telefone?: string;
  status?: string;
  data_abertura?: string;
  data_inicio_atendimento?: string;
  data_pausa_atendimento?: string;
  tipo_manutencao?: string;
  solicitante_nome?: string;
  prioridade?: string;
};

export default function TecnicoPage() {
  const router = useRouter();
  const FILTRO_TODAS = "__TODAS__" as const;
  const FILTRO_FINALIZADAS = "__FINALIZADAS__" as const;

  type FiltroTecnico =
    | typeof FILTRO_TODAS
    | typeof STATUS.ABERTA
    | typeof STATUS.EM_ATENDIMENTO
    | typeof STATUS.PAUSADA
    | typeof FILTRO_FINALIZADAS;

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [filtro, setFiltro] = useState<FiltroTecnico>(FILTRO_TODAS);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "tecnico") {
      router.replace("/login");
      return;
    }

    carregarServicos();
  }, [router]);

  async function carregarServicos() {
    try {
      const data = await apiFetch("/projects/tecnico/my");
      setServicos(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      alert("Erro ao carregar serviços: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  async function mudarStatus(id: string, acao: "iniciar" | "pausar" | "retomar") {
    try {
      const map: Record<"iniciar" | "pausar" | "retomar", string> = {
        iniciar: "start",
        pausar: "pause",
        retomar: "resume",
      };
      await apiFetch(projectOsPath(`/${id}/${map[acao]}`), { method: "POST" });
      await carregarServicos();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar status");
    }
  }

  function logout() {
    const ok = confirm("Deseja realmente sair?");
    if (!ok) return;

    localStorage.clear();
    router.push("/login");
  }

  const filtros: Array<{ label: string; value: FiltroTecnico }> = [
    { label: "Todas", value: FILTRO_TODAS },
    { label: "Abertas", value: STATUS.ABERTA },
    { label: "Em andamento", value: STATUS.EM_ATENDIMENTO },
    { label: "Pausadas", value: STATUS.PAUSADA },
    { label: "Finalizadas", value: FILTRO_FINALIZADAS },
  ];

  const listaFiltrada = useMemo(() => {
    const prioridadePeso: Record<string, number> = {
      ALTA: 0,
      MEDIA: 1,
      BAIXA: 2,
    };

    return servicos.filter((s) => {
      const status = normalizeStatus(s.status);
      const concluida = status === STATUS.FINALIZADA_PELO_TECNICO || status === STATUS.VALIDADA_PELO_ADMIN;
      const termo = busca.trim().toLowerCase();

      if (filtro === FILTRO_FINALIZADAS) {
        if (!concluida) return false;
      } else if (filtro === FILTRO_TODAS) {
        if (concluida) return false;
      } else {
        if (concluida) return false;
        if (status !== filtro) return false;
      }

      if (!termo) return true;
      const texto = [
        s.osNumero || "",
        s.cliente || "",
        s.solicitante_nome || "",
        s.subcliente || "",
        s.Subcliente || "",
        s.subgrupo || "",
        statusLabel(status),
      ]
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    }).sort((a, b) => {
      const pa = prioridadePeso[String(a.prioridade || "MEDIA").toUpperCase()] ?? 1;
      const pb = prioridadePeso[String(b.prioridade || "MEDIA").toUpperCase()] ?? 1;
      if (pa !== pb) return pa - pb;

      const ta = new Date(a.data_abertura || 0).getTime();
      const tb = new Date(b.data_abertura || 0).getTime();
      if (ta !== tb) return ta - tb;

      const oa = Number(String(a.osNumero || "").split("-")[0]) || 0;
      const ob = Number(String(b.osNumero || "").split("-")[0]) || 0;
      return oa - ob;
    });
  }, [servicos, filtro, busca]);

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6">Carregando...</div>;

  return (
    <div className="space-y-5 bg-[#f3f8ff] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Área técnica</p>
            <h1 className="text-2xl font-extrabold text-slate-900">Painel do Técnico</h1>
          </div>
          <button
            onClick={logout}
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100"
          >
            Sair
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {filtros.map((f) => (
            <button
              key={f.label}
              onClick={() => setFiltro(f.value)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                filtro === f.value
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          placeholder="Pesquisar OS (cliente, número, solicitante...)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {listaFiltrada.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Nenhum serviço encontrado.
          </p>
        )}

        <div className="space-y-3">
          {listaFiltrada.map((s) => {
            const status = normalizeStatus(s.status);
            return (
              <div key={s._id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-extrabold">{s.osNumero || "Sem OS"}</p>
                    <p className="text-sm font-semibold text-slate-700">{s.cliente || "Sem cliente"}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      Prioridade {String(s.prioridade || "MEDIA").toUpperCase()}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(status)}`}>
                      {statusLabel(status)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                  <p>
                    <b>Solicitante:</b> {s.solicitante_nome || "-"}
                  </p>
                  <p>
                    <b>Tipo:</b> {s.tipo_manutencao || "-"}
                  </p>
                  <p>
                    <b>Prioridade:</b> {s.prioridade || "MEDIA"}
                  </p>
                  <p>
                    <b>Abertura:</b> {formatDate(s.data_abertura)}
                  </p>
                  <p>
                    <b>Início:</b> {formatDate(s.data_inicio_atendimento)}
                  </p>
                  <p className="sm:col-span-2 lg:col-span-4">
                    <b>Endereço:</b> {s.endereco || "-"}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {status === STATUS.ABERTA && (
                    <button
                      onClick={() => mudarStatus(s._id, "iniciar")}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                    >
                      <Play size={16} />
                      Iniciar atendimento
                    </button>
                  )}

                  {status === STATUS.EM_ATENDIMENTO && (
                    <button
                      onClick={() => mudarStatus(s._id, "pausar")}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                    >
                      <Pause size={16} />
                      Pausar
                    </button>
                  )}

                  {status === STATUS.PAUSADA && (
                    <button
                      onClick={() => mudarStatus(s._id, "retomar")}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                    >
                      <Play size={16} />
                      Retomar
                    </button>
                  )}

                  {s.endereco && (
                    <a
                      href={buildGpsHref(s.endereco)}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir GPS"
                      aria-label="Abrir GPS"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                    >
                      <MapPinned size={16} />
                    </a>
                  )}

                  <button
                    onClick={() => router.push(`/tecnico/servicos/${s._id}`)}
                    title="Ver detalhes"
                    aria-label="Ver detalhes"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function buildGpsHref(endereco?: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(endereco || "").trim())}`;
}
