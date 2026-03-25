"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, downloadJsonFile } from "@/app/lib/api";

type Terceiro = {
  _id: string;
  nome: string;
  email: string;
  telefone?: string;
  cliente_vinculado?: string;
  subcliente_vinculado?: string;
  marca_vinculada?: string;
  unidade_vinculada?: string;
};

type ClienteItem = {
  _id: string;
  cliente?: string;
  subcliente?: string;
  marca?: string;
  unidade?: string;
};

function normalizeText(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isQaItem(value: string) {
  const normalized = normalizeText(value);
  return /(^|\s)q\.?\s*a(\s|$)/i.test(normalized);
}

function resolveSmartOption(query: string, options: string[]) {
  const q = normalizeText(query);
  if (!q) return "";
  const exact = options.find((item) => normalizeText(item) === q);
  if (exact) return exact;
  const startsWith = options.filter((item) => normalizeText(item).startsWith(q));
  if (startsWith.length === 1) return startsWith[0];
  return "";
}

export default function AdminTerceirosPage() {
  const router = useRouter();
  const [terceiros, setTerceiros] = useState<Terceiro[]>([]);
  const [clientesDb, setClientesDb] = useState<ClienteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [clienteVinculado, setClienteVinculado] = useState("");
  const [subclienteVinculado, setSubclienteVinculado] = useState("");
  const [marcaVinculada, setMarcaVinculada] = useState("");
  const [unidadeVinculada, setUnidadeVinculada] = useState("");
  const [clienteBusca, setClienteBusca] = useState("");
  const [subclienteBusca, setSubclienteBusca] = useState("");

  const isDasaVinculado = clienteVinculado.trim().toLowerCase() === "dasa";

  const clientesBaseOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of clientesDb) {
      if (!c.cliente) continue;
      if (isQaItem(c.cliente)) continue;
      set.add(c.cliente);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [clientesDb]);

  const clientesOptions = useMemo(() => {
    const filtro = normalizeText(clienteBusca);
    if (!filtro) return clientesBaseOptions;
    return clientesBaseOptions.filter((item) => normalizeText(item).includes(filtro));
  }, [clienteBusca, clientesBaseOptions]);

  const subclientesBaseOptions = useMemo(() => {
    if (!clienteVinculado || isDasaVinculado) return [];
    const set = new Set<string>();
    for (const c of clientesDb) {
      if (c.cliente !== clienteVinculado) continue;
      if (!c.subcliente) continue;
      if (isQaItem(c.subcliente)) continue;
      set.add(c.subcliente);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [clienteVinculado, clientesDb, isDasaVinculado]);

  const subclientesOptions = useMemo(() => {
    const filtro = normalizeText(subclienteBusca);
    if (!filtro) return subclientesBaseOptions;
    return subclientesBaseOptions.filter((item) => normalizeText(item).includes(filtro));
  }, [subclienteBusca, subclientesBaseOptions]);

  const dasaUnidadesOptions = useMemo(() => {
    if (!isDasaVinculado) return [];
    const set = new Set<string>();
    for (const c of clientesDb) {
      if (c.cliente === clienteVinculado && c.unidade) set.add(c.unidade);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [clienteVinculado, clientesDb, isDasaVinculado]);

  const dasaMarcasOptions = useMemo(() => {
    if (!isDasaVinculado) return [];
    const set = new Set<string>();
    for (const c of clientesDb) {
      if (c.cliente !== clienteVinculado) continue;
      if (unidadeVinculada && c.unidade !== unidadeVinculada) continue;
      if (c.marca) set.add(c.marca);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [clienteVinculado, clientesDb, isDasaVinculado, unidadeVinculada]);

  const terceirosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return terceiros;

    return terceiros.filter((t) => {
      const texto = `
        ${t.nome || ""}
        ${t.email || ""}
        ${t.telefone || ""}
        ${t.cliente_vinculado || ""}
        ${t.subcliente_vinculado || ""}
        ${t.marca_vinculada || ""}
        ${t.unidade_vinculada || ""}
      `.toLowerCase();
      return texto.includes(termo);
    });
  }, [terceiros, busca]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const [terceirosData, clientesData] = await Promise.all([
        apiFetch("/auth/terceiros"),
        apiFetch("/clientes")
      ]);
      setTerceiros(Array.isArray(terceirosData) ? (terceirosData as Terceiro[]) : []);
      setClientesDb(Array.isArray(clientesData) ? (clientesData as ClienteItem[]) : []);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setNome("");
    setEmail("");
    setTelefone("");
    setSenha("");
    setClienteVinculado("");
    setClienteBusca("");
    setSubclienteVinculado("");
    setSubclienteBusca("");
    setMarcaVinculada("");
    setUnidadeVinculada("");
  }

  function editarTerceiro(t: Terceiro) {
    setEditingId(t._id);
    setNome(t.nome || "");
    setEmail(t.email || "");
    setTelefone(t.telefone || "");
    setSenha("");
    setClienteVinculado(t.cliente_vinculado || "");
    setClienteBusca(t.cliente_vinculado || "");
    setSubclienteVinculado(t.subcliente_vinculado || "");
    setSubclienteBusca(t.subcliente_vinculado || "");
    setMarcaVinculada(t.marca_vinculada || "");
    setUnidadeVinculada(t.unidade_vinculada || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar() {
    if (!nome.trim() || !email.trim()) {
      alert("Nome e email sao obrigatorios");
      return;
    }
    if (!clienteVinculado.trim()) {
      alert("Cliente vinculado obrigatorio para o terceiro abrir OS");
      return;
    }
    if (!editingId && !senha.trim()) {
      alert("Senha inicial obrigatoria para novo terceiro");
      return;
    }

    if (!isDasaVinculado && !subclienteVinculado.trim()) {
      alert("Subcliente vinculado obrigatorio para cliente normal");
      return;
    }

    if (isDasaVinculado && (!marcaVinculada.trim() || !unidadeVinculada.trim())) {
      alert("Para cliente DASA, marca e unidade sao obrigatorias");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        cliente_vinculado: clienteVinculado.trim(),
        subcliente_vinculado: isDasaVinculado ? "" : subclienteVinculado.trim(),
        marca_vinculada: isDasaVinculado ? marcaVinculada.trim() : "",
        unidade_vinculada: isDasaVinculado ? unidadeVinculada.trim() : ""
      };

      if (editingId) {
        await apiFetch(`/auth/terceiros/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        alert("Terceiro atualizado com sucesso");
      } else {
        await apiFetch("/auth/terceiros", {
          method: "POST",
          body: JSON.stringify({ ...payload, senha: senha.trim() })
        });
        alert("Terceiro cadastrado com sucesso");
      }

      resetForm();
      await carregar();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao salvar terceiro");
    } finally {
      setSalvando(false);
    }
  }

  async function desvincular(t: Terceiro) {
    try {
      await apiFetch(`/auth/terceiros/${t._id}`, {
        method: "PUT",
        body: JSON.stringify({
          nome: t.nome,
          email: t.email,
          telefone: t.telefone || "",
          cliente_vinculado: "",
          subcliente_vinculado: "",
          marca_vinculada: "",
          unidade_vinculada: ""
        })
      });
      await carregar();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao remover vinculo");
    }
  }

  async function excluir(id: string) {
    const ok = confirm("Deseja excluir este terceiro?");
    if (!ok) return;
    try {
      await apiFetch(`/auth/terceiros/${id}`, { method: "DELETE" });
      if (editingId === id) resetForm();
      await carregar();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir terceiro");
    }
  }

  function copiarLink() {
    const link = `${window.location.origin}/login`;
    navigator.clipboard.writeText(link).then(
      () => alert(`Link copiado: ${link}`),
      () => alert(`Nao foi possivel copiar automaticamente. Link: ${link}`)
    );
  }

  async function baixarTerceiros() {
    try {
      const data = await apiFetch("/auth/terceiros/export/all");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadJsonFile(data, `terceiros-completo-${stamp}.json`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao baixar terceiros");
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold text-slate-900">
            {editingId ? "Editar Terceiro" : "Cadastro de Terceiro"}
          </h2>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
          >
            Voltar
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Cliente vinculado e obrigatorio. Cliente normal usa subcliente. Cliente DASA usa marca e unidade.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2.5"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            className="rounded-xl border border-slate-200 px-3 py-2.5"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="rounded-xl border border-slate-200 px-3 py-2.5"
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
          {!editingId && (
            <input
              type="password"
              className="rounded-xl border border-slate-200 px-3 py-2.5"
              placeholder="Senha inicial"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          )}

          <input
            list="clientes-vinculo-options"
            className="rounded-xl border border-slate-200 px-3 py-2.5"
            placeholder="Cliente vinculado obrigatorio"
            value={clienteBusca}
            onChange={(e) => {
              const valor = e.target.value;
              setClienteBusca(valor);
              const selecionado = resolveSmartOption(valor, clientesBaseOptions);
              setClienteVinculado(selecionado);
              setSubclienteVinculado("");
              setSubclienteBusca("");
              setMarcaVinculada("");
              setUnidadeVinculada("");
            }}
          />
          <datalist id="clientes-vinculo-options">
            {clientesOptions.map((cliente) => (
              <option key={cliente} value={cliente}>
                {cliente}
              </option>
            ))}
          </datalist>

          {!isDasaVinculado && (
            <>
              <input
                list="subclientes-vinculo-options"
                className="rounded-xl border border-slate-200 px-3 py-2.5"
                placeholder="Subcliente vinculado obrigatorio"
                value={subclienteBusca}
                onChange={(e) => {
                  const valor = e.target.value;
                  setSubclienteBusca(valor);
                  const selecionado = resolveSmartOption(valor, subclientesBaseOptions);
                  setSubclienteVinculado(selecionado);
                }}
                disabled={!clienteVinculado}
              />
              <datalist id="subclientes-vinculo-options">
                {subclientesOptions.map((subcliente) => (
                  <option key={subcliente} value={subcliente}>
                    {subcliente}
                  </option>
                ))}
              </datalist>
            </>
          )}

          {isDasaVinculado && (
            <>
              <select
                className="rounded-xl border border-slate-200 px-3 py-2.5"
                value={unidadeVinculada}
                onChange={(e) => {
                  const unidade = e.target.value;
                  setUnidadeVinculada(unidade);
                  const registro = clientesDb.find((c) => c.cliente === clienteVinculado && c.unidade === unidade);
                  if (registro?.marca) setMarcaVinculada(registro.marca);
                }}
              >
                <option value="">Selecione unidade DASA</option>
                {dasaUnidadesOptions.map((unidade) => (
                  <option key={unidade} value={unidade}>
                    {unidade}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-200 px-3 py-2.5"
                value={marcaVinculada}
                onChange={(e) => setMarcaVinculada(e.target.value)}
              >
                <option value="">Selecione marca DASA</option>
                {dasaMarcasOptions.map((marca) => (
                  <option key={marca} value={marca}>
                    {marca}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={salvar}
            disabled={salvando}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {salvando ? "Salvando..." : editingId ? "Salvar alteracoes" : "Cadastrar Terceiro"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Cancelar edicao
            </button>
          )}
          <button
            onClick={copiarLink}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Copiar Link de Acesso
          </button>
          <button
            onClick={baixarTerceiros}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
          >
            Baixar terceiros
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">Terceiros cadastrados</h3>
        <input
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5"
          placeholder="Buscar por nome, email, telefone ou cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {loading && <p className="mt-3 text-sm text-slate-500">Carregando...</p>}
        {!loading && terceirosFiltrados.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">Nenhum terceiro cadastrado.</p>
        )}
        <div className="mt-3 space-y-2">
          {terceirosFiltrados.map((t) => (
            <div key={t._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
              <div>
                <p className="font-bold text-slate-800">{t.nome}</p>
                <p className="text-sm text-slate-600">{t.email}</p>
                <p className="text-sm text-slate-500">{t.telefone || "Sem telefone"}</p>
                <p className="text-sm text-slate-500">Cliente vinculado: {t.cliente_vinculado || "-"}</p>
                {String(t.cliente_vinculado || "").toLowerCase() === "dasa" ? (
                  <>
                    <p className="text-sm text-slate-500">Unidade vinculada: {t.unidade_vinculada || "-"}</p>
                    <p className="text-sm text-slate-500">Marca vinculada: {t.marca_vinculada || "-"}</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Subcliente vinculado: {t.subcliente_vinculado || "-"}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => editarTerceiro(t)}
                  className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800"
                >
                  Editar
                </button>
                <button
                  onClick={() => desvincular(t)}
                  className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-700"
                >
                  Remover vinculo
                </button>
                <button
                  onClick={() => excluir(t._id)}
                  className="rounded-xl bg-rose-700 px-3 py-2 text-sm font-bold text-white hover:bg-rose-800"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
