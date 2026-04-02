"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, FileText, Loader2, LogOut, Plus, RefreshCcw } from "lucide-react";
import { API_URL, apiFetch } from "@/app/lib/api";
import { formatDate, normalizeStatus, statusLabel, STATUS } from "@/app/lib/os";

type OSItem = {
  _id?: string;
  id?: string;
  osNumero?: string;
  cliente?: string;
  subcliente?: string;
  Subcliente?: string;
  unidade?: string;
  marca?: string;
  detalhamento?: string;
  solicitante_nome?: string;
  tipo_manutencao?: string;
  status?: string;
  data_abertura?: string;
  createdAt?: string;
  data_finalizacao_tecnico?: string | null;
  data_validacao_admin?: string | null;
  tecnico?: { nome?: string } | string | null;
  tecnicoNome?: string;
  antes?: {
    relatorio?: string;
    observacao?: string;
    fotos?: string[];
  } | null;
  depois?: {
    relatorio?: string;
    observacao?: string;
    fotos?: string[];
  } | null;
};

type FiltroTab = "todas" | "abertas" | "concluidas";

const TERCEIRO_CACHE_KEY = "terceiro-dashboard-cache";

export default function TerceiroPage() {
  const router = useRouter();
  const [solicitanteNome, setSolicitanteNome] = useState("");
  const [detalhamento, setDetalhamento] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [cliente, setCliente] = useState("");
  const [subcliente, setSubcliente] = useState("");
  const [marca, setMarca] = useState("");
  const [unidade, setUnidade] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [lista, setLista] = useState<OSItem[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState("");
  const [tab, setTab] = useState<FiltroTab>("todas");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "terceiro" && role !== "cliente") {
      router.replace("/login");
      return;
    }

    const nome = localStorage.getItem("nome") || "";
    if (nome) setSolicitanteNome(nome);
    setCliente(localStorage.getItem("cliente_vinculado") || "");
    setSubcliente(localStorage.getItem("subcliente_vinculado") || "");
    setMarca(localStorage.getItem("marca_vinculada") || "");
    setUnidade(localStorage.getItem("unidade_vinculada") || "");
    setEndereco(localStorage.getItem("endereco_vinculado") || "");
    setTelefone(localStorage.getItem("telefone") || "");
    setEmail(localStorage.getItem("email") || "");

    try {
      const cached = sessionStorage.getItem(TERCEIRO_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as OSItem[];
        if (Array.isArray(parsed)) {
          setLista(parsed);
          setCarregandoLista(false);
        }
      }
    } catch {
      // noop
    }
    carregarDadosVinculados();
    carregarOS();
  }, [router]);

  async function carregarDadosVinculados() {
    try {
      const data = (await apiFetch("/clientes/vinculado/me")) as {
        solicitante_nome?: string;
        cliente?: string;
        subcliente?: string;
        marca?: string;
        unidade?: string;
        endereco?: string;
        telefone?: string;
        email?: string;
      };

      if (data.solicitante_nome) {
        setSolicitanteNome(data.solicitante_nome);
        localStorage.setItem("nome", data.solicitante_nome);
      }
      if (data.cliente) {
        setCliente(data.cliente);
        localStorage.setItem("cliente_vinculado", data.cliente);
      }
      if (data.subcliente) {
        setSubcliente(data.subcliente);
        localStorage.setItem("subcliente_vinculado", data.subcliente);
      }
      if (data.marca) {
        setMarca(data.marca);
        localStorage.setItem("marca_vinculada", data.marca);
      }
      if (data.unidade) {
        setUnidade(data.unidade);
        localStorage.setItem("unidade_vinculada", data.unidade);
      }
      if (data.endereco) {
        setEndereco(data.endereco);
        localStorage.setItem("endereco_vinculado", data.endereco);
      }
      if (data.telefone) {
        setTelefone(data.telefone);
        localStorage.setItem("telefone", data.telefone);
      }
      if (data.email) {
        setEmail(data.email);
        localStorage.setItem("email", data.email);
      }
    } catch {
      // noop
    }
  }

  async function carregarOS() {
    try {
      setErroLista("");
      setCarregandoLista(true);
      const data = await apiFetch("/projects/terceiro/my");
      const itens = Array.isArray(data) ? (data as OSItem[]) : [];
      setLista(itens);
      sessionStorage.setItem(TERCEIRO_CACHE_KEY, JSON.stringify(itens));
    } catch (err: unknown) {
      setErroLista(err instanceof Error ? err.message : "Erro ao carregar ordens de serviço");
    } finally {
      setCarregandoLista(false);
    }
  }

  async function solicitarOS() {
    if (!solicitanteNome.trim() || !detalhamento.trim()) {
      alert("Preencha solicitante e descrição");
      return;
    }

    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("cliente", cliente || "Cliente avulso");
      formData.append("subcliente", subcliente);
      formData.append("marca", marca);
      formData.append("unidade", unidade);
      formData.append("endereco", endereco);
      formData.append("telefone", telefone);
      formData.append("email", email);
      formData.append("solicitante_nome", solicitanteNome.trim());
      formData.append("detalhamento", detalhamento.trim());
      if (foto) formData.append("foto", foto);

      await apiFetch("/projects/open", { method: "POST", body: formData });
      alert("Solicitação enviada para o admin.");
      setDetalhamento("");
      setFoto(null);
      setMostrarFormulario(false);
      await carregarOS();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao solicitar OS");
    } finally {
      setEnviando(false);
    }
  }

  async function baixarPDF(os: OSItem) {
    const osId = os._id || os.id;
    if (!osId) return;

    try {
      setBaixandoId(osId);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/os/${osId}/report?variant=client&force=true`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });

      if (!res.ok) {
        const raw = await res.text();
        throw new Error(raw || "Erro ao baixar PDF");
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
      alert(err instanceof Error ? err.message : "Erro ao baixar PDF");
    } finally {
      setBaixandoId(null);
    }
  }

  function sair() {
    localStorage.clear();
    sessionStorage.removeItem(TERCEIRO_CACHE_KEY);
    router.push("/login");
  }

  const contadores = useMemo(() => {
    let abertas = 0;
    let concluidas = 0;

    for (const os of lista) {
      if (normalizeStatus(os.status) === STATUS.VALIDADA_PELO_ADMIN) concluidas += 1;
      else abertas += 1;
    }

    return {
      total: lista.length,
      abertas,
      concluidas,
    };
  }, [lista]);

  const listaFiltrada = useMemo(() => {
    return lista.filter((os) => {
      const concluida = normalizeStatus(os.status) === STATUS.VALIDADA_PELO_ADMIN;
      if (tab === "abertas") return !concluida;
      if (tab === "concluidas") return concluida;
      return true;
    });
  }, [lista, tab]);

  return (
    <div className="min-h-screen bg-[#252421] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">Portal do cliente</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Minhas ordens de serviço</h1>
              <p className="mt-1 text-sm text-white/65">
                {cliente || "Cliente"}
                {subcliente || unidade ? ` — ${subcliente || unidade}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMostrarFormulario((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/12"
              >
                <Plus size={16} />
                Nova solicitação
              </button>
              <button
                type="button"
                onClick={carregarOS}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/12"
              >
                <RefreshCcw size={16} />
                Atualizar
              </button>
              <button
                type="button"
                onClick={sair}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-100 transition hover:bg-red-500/15"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <MetricCard titulo="Total" valor={contadores.total} />
            <MetricCard titulo="Abertas" valor={contadores.abertas} />
            <MetricCard titulo="Concluídas" valor={contadores.concluidas} />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <TabButton active={tab === "todas"} onClick={() => setTab("todas")}>Todas</TabButton>
            <TabButton active={tab === "abertas"} onClick={() => setTab("abertas")}>Abertas</TabButton>
            <TabButton active={tab === "concluidas"} onClick={() => setTab("concluidas")}>Concluídas</TabButton>
          </div>
        </section>

        {mostrarFormulario && (
          <section className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/80">Nova OS</p>
                <h2 className="text-xl font-bold text-white">Abrir solicitação para o admin</h2>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Empresa" value={cliente || "Cliente avulso"} disabled />
              <Field label="Unidade / Subcliente" value={subcliente || unidade || "-"} disabled />
              <Field label="Endereço" value={endereco || "-"} disabled />
              <Field label="Telefone" value={telefone || "-"} disabled />
              <Field label="Email" value={email || "-"} disabled />
              <Field label="Solicitante" value={solicitanteNome} onChange={setSolicitanteNome} placeholder="Nome do solicitante" />
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-white/80">Descrição</label>
                <textarea
                  rows={5}
                  className="w-full rounded-2xl border border-white/12 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-amber-300/40"
                  value={detalhamento}
                  onChange={(e) => setDetalhamento(e.target.value)}
                  placeholder="Descreva o que precisa ser feito"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-white/80">Foto do problema (opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full rounded-2xl border border-white/12 bg-black/15 px-4 py-3 text-sm text-white file:mr-3 file:rounded-xl file:border-0 file:bg-amber-300 file:px-3 file:py-2 file:font-bold file:text-[#2b271d]"
                  onChange={(e) => setFoto(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={solicitarOS}
              disabled={enviando}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-extrabold text-[#2b271d] transition hover:bg-amber-200 disabled:opacity-60"
            >
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {enviando ? "Enviando..." : "Enviar solicitação"}
            </button>
          </section>
        )}

        {erroLista && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {erroLista}
          </div>
        )}

        <section className="space-y-4">
          {carregandoLista ? (
            <div className="rounded-[28px] border border-white/10 bg-white/6 px-5 py-10 text-center text-white/75">
              Carregando ordens de serviço...
            </div>
          ) : listaFiltrada.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-white/6 px-5 py-10 text-center text-white/75">
              Nenhuma OS encontrada para este filtro.
            </div>
          ) : (
            listaFiltrada.map((os) => {
              const concluida = normalizeStatus(os.status) === STATUS.VALIDADA_PELO_ADMIN;
              const tecnicoNome =
                (typeof os.tecnico === "object" ? os.tecnico?.nome : os.tecnico) || os.tecnicoNome || "A definir";
              const osId = os._id || os.id || os.osNumero || "sem-id";
              const fotosTecnico = (os.depois?.fotos?.length || 0) + (os.antes?.fotos?.length || 0);

              return (
                <article
                  key={osId}
                  className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.16)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{os.tipo_manutencao || "Serviço"}</h2>
                      <p className="mt-1 text-sm font-semibold text-white/65">{os.osNumero || "Sem número"}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${concluida ? "bg-lime-500/20 text-lime-300" : "bg-amber-400/15 text-amber-200"}`}>
                      {concluida ? "Concluída" : statusLabel(os.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-2 text-sm text-white/78 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoLine label="Abertura" value={formatDate(os.data_abertura || os.createdAt)} />
                    <InfoLine label="Solicitante" value={os.solicitante_nome || "-"} />
                    <InfoLine label="Técnico" value={tecnicoNome} />
                    <InfoLine label="Validação" value={formatDate(os.data_validacao_admin)} />
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm text-white/82">
                    <p className="font-semibold text-white">Descrição</p>
                    <p className="mt-2 whitespace-pre-line text-white/72">{os.detalhamento || "-"}</p>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-white/72 sm:grid-cols-3">
                    <MiniStat label="Cliente" value={os.cliente || "-"} />
                    <MiniStat label="Local" value={os.subcliente || os.Subcliente || os.unidade || "-"} />
                    <MiniStat label="Fotos do técnico" value={String(fotosTecnico)} />
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/12 px-4 py-2.5 text-sm font-semibold text-white/70">
                      <FileText size={16} />
                      {concluida ? "OS validada pelo admin" : "OS em acompanhamento"}
                    </div>
                    <button
                      type="button"
                      disabled={!concluida || baixandoId === osId}
                      onClick={() => baixarPDF(os)}
                      className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 border-lime-400/25 bg-lime-400/10 text-lime-100 hover:bg-lime-400/15"
                    >
                      {baixandoId === osId ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                      {concluida ? "Baixar PDF" : "Disponível após validação"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/14 px-5 py-4">
      <p className="text-sm font-semibold text-white/65">{titulo}</p>
      <p className="mt-3 text-5xl font-extrabold tracking-tight text-white">{valor}</p>
    </div>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-5 py-3 text-sm font-bold transition ${
        active
          ? "border-white/15 bg-white text-[#252421]"
          : "border-white/15 bg-transparent text-white hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-white/80">{label}</span>
      <input
        className="w-full rounded-2xl border border-white/12 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-amber-300/40 disabled:text-white/60"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-semibold text-white">{label}:</span> {value}
    </p>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/12 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
