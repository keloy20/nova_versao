"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://gerenciador-de-os.onrender.com";

export default function AntesPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

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
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/projects/tecnico/view/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();

      if (data.status === "concluido") {
        router.replace("/tecnico");
        return;
      }

      setOs(data);
    } catch {
      setOs(null);
    } finally {
      setLoading(false);
    }
  }

  function handleFotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    setFotos((prev) => [...prev, ...Array.from(e.target.files!)]);
  }

  function removerFoto(index: number) {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function salvarAntes() {
    setSalvando(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("relatorio", relatorio);
      formData.append("observacao", observacao);
      fotos.forEach((f) => formData.append("fotos", f));

      await fetch(`${API_URL}/projects/tecnico/antes/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      localStorage.setItem(`os-step-${id}`, "depois");
      router.push(`/tecnico/servicos/${id}/depois`);
    } catch {
      alert("Erro ao salvar ANTES");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!os) return <div className="p-6">OS não encontrada</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-6">
          ANTES – {os.osNumero}
        </h1>

        <label className="font-medium block mb-1">Relatório inicial</label>
        <textarea
          className="border p-2 rounded w-full mb-4"
          value={relatorio}
          onChange={(e) => setRelatorio(e.target.value)}
        />

        <label className="font-medium block mb-1">Observações</label>
        <textarea
          className="border p-2 rounded w-full mb-4"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        {/* BOTÃO DE FOTO */}
        <label className="flex items-center justify-center gap-2 cursor-pointer bg-gray-100 p-4 rounded border border-dashed border-gray-400 text-gray-600">
          📷 <span>Fotos aqui (câmera ou galeria)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleFotosChange}
          />
        </label>

        {/* CONTADOR */}
        <div className="mt-2 text-sm text-gray-500">
          {fotos.length} foto{fotos.length !== 1 && "s"} selecionada{fotos.length !== 1 && "s"}
        </div>

        {/* PREVIEW */}
        {fotos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {fotos.map((f, i) => (
              <div key={i} className="relative">
                <img
                  src={URL.createObjectURL(f)}
                  className="h-32 w-full object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => removerFoto(i)}
                  className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 py-1 rounded"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={salvarAntes}
          disabled={salvando}
          className="mt-6 bg-green-600 hover:bg-green-700 text-white w-full py-3 rounded"
        >
          {salvando ? "Salvando..." : "Salvar ANTES e ir para DEPOIS"}
        </button>
      </div>
    </div>
  );
}
