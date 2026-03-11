"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { PRIORIDADES, TIPO_MANUTENCAO } from "@/app/lib/os";

type ClienteSugestao = {
  _id: string;
  cliente?: string;
  subcliente?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  marca?: string;
  unidade?: string;
  phone_e164?: string;
  address_full?: string;
};

type Tecnico = {
  _id: string;
  nome: string;
  telefone?: string;
};

type EquipamentoCatalogo = {
  _id: string;
  nome: string;
  fabricante?: string;
  modelo?: string;
  numero_serie?: string;
  patrimonio?: string;
  especificacoes_tecnicas?: string;
};

type SolicitanteVinculado = {
  _id: string;
  nome: string;
  cliente: string;
  subcliente?: string;
  unidade?: string;
  marca?: string;
  telefone?: string;
  email?: string;
  cargo?: string;
};

export default function NovaOSPage() {
  const router = useRouter();

  const [cliente, setCliente] = useState("");
  const [subcliente, setSubcliente] = useState("");
  const [clientesDB, setClientesDB] = useState<ClienteSugestao[]>([]);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [buscaClientesLoading, setBuscaClientesLoading] = useState(false);
  const [buscaClientesErro, setBuscaClientesErro] = useState("");
  const [clientesCarregados, setClientesCarregados] = useState(false);

  const [solicitanteNome, setSolicitanteNome] = useState("");
  const [solicitantesVinculados, setSolicitantesVinculados] = useState<SolicitanteVinculado[]>([]);
  const [solicitanteVinculadoId, setSolicitanteVinculadoId] = useState("");
  const [salvandoSolicitante, setSalvandoSolicitante] = useState(false);
  const [tipoManutencao, setTipoManutencao] = useState<(typeof TIPO_MANUTENCAO)[number]>("CORRETIVA");
  const [abaPreventiva, setAbaPreventiva] = useState<"dados" | "catalogo">("dados");

  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [marca, setMarca] = useState("");
  const [unidade, setUnidade] = useState("");
  const [detalhamento, setDetalhamento] = useState("");
  const [prioridade, setPrioridade] = useState<(typeof PRIORIDADES)[number]>("MEDIA");
  const [fotoProblema, setFotoProblema] = useState<File | null>(null);

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tecnicoId, setTecnicoId] = useState("");
  const [catalogoEquipamentos, setCatalogoEquipamentos] = useState<EquipamentoCatalogo[]>([]);
  const [equipamentoCatalogoId, setEquipamentoCatalogoId] = useState("");
  const [equipamentoNome, setEquipamentoNome] = useState("");
  const [equipamentoFabricante, setEquipamentoFabricante] = useState("");
  const [equipamentoModelo, setEquipamentoModelo] = useState("");
  const [equipamentoNumeroSerie, setEquipamentoNumeroSerie] = useState("");
  const [equipamentoPatrimonio, setEquipamentoPatrimonio] = useState("");
  const [equipamentoEspecificacoes, setEquipamentoEspecificacoes] = useState("");
  const [orcamentoPrevisto, setOrcamentoPrevisto] = useState("");

  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef("");

  const isDASA = cliente.trim().toLowerCase() === "dasa";

  useEffect(() => {
    apiFetch("/auth/tecnicos")
      .then((data) => setTecnicos(Array.isArray(data) ? (data as Tecnico[]) : []))
      .catch(() => setTecnicos([]));

    apiFetch("/clientes")
      .then((data) => {
        setClientesDB(Array.isArray(data) ? dedupeClientes(data as ClienteSugestao[]) : []);
        setClientesCarregados(true);
      })
      .catch(() => {
        setClientesDB([]);
        setClientesCarregados(false);
      });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (tipoManutencao !== "PREVENTIVA") return;
    apiFetch("/catalog/equipamentos")
      .then((data) => setCatalogoEquipamentos(Array.isArray(data) ? (data as EquipamentoCatalogo[]) : []))
      .catch(() => setCatalogoEquipamentos([]));
  }, [tipoManutencao]);

  useEffect(() => {
    carregarSolicitantesVinculados(cliente, subcliente);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente, subcliente, unidade, marca]);

  async function carregarClientes(nome: string) {
    const query = nome.trim();
    if (query.length < 2) {
      setBuscaClientesErro("");
      setBuscaClientesLoading(false);
      return;
    }

    lastQueryRef.current = query;
    setBuscaClientesErro("");

    if (clientesCarregados) {
      return;
    }

    setBuscaClientesLoading(true);

    try {
      const data = await apiFetch(`/clients/suggest?q=${encodeURIComponent(query)}&limit=20`);
      if (lastQueryRef.current !== query) return;
      setClientesDB(Array.isArray(data) ? dedupeClientes(data as ClienteSugestao[]) : []);
    } catch (err: unknown) {
      if (lastQueryRef.current !== query) return;
      setClientesDB([]);
      setBuscaClientesErro(err instanceof Error ? err.message : "Erro ao buscar clientes");
    } finally {
      if (lastQueryRef.current === query) {
        setBuscaClientesLoading(false);
      }
    }
  }

  async function carregarSolicitantesVinculados(clienteValor: string, subclienteValor: string) {
    const clienteTrim = clienteValor.trim();
    if (!clienteTrim) {
      setSolicitantesVinculados([]);
      setSolicitanteVinculadoId("");
      return;
    }

    const clienteEhDasa = clienteTrim.toLowerCase() === "dasa";
    try {
      const data = await apiFetch(
        `/solicitantes/vinculados?cliente=${encodeURIComponent(clienteTrim)}&subcliente=${encodeURIComponent(
          clienteEhDasa ? "" : (subclienteValor || "").trim()
        )}&unidade=${encodeURIComponent(clienteEhDasa ? (unidade || "").trim() : "")}&marca=${encodeURIComponent(
          clienteEhDasa ? (marca || "").trim() : ""
        )}&limit=100`
      );
      const lista = Array.isArray(data) ? (data as SolicitanteVinculado[]) : [];
      setSolicitantesVinculados(lista);
      if (!lista.some((s) => s._id === solicitanteVinculadoId)) {
        setSolicitanteVinculadoId("");
      }
    } catch {
      setSolicitantesVinculados([]);
      setSolicitanteVinculadoId("");
    }
  }

  function selecionarClienteDB(c: ClienteSugestao) {
    setCliente(c.cliente || "");
    setSubcliente(c.subcliente || "");
    setEndereco(c.endereco || "");
    setTelefone(c.phone_e164 || c.telefone || "");
    setEmail(c.email || "");
    setMarca(c.marca || "");
    setUnidade(c.unidade || "");
    setClientesDB([]);
    setBuscaClientesErro("");
    setMostrarLista(false);
    carregarSolicitantesVinculados(c.cliente || "", c.subcliente || "");
  }

  const clientesFiltrados = cliente.trim().length < 2
    ? []
    : dedupeClientes(
        clientesDB.filter((item) => {
          const termo = cliente.trim().toLowerCase();
          const texto = `${item.cliente || ""} ${item.subcliente || ""} ${item.unidade || ""} ${item.marca || ""}`.toLowerCase();
          return texto.includes(termo);
        })
      ).slice(0, 20);

  function selecionarSolicitanteVinculado(id: string) {
    setSolicitanteVinculadoId(id);
    const item = solicitantesVinculados.find((s) => s._id === id);
    if (!item) return;
    setSolicitanteNome(item.nome || "");
    if (item.telefone) setTelefone(item.telefone);
    if (item.email) setEmail(item.email);
  }

  async function vincularSolicitanteAtual() {
    const clienteAtual = cliente.trim();
    const nomeAtual = solicitanteNome.trim();

    if (!clienteAtual) {
      alert("Selecione o cliente antes de vincular solicitante");
      return;
    }
    if (!nomeAtual) {
      alert("Informe o nome do solicitante para vincular");
      return;
    }

    setSalvandoSolicitante(true);
    try {
      const salvo = (await apiFetch("/solicitantes/vinculados", {
        method: "POST",
        body: JSON.stringify({
          nome: nomeAtual,
          cliente: clienteAtual,
          subcliente: (subcliente || "").trim(),
          unidade: isDASA ? (unidade || "").trim() : "",
          marca: isDASA ? (marca || "").trim() : "",
          telefone: (telefone || "").trim(),
          email: (email || "").trim(),
        }),
      })) as SolicitanteVinculado;

      await carregarSolicitantesVinculados(clienteAtual, subcliente);
      if (salvo?._id) setSolicitanteVinculadoId(salvo._id);
      alert("Solicitante vinculado com sucesso.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao vincular solicitante");
    } finally {
      setSalvandoSolicitante(false);
    }
  }

  function selecionarEquipamento(id: string) {
    setEquipamentoCatalogoId(id);
    const eq = catalogoEquipamentos.find((item) => item._id === id);
    if (!eq) return;
    setEquipamentoNome(eq.nome || "");
    setEquipamentoFabricante(eq.fabricante || "");
    setEquipamentoModelo(eq.modelo || "");
    setEquipamentoNumeroSerie(eq.numero_serie || "");
    setEquipamentoPatrimonio(eq.patrimonio || "");
    setEquipamentoEspecificacoes(eq.especificacoes_tecnicas || "");
  }

  async function salvarOS() {
    if (!cliente || !tecnicoId || !solicitanteNome) {
      alert("Cliente, técnico e solicitante são obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const tecnicoSelecionado = tecnicos.find((t) => t._id === tecnicoId);
      const formData = new FormData();
      formData.append("cliente", cliente);
      formData.append("subcliente", isDASA ? "" : subcliente);
      formData.append("endereco", endereco);
      formData.append("telefone", telefone);
      formData.append("email", email);
      formData.append("marca", isDASA ? marca : "");
      formData.append("unidade", isDASA ? unidade : "");
      formData.append("detalhamento", detalhamento);
      formData.append("tecnicoId", tecnicoId);
      formData.append("solicitante_nome", solicitanteNome);
      formData.append("tipo_manutencao", tipoManutencao);
      formData.append("prioridade", prioridade);
      formData.append("equipamento_catalogo_id", tipoManutencao === "PREVENTIVA" ? equipamentoCatalogoId : "");
      formData.append("equipamento_nome", tipoManutencao === "PREVENTIVA" ? equipamentoNome : "");
      formData.append("equipamento_fabricante", tipoManutencao === "PREVENTIVA" ? equipamentoFabricante : "");
      formData.append("equipamento_modelo", tipoManutencao === "PREVENTIVA" ? equipamentoModelo : "");
      formData.append("equipamento_numero_serie", tipoManutencao === "PREVENTIVA" ? equipamentoNumeroSerie : "");
      formData.append("equipamento_patrimonio", tipoManutencao === "PREVENTIVA" ? equipamentoPatrimonio : "");
      formData.append("equipamento_especificacoes", tipoManutencao === "PREVENTIVA" ? equipamentoEspecificacoes : "");
      formData.append("orcamento_previsto", tipoManutencao === "PREVENTIVA" ? orcamentoPrevisto : "");
      if (fotoProblema) formData.append("foto", fotoProblema);

      const res = await apiFetch("/projects/admin/create", {
        method: "POST",
        body: formData,
      });

      if (tecnicoSelecionado?.telefone && res?.osNumero) {
        localStorage.setItem(
          "whatsapp-pendente",
          JSON.stringify({
            telefone: tecnicoSelecionado.telefone,
            mensagem: `Olá! Você recebeu uma nova OS ${res.osNumero} para o cliente ${cliente}.`,
          })
        );
      }

      router.push("/admin");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao salvar OS");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold">Nova Ordem de Serviço</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
          >
            Voltar
          </button>
        </div>

        {tipoManutencao === "PREVENTIVA" && (
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setAbaPreventiva("dados")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${abaPreventiva === "dados" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              Dados da OS
            </button>
            <button
              type="button"
              onClick={() => setAbaPreventiva("catalogo")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${abaPreventiva === "catalogo" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              Catálogo / Orçamento
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {(tipoManutencao !== "PREVENTIVA" || abaPreventiva === "dados") && (
            <>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold">Cliente</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              placeholder="Digite o cliente"
              value={cliente}
              onChange={(e) => {
                const v = e.target.value;
                setCliente(v);
                setSubcliente("");
                setEndereco("");
                setTelefone("");
                setMarca("");
                setUnidade("");
                setBuscaClientesErro("");

                const query = v.trim();
                if (debounceRef.current) clearTimeout(debounceRef.current);
                if (query.length >= 2) {
                  setMostrarLista(true);
                  debounceRef.current = setTimeout(() => {
                    carregarClientes(query);
                  }, 300);
                } else {
                  setMostrarLista(false);
                  setClientesDB([]);
                  setBuscaClientesLoading(false);
                }
              }}
              onBlur={() => {
                setTimeout(() => setMostrarLista(false), 150);
              }}
              onFocus={() => {
                if (cliente.trim().length >= 2) setMostrarLista(true);
              }}
            />
          </label>

          {mostrarLista && (buscaClientesLoading || clientesFiltrados.length > 0 || Boolean(buscaClientesErro)) && (
            <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white sm:col-span-2">
              {buscaClientesLoading && (
                <p className="px-3 py-2 text-sm text-slate-500">Buscando clientes...</p>
              )}
              {!buscaClientesLoading && buscaClientesErro && (
                <p className="px-3 py-2 text-sm text-rose-600">{buscaClientesErro}</p>
              )}
              {clientesFiltrados.map((c, idx) => (
                <button
                  type="button"
                  key={c._id || `${c.cliente || "cliente"}-${c.subcliente || "subcliente"}-${idx}`}
                  onClick={() => selecionarClienteDB(c)}
                  className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <b>{c.cliente}</b>
                  {c.cliente?.toLowerCase() === "dasa"
                    ? ` - Unidade: ${c.unidade || "-"} | Marca: ${c.marca || "-"}`
                    : c.subcliente
                    ? ` - ${c.subcliente}`
                    : ""}
                </button>
              ))}
              {!buscaClientesLoading && !buscaClientesErro && clientesFiltrados.length === 0 && (
                <p className="px-3 py-2 text-sm text-slate-500">Nenhum cliente encontrado.</p>
              )}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Solicitante</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              placeholder="Nome de quem solicitou"
              value={solicitanteNome}
              onChange={(e) => setSolicitanteNome(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Solicitante vinculado</span>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              value={solicitanteVinculadoId}
              onChange={(e) => selecionarSolicitanteVinculado(e.target.value)}
            >
              <option value="">Selecionar da empresa/unidade</option>
              {solicitantesVinculados.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={vincularSolicitanteAtual}
              disabled={salvandoSolicitante}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
            >
              {salvandoSolicitante ? "Vinculando..." : "Vincular solicitante nesta empresa"}
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Tipo de manutenção</span>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              value={tipoManutencao}
              onChange={(e) => setTipoManutencao(e.target.value as (typeof TIPO_MANUTENCAO)[number])}
            >
              {TIPO_MANUTENCAO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Prioridade</span>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as (typeof PRIORIDADES)[number])}
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          {!isDASA && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold">Subcliente</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                value={subcliente}
                onChange={(e) => setSubcliente(e.target.value)}
              />
            </label>
          )}

          {isDASA && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Unidade</span>
                <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" value={unidade} readOnly />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Marca</span>
                <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" value={marca} readOnly />
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Endereço</span>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Telefone</span>
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Email</span>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold">Detalhamento</span>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              rows={4}
              value={detalhamento}
              onChange={(e) => setDetalhamento(e.target.value)}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold">Foto do problema (opcional)</span>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              onChange={(e) => setFotoProblema(e.target.files?.[0] || null)}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold">Técnico responsável</span>
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5" value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
              <option value="">Selecione o técnico</option>
              {tecnicos.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
            </>
          )}

          {tipoManutencao === "PREVENTIVA" && abaPreventiva === "catalogo" && (
            <>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold">Equipamento do catálogo</span>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  value={equipamentoCatalogoId}
                  onChange={(e) => selecionarEquipamento(e.target.value)}
                >
                  <option value="">Selecione um equipamento</option>
                  {catalogoEquipamentos.map((eq) => (
                    <option key={eq._id} value={eq._id}>
                      {eq.nome} {eq.fabricante ? `- ${eq.fabricante}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Nome do equipamento" value={equipamentoNome} onChange={(e) => setEquipamentoNome(e.target.value)} />
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Fabricante" value={equipamentoFabricante} onChange={(e) => setEquipamentoFabricante(e.target.value)} />
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Modelo" value={equipamentoModelo} onChange={(e) => setEquipamentoModelo(e.target.value)} />
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Número de série" value={equipamentoNumeroSerie} onChange={(e) => setEquipamentoNumeroSerie(e.target.value)} />
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 sm:col-span-2" placeholder="Patrimônio / TAG" value={equipamentoPatrimonio} onChange={(e) => setEquipamentoPatrimonio(e.target.value)} />
              <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2.5 sm:col-span-2" rows={4} placeholder="Especificações técnicas" value={equipamentoEspecificacoes} onChange={(e) => setEquipamentoEspecificacoes(e.target.value)} />
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 sm:col-span-2" placeholder="Orçamento previsto" value={orcamentoPrevisto} onChange={(e) => setOrcamentoPrevisto(e.target.value)} />
            </>
          )}
        </div>

        <button
          onClick={salvarOS}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Salvar OS"}
        </button>
      </div>
    </div>
  );
}

function dedupeClientes(lista: ClienteSugestao[]) {
  const mapa = new Map<string, ClienteSugestao>();

  for (const item of lista) {
    const chave = [
      String(item.cliente || "").trim().toLowerCase(),
      String(item.subcliente || "").trim().toLowerCase(),
      String(item.unidade || "").trim().toLowerCase(),
      String(item.marca || "").trim().toLowerCase(),
    ].join("|");

    if (!chave.replace(/\|/g, "")) continue;
    if (!mapa.has(chave)) mapa.set(chave, item);
  }

  return Array.from(mapa.values());
}
