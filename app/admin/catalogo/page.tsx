"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

type Equip = {
  _id: string;
  nome: string;
  fabricante?: string;
  modelo?: string;
  estoque_qtd?: number;
  foto_base64?: string;
  numero_serie?: string;
  patrimonio?: string;
  especificacoes_tecnicas?: string;
  observacoes?: string;
};

export default function CatalogoPage() {
  const router = useRouter();
  const [lista, setLista] = useState<Equip[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [estoqueQtd, setEstoqueQtd] = useState("0");
  const [fotoBase64, setFotoBase64] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [patrimonio, setPatrimonio] = useState("");
  const [especificacoes, setEspecificacoes] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const data = await apiFetch("/catalog/equipamentos");
      setLista(Array.isArray(data) ? (data as Equip[]) : []);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao carregar catalogo");
    } finally {
      setLoading(false);
    }
  }

  function limpar() {
    setEditingId(null);
    setNome("");
    setFabricante("");
    setModelo("");
    setEstoqueQtd("0");
    setFotoBase64("");
    setNumeroSerie("");
    setPatrimonio("");
    setEspecificacoes("");
    setObservacoes("");
  }

  function editar(item: Equip) {
    setEditingId(item._id);
    setNome(item.nome || "");
    setFabricante(item.fabricante || "");
    setModelo(item.modelo || "");
    setEstoqueQtd(String(item.estoque_qtd ?? 0));
    setFotoBase64(item.foto_base64 || "");
    setNumeroSerie(item.numero_serie || "");
    setPatrimonio(item.patrimonio || "");
    setEspecificacoes(item.especificacoes_tecnicas || "");
    setObservacoes(item.observacoes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar() {
    if (!nome.trim()) {
      alert("Nome do equipamento e obrigatorio");
      return;
    }

    const payload = {
      nome: nome.trim(),
      fabricante: fabricante.trim(),
      modelo: modelo.trim(),
      estoque_qtd: Math.max(0, Number(estoqueQtd) || 0),
      foto_base64: fotoBase64,
      numero_serie: numeroSerie.trim(),
      patrimonio: patrimonio.trim(),
      especificacoes_tecnicas: especificacoes.trim(),
      observacoes: observacoes.trim()
    };

    try {
      if (editingId) {
        await apiFetch(`/catalog/equipamentos/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/catalog/equipamentos", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      limpar();
      await carregar();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao salvar equipamento");
    }
  }

  async function handleFotoChange(file: File | null) {
    if (!file) {
      setFotoBase64("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      setFotoBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  async function excluir(id: string) {
    const ok = confirm("Excluir este equipamento do catalogo?");
    if (!ok) return;
    try {
      await apiFetch(`/catalog/equipamentos/${id}`, { method: "DELETE" });
      await carregar();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir equipamento");
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold text-slate-900">
            {editingId ? "Editar equipamento" : "Novo equipamento no catalogo"}
          </h2>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
          >
            Voltar
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Nome*" value={nome} onChange={(e) => setNome(e.target.value)} />
          <input className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Fabricante" value={fabricante} onChange={(e) => setFabricante(e.target.value)} />
          <input className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} />
          <input className="rounded-xl border border-slate-200 px-3 py-2.5" type="number" min={0} placeholder="Quantidade em estoque" value={estoqueQtd} onChange={(e) => setEstoqueQtd(e.target.value)} />
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Foto oficial (opcional)</span>
            <input type="file" accept="image/*" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" onChange={(e) => handleFotoChange(e.target.files?.[0] || null)} />
          </label>
          {fotoBase64 && (
            <img
              src={`data:image/jpeg;base64,${fotoBase64}`}
              alt="Preview"
              className="h-32 w-32 rounded-xl border border-slate-200 object-cover"
            />
          )}
          <input className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Numero de serie" value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} />
          <input className="rounded-xl border border-slate-200 px-3 py-2.5 sm:col-span-2" placeholder="Patrimonio / TAG" value={patrimonio} onChange={(e) => setPatrimonio(e.target.value)} />
          <textarea className="rounded-xl border border-slate-200 px-3 py-2.5 sm:col-span-2" rows={4} placeholder="Especificacoes tecnicas" value={especificacoes} onChange={(e) => setEspecificacoes(e.target.value)} />
          <textarea className="rounded-xl border border-slate-200 px-3 py-2.5 sm:col-span-2" rows={3} placeholder="Observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={salvar} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
            {editingId ? "Salvar alteracoes" : "Adicionar ao catalogo"}
          </button>
          {editingId && (
            <button onClick={limpar} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
              Cancelar edicao
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">Catalogo preventivo</h3>
        {loading && <p className="mt-3 text-sm text-slate-500">Carregando...</p>}
        {!loading && lista.length === 0 && <p className="mt-3 text-sm text-slate-500">Nenhum equipamento no catalogo.</p>}
        <div className="mt-3 space-y-2">
          {lista.map((item) => (
            <div key={item._id} className="rounded-xl border border-slate-200 p-3">
              <p className="font-bold text-slate-900">{item.nome}</p>
              <p className="text-sm text-slate-600">{item.fabricante || "-"} | {item.modelo || "-"}</p>
              <p className="text-sm text-slate-600">Estoque: {item.estoque_qtd ?? 0}</p>
              <p className="text-sm text-slate-600">Serie: {item.numero_serie || "-"} | Patrimonio: {item.patrimonio || "-"}</p>
              {item.foto_base64 ? (
                <img
                  src={`data:image/jpeg;base64,${item.foto_base64}`}
                  alt={item.nome}
                  className="mt-2 h-28 w-28 rounded-lg border border-slate-200 object-cover"
                />
              ) : null}
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{item.especificacoes_tecnicas || "-"}</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => editar(item)} className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">Editar</button>
                <button onClick={() => excluir(item._id)} className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-800">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
