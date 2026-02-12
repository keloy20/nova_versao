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

          // Reduz tamanho se muito grande
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
    const novasFotos = await Promise.all(
      Array.from(e.target.files).map((f) => comprimirImagem(f))
    );
    setFotos((prev) => [...prev, ...novasFotos]);
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

        {/* CONTADOR E VALIDAÇÃO */}
        <div className="mt-2 text-sm">
          <div className={fotos.length >= 1 && fotos.length <= 4 ? "text-green-600" : "text-red-600"}>
            {fotos.length} / 4 foto{fotos.length !== 1 && "s"} selecionada{fotos.length !== 1 && "s"}
          </div>
          {fotos.length === 0 && (
            <p className="text-red-600 font-semibold mt-1">⚠️ Obrigatório: mínimo 1 foto</p>
          )}
          {fotos.length > 4 && (
            <p className="text-red-600 font-semibold mt-1">⚠️ Máximo: 4 fotos (remova {fotos.length - 4})</p>
          )}
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
          disabled={salvando || fotos.length < 1 || fotos.length > 4}
          className={`mt-6 text-white w-full py-3 rounded ${
            fotos.length >= 1 && fotos.length <= 4
              ? "bg-green-600 hover:bg-green-700 cursor-pointer"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {salvando ? "Salvando..." : fotos.length === 0 ? "Adicione pelo menos 1 foto" : fotos.length > 4 ? "Remova fotos extras" : "Salvar ANTES e ir para DEPOIS"}
        </button>
      </div>
    </div>
  );
}
