"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

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
  const [telefone, setTelefone] = useState("");
  const [detalhamento, setDetalhamento] = useState("");
  const [status, setStatus] = useState("aguardando_tecnico");

  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [tecnicoId, setTecnicoId] = useState("");

 const [antesRelatorio, setAntesRelatorio] = useState("");
const [antesObs, setAntesObs] = useState(""); // 👈 ADD
const [antesFotos, setAntesFotos] = useState<string[]>([]);
const [novasFotosAntes, setNovasFotosAntes] = useState<File[]>([]);

const [depoisRelatorio, setDepoisRelatorio] = useState("");
const [depoisObs, setDepoisObs] = useState(""); // 👈 ADD
const [depoisFotos, setDepoisFotos] = useState<string[]>([]);
const [novasFotosDepois, setNovasFotosDepois] = useState<File[]>([]);

  useEffect(() => {
    carregarOS();
    carregarTecnicos();
  }, []);

  async function carregarOS() {
    try {
      const data = await apiFetch(`/projects/admin/view/${id}`);

      setCliente(data.cliente || "");
      setSubcliente(data.Subcliente || data.subgrupo || "");
      setMarca(data.marca || "");
      setUnidade(data.unidade || "");
      setEndereco(data.endereco || "");
      setTelefone(data.telefone || "");
      setDetalhamento(data.detalhamento || "");
      setStatus(data.status || "aguardando_tecnico");
      setTecnicoId(data.tecnico?._id || data.tecnico || "");

    setAntesRelatorio(data.antes?.relatorio || "");
setAntesObs(data.antes?.observacao || ""); // ✅ ADD
setAntesFotos(data.antes?.fotos || []);

setDepoisRelatorio(data.depois?.relatorio || "");
setDepoisObs(data.depois?.observacao || ""); // ✅ ADD
setDepoisFotos(data.depois?.fotos || []);

    } catch (err: any) {
      alert("Erro ao carregar OS: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function carregarTecnicos() {
    try {
      const data = await apiFetch("/auth/tecnicos");
      setTecnicos(data);
    } catch {
      alert("Erro ao carregar técnicos");
    }
  }

  function removerFotoAntes(index: number) {
    const nova = [...antesFotos];
    nova.splice(index, 1);
    setAntesFotos(nova);
  }

  function removerFotoDepois(index: number) {
    const nova = [...depoisFotos];
    nova.splice(index, 1);
    setDepoisFotos(nova);
  }

  function handleNovasFotosAntes(files: FileList | null) {
    if (!files) return;
    setNovasFotosAntes(Array.from(files));
  }

  function handleNovasFotosDepois(files: FileList | null) {
    if (!files) return;
    setNovasFotosDepois(Array.from(files));
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
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

      const payload = {
        cliente,
        Subcliente: subcliente,
        marca,
        unidade,
        endereco,
        telefone,
        detalhamento,
        status,
        tecnicoId,
        antes: {
          relatorio: antesRelatorio,
          fotos: [...antesFotos, ...novasAntesBase64],
        },
        depois: {
          relatorio: depoisRelatorio,
          fotos: [...depoisFotos, ...novasDepoisBase64],
        },
      };

      await apiFetch(`/projects/admin/update/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      alert("OS atualizada com sucesso!");
      router.push(`/admin/servicos/${id}`);
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-black">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-200 p-4 flex justify-center">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6 space-y-4 text-black">

        {/* TOPO */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Editar Ordem de Serviço</h1>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            ← Voltar
          </button>
        </div>

        {/* CLIENTE */}
        <div>
          <label className="block font-semibold text-gray-800 mb-1">Cliente</label>
          <input className="border border-gray-400 p-2 rounded w-full text-black"
            value={cliente} onChange={(e) => setCliente(e.target.value)} />
        </div>

        {/* SUBCLIENTE */}
        <div>
          <label className="block font-semibold text-gray-800 mb-1">Subcliente</label>
          <input className="border border-gray-400 p-2 rounded w-full text-black"
            value={subcliente} onChange={(e) => setSubcliente(e.target.value)} />
        </div>

        {/* MARCA */}
        <div>
          <label className="block font-semibold text-gray-800 mb-1">Marca</label>
          <input className="border border-gray-400 p-2 rounded w-full text-black"
            value={marca} onChange={(e) => setMarca(e.target.value)} />
        </div>

        {/* UNIDADE */}
        <div>
          <label className="block font-semibold text-gray-800 mb-1">Unidade</label>
          <input className="border border-gray-400 p-2 rounded w-full text-black"
            value={unidade} onChange={(e) => setUnidade(e.target.value)} />
        </div>

        {/* ENDEREÇO */}
        <div>
          <label className="block font-semibold text-gray-800 mb-1">Endereço</label>
          <input className="border border-gray-400 p-2 rounded w-full text-black"
            value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </div>

        {/* TELEFONE */}
        <div>
          <label className="block font-semibold text-gray-800 mb-1">Telefone</label>
          <input className="border border-gray-400 p-2 rounded w-full text-black"
            value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>

        {/* DETALHAMENTO */}
        <div>
          <label className="block font-semibold text-gray-800 mb-1">Detalhamento do Serviço</label>
          <textarea className="border border-gray-400 p-2 rounded w-full text-black"
            rows={3}
            value={detalhamento} onChange={(e) => setDetalhamento(e.target.value)} />
        </div>

        {/* STATUS */}
        <div>
          <label className="block font-semibold text-gray-800 mb-1">Status</label>
          <select className="border border-gray-400 p-2 rounded w-full text-black"
            value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="aguardando_tecnico">Aguardando Técnico</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        {/* TÉCNICO */}
        <div>
          <label className="block font-semibold text-gray-800 mb-1">Técnico</label>
          <select className="border border-gray-400 p-2 rounded w-full text-black"
            value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
            <option value="">Selecione</option>
            {tecnicos.map((t) => (
              <option key={t._id} value={t._id}>{t.nome}</option>
            ))}
          </select>
        </div>

  {/* ================= ANTES ================= */}
<div className="border border-gray-400 rounded p-4 bg-white">
  <h2 className="font-bold text-gray-900 mb-2">ANTES</h2>

  <label className="text-sm font-semibold text-gray-800">Relatório (Antes)</label>
  <textarea
    className="border border-gray-500 p-2 rounded w-full mb-3 text-black"
    rows={2}
    value={antesRelatorio}
    onChange={(e) => setAntesRelatorio(e.target.value)}
  />

  {/* FOTOS ANTES */}
  <div className="grid grid-cols-3 gap-2 mb-3">
    {antesFotos.map((foto, idx) => (
      <div key={idx} className="relative">
        <img
          src={`data:image/jpeg;base64,${foto}`}
          className="rounded border border-gray-400 object-cover w-full h-24"
        />
        <button
          type="button"
          onClick={() => removerFotoAntes(idx)}
          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full px-2 text-xs"
        >
          ✕
        </button>
      </div>
    ))}
  </div>

  {/* BOTÕES FOTO ANTES */}
  <div className="flex gap-3">
    {/* CÂMERA */}
    <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2">
      📷 Tirar foto
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleNovasFotosAntes(e.target.files)}
      />
    </label>

    {/* ARQUIVO */}
    <label className="cursor-pointer bg-gray-800 hover:bg-gray-900 text-white px-3 py-2 rounded-lg flex items-center gap-2">
      📁 Arquivo
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleNovasFotosAntes(e.target.files)}
      />
    </label>
  </div>
</div>

{/* ================= DEPOIS ================= */}
<div className="border border-gray-400 rounded p-4 bg-white mt-6">
  <h2 className="font-bold text-gray-900 mb-2">DEPOIS</h2>

  <label className="text-sm font-semibold text-gray-800">Relatório (Depois)</label>
  <textarea
    className="border border-gray-500 p-2 rounded w-full mb-3 text-black"
    rows={2}
    value={depoisRelatorio}
    onChange={(e) => setDepoisRelatorio(e.target.value)}
  />

  {/* FOTOS DEPOIS */}
  <div className="grid grid-cols-3 gap-2 mb-3">
    {depoisFotos.map((foto, idx) => (
      <div key={idx} className="relative">
        <img
          src={`data:image/jpeg;base64,${foto}`}
          className="rounded border border-gray-400 object-cover w-full h-24"
        />
        <button
          type="button"
          onClick={() => removerFotoDepois(idx)}
          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full px-2 text-xs"
        >
          ✕
        </button>
      </div>
    ))}
  </div>

  {/* BOTÕES FOTO DEPOIS */}
  <div className="flex gap-3">
    {/* CÂMERA */}
    <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-2">
      📷 Tirar foto
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleNovasFotosDepois(e.target.files)}
      />
    </label>

    {/* ARQUIVO */}
    <label className="cursor-pointer bg-gray-800 hover:bg-gray-900 text-white px-3 py-2 rounded-lg flex items-center gap-2">
      📁 Arquivo
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleNovasFotosDepois(e.target.files)}
      />
    </label>
  </div>
</div>


        {/* BOTÃO SALVAR */}
        <button
          onClick={salvarAlteracoes}
          disabled={salvando}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg w-full text-lg font-semibold"
        >
          {salvando ? "Salvando..." : "Salvar Alterações"}
        </button>

      </div>
    </div>
  );
}
