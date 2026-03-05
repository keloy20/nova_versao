"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import { PRIORIDADES, TIPO_MANUTENCAO } from "@/app/lib/os";

type UploadFotosProps = {
  fotosExistentes: string[];
  setFotosExistentes: React.Dispatch<React.SetStateAction<string[]>>;
  novasFotos: File[];
  onChange: (files: FileList | null) => void;
};

type Tecnico = { _id: string; nome: string };
type EquipamentoCatalogo = {
  _id: string;
  nome: string;
  fabricante?: string;
  modelo?: string;
  numero_serie?: string;
  patrimonio?: string;
  especificacoes_tecnicas?: string;
};

type OSDetalhe = {
  cliente?: string;
  subcliente?: string;
  marca?: string;
  unidade?: string;
  endereco?: string;
  email?: string;
  telefone?: string;
  detalhamento?: string;
  orcamento_previsto?: string;
  equipamento_catalogo_id?: string;
  equipamento_nome?: string;
  equipamento_fabricante?: string;
  equipamento_modelo?: string;
  equipamento_numero_serie?: string;
  equipamento_patrimonio?: string;
  equipamento_especificacoes?: string;
  status?: string;
  solicitante_nome?: string;
  tipo_manutencao?: (typeof TIPO_MANUTENCAO)[number];
  prioridade?: (typeof PRIORIDADES)[number];
  tecnico?: { _id?: string };
  antes?: { relatorio?: string; observacao?: string; fotos?: string[] };
  depois?: { relatorio?: string; observacao?: string; fotos?: string[] };
};

function UploadFotos({ fotosExistentes, setFotosExistentes, novasFotos, onChange }: UploadFotosProps) {
  function removerFoto(index: number) {
    setFotosExistentes((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {fotosExistentes.map((foto, i) => (
          <div key={i} className="relative">
            <img src={`data:image/jpeg;base64,${foto}`} alt={`Foto ${i + 1}`} className="h-32 w-full rounded-lg object-cover" />
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

      {fotosExistentes.length + novasFotos.length < 4 && (
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-4 hover:bg-slate-50">
          <span className="font-semibold">Adicionar fotos</span>
          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files)} />
        </label>
      )}
    </>
  );
}

export default function EditarOSPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [cliente, setCliente] = useState("");
  const [subcliente, setSubcliente] = useState("");
  const [marca, setMarca] = useState("");
  const [unidade, setUnidade] = useState("");
  const [endereco, setEndereco] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [detalhamento, setDetalhamento] = useState("");
  const [solicitanteNome, setSolicitanteNome] = useState("");
  const [tipoManutencao, setTipoManutencao] = useState<(typeof TIPO_MANUTENCAO)[number]>("CORRETIVA");
  const [prioridade, setPrioridade] = useState<(typeof PRIORIDADES)[number]>("MEDIA");

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

  const [antesRelatorio, setAntesRelatorio] = useState("");
  const [antesObs, setAntesObs] = useState("");
  const [antesFotos, setAntesFotos] = useState<string[]>([]);
  const [novasFotosAntes, setNovasFotosAntes] = useState<File[]>([]);

  const [depoisRelatorio, setDepoisRelatorio] = useState("");
  const [depoisObs, setDepoisObs] = useState("");
  const [depoisFotos, setDepoisFotos] = useState<string[]>([]);
  const [novasFotosDepois, setNovasFotosDepois] = useState<File[]>([]);
  const [fotoProblema, setFotoProblema] = useState<string>("");
  const isDasa = cliente.trim().toLowerCase() === "dasa";

  useEffect(() => {
    carregarOS();
    carregarTecnicos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarOS() {
    try {
      const data = (await apiFetch(`/projects/admin/view/${id}`)) as OSDetalhe;

      setCliente(data.cliente || "");
      setSubcliente(data.subcliente || "");
      setMarca(data.marca || "");
      setUnidade(data.unidade || "");
      setEndereco(data.endereco || "");
      setEmail(data.email || "");
      setTelefone(data.telefone || "");
      setDetalhamento(data.detalhamento || "");
      setSolicitanteNome(data.solicitante_nome || "");
      setTipoManutencao(data.tipo_manutencao || "CORRETIVA");
      setPrioridade(data.prioridade || "MEDIA");
      setTecnicoId(data.tecnico?._id || "");
      setEquipamentoCatalogoId(data.equipamento_catalogo_id || "");
      setEquipamentoNome(data.equipamento_nome || "");
      setEquipamentoFabricante(data.equipamento_fabricante || "");
      setEquipamentoModelo(data.equipamento_modelo || "");
      setEquipamentoNumeroSerie(data.equipamento_numero_serie || "");
      setEquipamentoPatrimonio(data.equipamento_patrimonio || "");
      setEquipamentoEspecificacoes(data.equipamento_especificacoes || "");
      setOrcamentoPrevisto(data.orcamento_previsto || "");

      setAntesRelatorio(data.antes?.relatorio || "");
      setAntesObs(data.antes?.observacao || "");
      setAntesFotos(data.antes?.fotos || []);

      setDepoisRelatorio(data.depois?.relatorio || "");
      setDepoisObs(data.depois?.observacao || "");
      setDepoisFotos(data.depois?.fotos || []);
      setFotoProblema((data as OSDetalhe & { foto_abertura?: string; problem_photo_url?: string }).problem_photo_url || (data as OSDetalhe & { foto_abertura?: string }).foto_abertura || "");
    } catch (err: unknown) {
      alert("Erro ao carregar OS: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  async function carregarTecnicos() {
    const data = await apiFetch("/auth/tecnicos");
    setTecnicos(Array.isArray(data) ? (data as Tecnico[]) : []);
  }

  useEffect(() => {
    if (tipoManutencao !== "PREVENTIVA") return;
    apiFetch("/catalog/equipamentos")
      .then((data) => setCatalogoEquipamentos(Array.isArray(data) ? (data as EquipamentoCatalogo[]) : []))
      .catch(() => setCatalogoEquipamentos([]));
  }, [tipoManutencao]);

  function selecionarEquipamento(idSelecionado: string) {
    setEquipamentoCatalogoId(idSelecionado);
    const eq = catalogoEquipamentos.find((item) => item._id === idSelecionado);
    if (!eq) return;
    setEquipamentoNome(eq.nome || "");
    setEquipamentoFabricante(eq.fabricante || "");
    setEquipamentoModelo(eq.modelo || "");
    setEquipamentoNumeroSerie(eq.numero_serie || "");
    setEquipamentoPatrimonio(eq.patrimonio || "");
    setEquipamentoEspecificacoes(eq.especificacoes_tecnicas || "");
  }

  function handleNovasFotosAntes(files: FileList | null) {
    if (!files) return;
    setNovasFotosAntes((prev) => [...prev, ...Array.from(files)]);
  }

  function handleNovasFotosDepois(files: FileList | null) {
    if (!files) return;
    setNovasFotosDepois((prev) => [...prev, ...Array.from(files)]);
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function salvarAlteracoes() {
    setSalvando(true);

    try {
      const novasAntesBase64 = [];
      for (const f of novasFotosAntes) novasAntesBase64.push(await fileToBase64(f));

      const novasDepoisBase64 = [];
      for (const f of novasFotosDepois) novasDepoisBase64.push(await fileToBase64(f));

      await apiFetch(`/projects/admin/update/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          cliente,
          subcliente,
          marca: isDasa ? marca : "",
          unidade: isDasa ? unidade : "",
          endereco,
          email,
          telefone,
          detalhamento,
          tecnicoId,
          solicitante_nome: solicitanteNome,
          tipo_manutencao: tipoManutencao,
          prioridade,
          equipamento_catalogo_id: tipoManutencao === "PREVENTIVA" ? equipamentoCatalogoId : "",
          equipamento_nome: tipoManutencao === "PREVENTIVA" ? equipamentoNome : "",
          equipamento_fabricante: tipoManutencao === "PREVENTIVA" ? equipamentoFabricante : "",
          equipamento_modelo: tipoManutencao === "PREVENTIVA" ? equipamentoModelo : "",
          equipamento_numero_serie: tipoManutencao === "PREVENTIVA" ? equipamentoNumeroSerie : "",
          equipamento_patrimonio: tipoManutencao === "PREVENTIVA" ? equipamentoPatrimonio : "",
          equipamento_especificacoes: tipoManutencao === "PREVENTIVA" ? equipamentoEspecificacoes : "",
          orcamento_previsto: tipoManutencao === "PREVENTIVA" ? orcamentoPrevisto : "",
          antes: {
            relatorio: antesRelatorio,
            observacao: antesObs,
            fotos: [...antesFotos, ...novasAntesBase64].slice(0, 4),
          },
          depois: {
            relatorio: depoisRelatorio,
            observacao: depoisObs,
            fotos: [...depoisFotos, ...novasDepoisBase64].slice(0, 4),
          },
        }),
      });

      router.push(`/admin/servicos/${id}`);
    } catch (err: unknown) {
      alert("Erro ao salvar: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <div className="p-6 text-center">Carregando...</div>;

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-900">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold">Editar Ordem de Serviço</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
          >
            Voltar
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Subcliente" value={subcliente} onChange={(e) => setSubcliente(e.target.value)} />
          {isDasa && (
            <>
              <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
              <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
            </>
          )}
          <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Endereço" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Solicitante" value={solicitanteNome} onChange={(e) => setSolicitanteNome(e.target.value)} />

          <select className="rounded-xl border border-slate-200 p-2.5" value={tipoManutencao} onChange={(e) => setTipoManutencao(e.target.value as (typeof TIPO_MANUTENCAO)[number])}>
            {TIPO_MANUTENCAO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select className="rounded-xl border border-slate-200 p-2.5" value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
            <option value="">Selecione o técnico</option>
            {tecnicos.map((t) => (
              <option key={t._id} value={t._id}>{t.nome}</option>
            ))}
          </select>

          <select className="rounded-xl border border-slate-200 p-2.5" value={prioridade} onChange={(e) => setPrioridade(e.target.value as (typeof PRIORIDADES)[number])}>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {fotoProblema && (
          <>
            <h2 className="pt-2 text-lg font-extrabold">Foto enviada na solicitação</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <img src={`data:image/jpeg;base64,${fotoProblema}`} alt="Foto da solicitacao" className="h-32 w-full rounded-lg object-cover" />
            </div>
          </>
        )}

        <textarea className="w-full rounded-xl border border-slate-200 p-2.5" rows={3} placeholder="Detalhamento" value={detalhamento} onChange={(e) => setDetalhamento(e.target.value)} />

        {tipoManutencao === "PREVENTIVA" && (
          <>
            <h2 className="pt-2 text-lg font-extrabold">Catálogo / Orçamento (Preventiva)</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold">Equipamento do catálogo</span>
                <select
                  className="w-full rounded-xl border border-slate-200 p-2.5"
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

              <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Nome do equipamento" value={equipamentoNome} onChange={(e) => setEquipamentoNome(e.target.value)} />
              <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Fabricante" value={equipamentoFabricante} onChange={(e) => setEquipamentoFabricante(e.target.value)} />
              <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Modelo" value={equipamentoModelo} onChange={(e) => setEquipamentoModelo(e.target.value)} />
              <input className="rounded-xl border border-slate-200 p-2.5" placeholder="Número de série" value={equipamentoNumeroSerie} onChange={(e) => setEquipamentoNumeroSerie(e.target.value)} />
              <input className="rounded-xl border border-slate-200 p-2.5 sm:col-span-2" placeholder="Patrimônio / TAG" value={equipamentoPatrimonio} onChange={(e) => setEquipamentoPatrimonio(e.target.value)} />
              <textarea className="rounded-xl border border-slate-200 p-2.5 sm:col-span-2" rows={3} placeholder="Especificações técnicas" value={equipamentoEspecificacoes} onChange={(e) => setEquipamentoEspecificacoes(e.target.value)} />
              <input className="rounded-xl border border-slate-200 p-2.5 sm:col-span-2" placeholder="Orçamento previsto" value={orcamentoPrevisto} onChange={(e) => setOrcamentoPrevisto(e.target.value)} />
            </div>
          </>
        )}

        <h2 className="pt-2 text-lg font-extrabold">ANTES</h2>
        <textarea className="w-full rounded-xl border border-slate-200 p-2.5" rows={2} placeholder="Relatório" value={antesRelatorio} onChange={(e) => setAntesRelatorio(e.target.value)} />
        <textarea className="w-full rounded-xl border border-slate-200 p-2.5" rows={2} placeholder="Observação" value={antesObs} onChange={(e) => setAntesObs(e.target.value)} />

        <UploadFotos fotosExistentes={antesFotos} setFotosExistentes={setAntesFotos} novasFotos={novasFotosAntes} onChange={handleNovasFotosAntes} />

        <h2 className="pt-2 text-lg font-extrabold">DEPOIS</h2>
        <textarea className="w-full rounded-xl border border-slate-200 p-2.5" rows={2} placeholder="Relatório" value={depoisRelatorio} onChange={(e) => setDepoisRelatorio(e.target.value)} />
        <textarea className="w-full rounded-xl border border-slate-200 p-2.5" rows={2} placeholder="Observação" value={depoisObs} onChange={(e) => setDepoisObs(e.target.value)} />

        <UploadFotos fotosExistentes={depoisFotos} setFotosExistentes={setDepoisFotos} novasFotos={novasFotosDepois} onChange={handleNovasFotosDepois} />

        <button
          onClick={salvarAlteracoes}
          disabled={salvando}
          className="mt-2 w-full rounded-xl bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
