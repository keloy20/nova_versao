"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CarFront, Eye, MapPinned, Phone } from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import { formatDate, normalizeStatus, priorityBadgeClass, priorityLabel, statusBadgeClass, statusLabel, STATUS } from "@/app/lib/os";

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
  data_inicio_deslocamento?: string;
  data_fim_deslocamento?: string;
  deslocamento_segundos?: number;
  tipo_manutencao?: string;
  solicitante_nome?: string;
  prioridade?: string;
  detalhamento?: string;
};

export default function TecnicoPage() {
  const router = useRouter();
  const FILTRO_INICIAL = "__INICIAL__";
  const FILTRO_TODAS = "__TODAS__";
  const FILTRO_FINALIZADAS = "__FINALIZADAS__";
  const TECNICO_FILTER_STORAGE_KEY = "tecnico-dashboard-filters";
  const TECNICO_CACHE_KEY = "tecnico-dashboard-cache";

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [filtro, setFiltro] = useState(FILTRO_INICIAL);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingFresh, setLoadingFresh] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TECNICO_FILTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { filtro?: string; busca?: string };
        setFiltro(parsed.filtro || FILTRO_INICIAL);
        setBusca(parsed.busca || "");
      }
    } catch {
      // noop
    }

    try {
      const cached = sessionStorage.getItem(TECNICO_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Servico[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setServicos(parsed);
          setLoading(false);
        }
      }
    } catch {
      // noop
    }

    const role = localStorage.getItem("role");
    if (role !== "tecnico") {
      router.replace("/login");
      return;
    }

    carregarServicos();

    const onFocus = () => carregarServicos();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") carregarServicos();
    };
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") carregarServicos();
    }, 15000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [router]);

  useEffect(() => {
    sessionStorage.setItem(TECNICO_FILTER_STORAGE_KEY, JSON.stringify({ filtro, busca }));
  }, [filtro, busca]);

  async function carregarServicos() {
    setLoadingFresh(true);
    try {
      const data = await apiFetch("/projects/tecnico/my");
      const lista = Array.isArray(data) ? data : [];
      setServicos(lista);
      sessionStorage.setItem(TECNICO_CACHE_KEY, JSON.stringify(lista));
    } catch (err: unknown) {
      alert("Erro ao carregar serviços: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally {
      setLoading(false);
      setLoadingFresh(false);
    }
  }

  async function mudarStatus(id: string, acao: "iniciar" | "pausar" | "retomar") {
    try {
      const map: Record<"iniciar" | "pausar" | "retomar", string> = {
        iniciar: "start",
        pausar: "pause",
        retomar: "resume",
      };
      await apiFetch(`/os/${id}/${map[acao]}`, { method: "POST" });

      if (acao === "iniciar") {
        router.push(`/tecnico/servicos/${id}/antes?returnTo=/tecnico`);
        return;
      }

      await carregarServicos();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar status");
    }
  }

  async function mudarDeslocamento(id: string, acao: "iniciar" | "finalizar") {
    try {
      const endpoint =
        acao === "iniciar"
          ? `/projects/tecnico/deslocamento/iniciar/${id}`
          : `/projects/tecnico/deslocamento/finalizar/${id}`;
      await apiFetch(endpoint, { method: "PUT" });
      await carregarServicos();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar deslocamento");
    }
  }

  function logout() {
    const ok = confirm("Deseja realmente sair?");
    if (!ok) return;

    localStorage.clear();
    router.push("/login");
  }

  const filtros = [
    { label: "Página inicial", value: FILTRO_INICIAL },
    { label: "Todas", value: FILTRO_TODAS },
    { label: "Abertas", value: STATUS.ABERTA },
    { label: "Em andamento", value: STATUS.EM_ATENDIMENTO },
    { label: "Pausadas", value: STATUS.PAUSADA },
    { label: "Finalizadas", value: FILTRO_FINALIZADAS },
  ];

  const listaFiltrada = useMemo(() => {
    return servicos.filter((s) => {
      const status = normalizeStatus(s.status);
      const concluida = status === STATUS.FINALIZADA_PELO_TECNICO || status === STATUS.VALIDADA_PELO_ADMIN;
      const termo = busca.trim().toLowerCase();

      if (filtro === FILTRO_INICIAL) {
        if (![STATUS.ABERTA, STATUS.PAUSADA].includes(status as typeof STATUS.ABERTA | typeof STATUS.PAUSADA)) {
          return false;
        }
      } else if (filtro === FILTRO_TODAS) {
        // sem filtro adicional
      } else if (filtro === FILTRO_FINALIZADAS) {
        if (!concluida) return false;
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
      const oa = Number(String(a.osNumero || "").split("-")[0]) || 0;
      const ob = Number(String(b.osNumero || "").split("-")[0]) || 0;

      if ((a.prioridade || "").toUpperCase() === "URGENTE" && (b.prioridade || "").toUpperCase() !== "URGENTE") {
        return -1;
      }
      if ((b.prioridade || "").toUpperCase() === "URGENTE" && (a.prioridade || "").toUpperCase() !== "URGENTE") {
        return 1;
      }

      if (filtro === FILTRO_FINALIZADAS) {
        return ob - oa;
      }

      return oa - ob;
    });
  }, [servicos, filtro, busca]);

  function limparFiltros() {
    setFiltro(FILTRO_INICIAL);
    setBusca("");
    sessionStorage.removeItem(TECNICO_FILTER_STORAGE_KEY);
  }

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6">Carregando...</div>;

  return (
    <div className="space-y-5 bg-[#f3f8ff] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Área técnica</p>
            <h1 className="text-2xl font-extrabold text-slate-900">Painel do Técnico</h1>
            {loadingFresh && <p className="text-xs font-semibold text-sky-700">Atualizando lista...</p>}
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

        {(filtro !== FILTRO_INICIAL || busca.trim()) && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={limparFiltros}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {listaFiltrada.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Nenhum serviço encontrado.
          </p>
        )}

        <div className="space-y-3">
          {listaFiltrada.map((s) => {
            const status = normalizeStatus(s.status);
            const telefoneHref = s.telefone ? `tel:${String(s.telefone).replace(/\s+/g, "")}` : "";
            const gpsHref = s.endereco
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.endereco)}`
              : "";
            const descricaoInicial = String(s.detalhamento || "").trim();
            const deslocamentoIniciado = Boolean(s.data_inicio_deslocamento && !s.data_fim_deslocamento);
            return (
              <div
                key={s._id}
                role="button"
                tabIndex={0}
                className="rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                onClick={() => router.push(`/tecnico/servicos/${s._id}?returnTo=/tecnico`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/tecnico/servicos/${s._id}?returnTo=/tecnico`);
                  }
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-extrabold">{s.osNumero || "Sem OS"}</p>
                    <p className="text-sm font-semibold text-slate-700">{s.cliente || "Sem cliente"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(status)}`}>
                    {statusLabel(status)}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                  <p>
                    <b>Solicitante:</b> {s.solicitante_nome || "-"}
                  </p>
                  <p>
                    <b>Tipo:</b> {s.tipo_manutencao || "-"}
                  </p>
                  <p>
                    <b>Prioridade:</b>{" "}
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${priorityBadgeClass(s.prioridade)}`}>
                      {priorityLabel(s.prioridade)}
                    </span>
                  </p>
                  <p>
                    <b>Abertura:</b> {formatDate(s.data_abertura)}
                  </p>
                  <p>
                    <b>Início:</b> {formatDate(s.data_inicio_atendimento)}
                  </p>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <b>Descrição inicial:</b> {descricaoInicial || "Sem descrição informada"}
                </div>

                {(gpsHref || telefoneHref) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {gpsHref && (
                      <a
                        href={gpsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MapPinned size={14} />
                        Endereço
                      </a>
                    )}
                    {telefoneHref && (
                      <a
                        href={telefoneHref}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone size={14} />
                        Cliente
                      </a>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/tecnico/servicos/${s._id}?returnTo=/tecnico`);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <Eye size={15} />
                    Preview
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      mudarDeslocamento(s._id, deslocamentoIniciado ? "finalizar" : "iniciar");
                    }}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white ${
                      deslocamentoIniciado ? "bg-amber-600 hover:bg-amber-700" : "bg-amber-500 hover:bg-amber-600"
                    }`}
                  >
                    <CarFront size={15} />
                    {deslocamentoIniciado ? "Finalizar deslocamento" : "Iniciar deslocamento"}
                  </button>

                  {status === STATUS.ABERTA && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        mudarStatus(s._id, "iniciar");
                      }}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                    >
                      Iniciar atendimento
                    </button>
                  )}

                  {status === STATUS.EM_ATENDIMENTO && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        mudarStatus(s._id, "pausar");
                      }}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                    >
                      Pausar
                    </button>
                  )}

                  {status === STATUS.PAUSADA && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        mudarStatus(s._id, "retomar");
                      }}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                    >
                      Retomar
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/tecnico/servicos/${s._id}?returnTo=/tecnico`);
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Ver detalhes
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
