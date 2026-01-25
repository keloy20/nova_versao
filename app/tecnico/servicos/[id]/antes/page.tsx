"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export default function AntesPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [os, setOs] = useState<any>(null);
  const [relatorio, setRelatorio] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarOS();
  }, []);

  async function carregarOS() {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/projects/tecnico/view/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (data.status === "concluido") {
      router.replace(`/tecnico/servicos/${id}/visualizar`);
      return;
    }

    if (data.antes?.fotos?.length) {
      router.replace(`/tecnico/servicos/${id}/depois`);
      return;
    }

    setOs(data);
    setLoading(false);
  }

  function handleFotos(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    setFotos(prev => [...prev, ...Array.from(e.target.files!)]);
  }

  function removerFoto(i: number) {
    setFotos(prev => prev.filter((_, idx) => idx !== i));
  }

  async function salvarAntes() {
    setSalvando(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();

    formData.append("relatorio", relatorio);
    formData.append("observacao", observacao);
    fotos.forEach(f => formData.append("fotos", f));

    await fetch(`${API_URL}/projects/tecnico/antes/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    router.push(`/tecnico/servicos/${id}/depois`);
  }

  if (loading) return <p>Carregando...</p>;
  if (!os) return null;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">ANTES – {os.osNumero}</h1>

      <textarea className="border p-2 w-full mb-2" placeholder="Relatório" value={relatorio} onChange={e => setRelatorio(e.target.value)} />
      <textarea className="border p-2 w-full mb-4" placeholder="Observação" value={observacao} onChange={e => setObservacao(e.target.value)} />

      <label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer inline-block">
        📷 Adicionar fotos
        <input type="file" accept="image/*" multiple hidden onChange={handleFotos} />
      </label>

      <div className="grid grid-cols-3 gap-2 mt-3">
        {fotos.map((f, i) => (
          <div key={i} className="relative">
            <img src={URL.createObjectURL(f)} className="h-24 w-full object-cover rounded" />
            <button onClick={() => removerFoto(i)} className="absolute top-1 right-1 bg-red-600 text-white px-2 text-xs rounded">X</button>
          </div>
        ))}
      </div>

      <button onClick={salvarAntes} disabled={salvando} className="mt-4 bg-green-600 text-white w-full py-3 rounded">
        {salvando ? "Salvando..." : "Salvar e ir para DEPOIS"}
      </button>
    </div>
  );
}
