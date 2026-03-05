"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { normalizeStatus, STATUS } from "@/app/lib/os";

type OSTecnico = {
  osNumero?: string;
  status?: string;
};

type EquipamentoCatalogo = {
  _id: string;
  nome: string;
  fabricante?: string;
  modelo?: string;
  estoque_qtd?: number;
};

type MaterialSolicitado = {
  equipamento_catalogo_id?: string;
  nome: string;
  fabricante?: string;
  modelo?: string;
  quantidade: number;
  unidade: string;
  observacao?: string;
};

export default function AntesPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [os, setOs] = useState<OSTecnico | null>(null);
  const [relatorio, setRelatorio] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [catalogo, setCatalogo] = useState<EquipamentoCatalogo[]>([]);
  const [materialId, setMaterialId] = useState("");
  const [materialNomeLivre, setMaterialNomeLivre] = useState("");
  const [materialQuantidade, setMaterialQuantidade] = useState("1");
  const [materialUnidade, setMaterialUnidade] = useState("un");
  const [materialObs, setMaterialObs] = useState("");
  const [materiais, setMateriais] = useState<MaterialSolicitado[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarOS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarOS() {
    try {
      const [osData, catalogoData] = await Promise.all([
        apiFetch(`/projects/tecnico/view/${id}`),
        apiFetch("/catalog/equipamentos").catch(() => [])
      ]);
      const data = osData as OSTecnico & { materiais_solicitados?: MaterialSolicitado[] };
      const status = normalizeStatus(data.status);

      const bloqueada =
        status === STATUS.FINALIZADA_PELO_TECNICO ||
        status === STATUS.VALIDADA_PELO_ADMIN ||
        status === STATUS.CANCELADA;

      if (bloqueada) {
        router.replace(`/tecnico/servicos/${id}`);
        return;
      }

      setOs(data);
      setMateriais(Array.isArray(data.materiais_solicitados) ? data.materiais_solicitados : []);
      setCatalogo(Array.isArray(catalogoData) ? (catalogoData as EquipamentoCatalogo[]) : []);
    } catch {
      setOs(null);
    } finally {
      setLoading(false);
    }
  }

  async function comprimirImagem(file: File): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > 1200) {
            height = (height * 1200) / width;
            width = 1200;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(new File([blob!], file.name, { type: "image/jpeg" }));
          }, "image/jpeg", 0.7);
        };
      };
    });
  }

  async function handleFotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const novasFotos = await Promise.all(Array.from(e.target.files).map((f) => comprimirImagem(f)));
    setFotos((prev) => [...prev, ...novasFotos]);
  }

  function removerFoto(index: number) {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }

  function adicionarMaterial() {
    const selecionado = catalogo.find((item) => item._id === materialId);
    const nome = (selecionado?.nome || materialNomeLivre).trim();
    const quantidade = Math.max(0, Number(materialQuantidade) || 0);

    if (!nome || quantidade <= 0) {
      alert("Informe material e quantidade");
      return;
    }

    const novo: MaterialSolicitado = {
      equipamento_catalogo_id: selecionado?._id,
      nome,
      fabricante: selecionado?.fabricante || "",
      modelo: selecionado?.modelo || "",
      quantidade,
      unidade: materialUnidade.trim() || "un",
      observacao: materialObs.trim()
    };
    setMateriais((prev) => [...prev, novo]);
    setMaterialId("");
    setMaterialNomeLivre("");
    setMaterialQuantidade("1");
    setMaterialUnidade("un");
    setMaterialObs("");
  }

  function removerMaterial(index: number) {
    setMateriais((prev) => prev.filter((_, i) => i !== index));
  }

  const materialSelecionado = catalogo.find((item) => item._id === materialId);

  async function salvarAntes() {
    setSalvando(true);

    try {
      const formData = new FormData();
      formData.append("relatorio", relatorio);
      formData.append("observacao", observacao);
      formData.append("materiais_solicitados", JSON.stringify(materiais));
      fotos.forEach((f) => formData.append("fotos", f));

      await apiFetch(`/projects/tecnico/antes/${id}`, {
        method: "PUT",
        body: formData,
      });

      router.push(`/tecnico/servicos/${id}/depois`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao salvar ANTES");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!os) return <div className="p-6">OS não encontrada</div>;

  return (
    <div className="min-h-screen p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold">ANTES - {os.osNumero}</h1>
          <button
            type="button"
            onClick={() => router.push(`/tecnico/servicos/${id}`)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Voltar
          </button>
        </div>

        <label className="mb-1 block text-sm font-semibold">Parecer inicial</label>
        <textarea className="mb-4 w-full rounded-xl border border-slate-200 p-2.5" value={relatorio} onChange={(e) => setRelatorio(e.target.value)} />

        <label className="mb-1 block text-sm font-semibold">Observações</label>
        <textarea className="mb-4 w-full rounded-xl border border-slate-200 p-2.5" value={observacao} onChange={(e) => setObservacao(e.target.value)} />

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          Adicionar fotos (1 a 4)
          <input type="file" accept="image/*" multiple hidden onChange={handleFotosChange} />
        </label>

        <p className={`mt-2 text-sm ${fotos.length >= 1 && fotos.length <= 4 ? "text-emerald-700" : "text-rose-700"}`}>
          {fotos.length} / 4 foto{fotos.length !== 1 && "s"}
        </p>

        {fotos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {fotos.map((f, i) => (
              <div key={i} className="relative">
                <img src={URL.createObjectURL(f)} alt={`Preview ANTES ${i + 1}`} className="h-28 w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => removerFoto(i)}
                  className="absolute right-1 top-1 rounded bg-rose-600 px-2 text-xs font-bold text-white"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-extrabold text-slate-800">Materiais necessários</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-2.5" value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
              <option value="">Selecionar no catálogo</option>
              {catalogo.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.nome}
                  {item.fabricante ? ` - ${item.fabricante}` : ""}
                  {" | Est: "}
                  {item.estoque_qtd ?? 0}
                </option>
              ))}
            </select>
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5" placeholder="Ou digite o material" value={materialNomeLivre} onChange={(e) => setMaterialNomeLivre(e.target.value)} />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5" type="number" min={0} step="0.1" placeholder="Quantidade" value={materialQuantidade} onChange={(e) => setMaterialQuantidade(e.target.value)} />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5" placeholder="Unidade (ex: m, un)" value={materialUnidade} onChange={(e) => setMaterialUnidade(e.target.value)} />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:col-span-2" placeholder="Observação do material" value={materialObs} onChange={(e) => setMaterialObs(e.target.value)} />
          </div>
          {materialSelecionado && (
            <p className="mt-2 text-xs font-semibold text-slate-600">
              Estoque atual no catálogo: {materialSelecionado.estoque_qtd ?? 0}
            </p>
          )}
          <button type="button" onClick={adicionarMaterial} className="mt-3 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
            Adicionar material
          </button>

          {materiais.length > 0 && (
            <div className="mt-3 space-y-2">
              {materiais.map((m, index) => (
                <div key={`${m.nome}-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{m.nome}</p>
                    <p className="text-slate-600">
                      {m.quantidade} {m.unidade}
                      {m.fabricante ? ` | ${m.fabricante}` : ""}
                      {m.modelo ? ` | ${m.modelo}` : ""}
                    </p>
                    {m.observacao ? <p className="text-slate-600">{m.observacao}</p> : null}
                  </div>
                  <button type="button" onClick={() => removerMaterial(index)} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white hover:bg-rose-700">
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={salvarAntes}
          disabled={salvando || fotos.length < 1 || fotos.length > 4}
          className="mt-6 w-full rounded-xl bg-sky-700 px-4 py-3 font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {salvando ? "Salvando..." : "Salvar ANTES e ir para DEPOIS"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/tecnico/servicos/${id}`)}
          className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
        >
          Voltar para o serviço
        </button>
      </div>
    </div>
  );
}
