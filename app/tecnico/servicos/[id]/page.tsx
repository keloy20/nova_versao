"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://gerenciador-de-os.onrender.com";

export default function AntesPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [os, setOs] = useState<any | null>(null);
  const [relatorio, setRelatorio] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarOS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarOS() {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/projects/tecnico/view/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();

      // 🔒 CONCLUÍDA → VISUALIZAR
      if (data.status === "concluido") {
        router.replace(`/tecnico/servicos/${id}/visualizar`);
        return;
      }

      // 🔁 ANTES JÁ FEITO → DEPOIS
      if (data.antes?.fotos?.length > 0) {
        router.replace(`/tecnico/servicos/${id}/depois`);
        return;
      }

      setOs(data);
    } catch {
      alert("Erro ao carregar OS");
    } finally {
      setLoading(false);
    }
  }

  function handleFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.currentTarget.files;
    if (!files) return;
    setFotos((prev) => [...prev, ...Array.from(files)]);
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

      const res = await fetch(`${API_URL}/projects/tecnico/antes/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error();

      router.push(`/tecnico/servicos/${id}/depois`);
    } catch {
      alert("Erro ao salvar ANTES");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <p className="p-6">Carregando...</p>;
  if (!os) return null; // 🔴 evita erro falso

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">
          ANTES – {os.osNumero}
        </h1>

        <textarea
          placeholder="Relatório"
          className="border p-2 w-full mb-3"
          value={relatorio}
          onChange={(e) => setRelatorio(e.target.value)}
        />

        <textarea
          placeholder="Observação"
          className="border p-2 w-full mb-3"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        <input type="file" multiple accept="image/*" onChange={handleFotos} />

        <div className="grid grid-cols-3 gap-2 mt-3">
          {fotos.map((f, i) => (
            <div key={i} className="relative">
              <img
                src={URL.createObjectURL(f)}
                className="h-24 w-full object-cover"
              />
              <button
                onClick={() => removerFoto(i)}
                className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2"
              >
                X
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={salvarAntes}
          disabled={salvando}
          className="mt-4 bg-green-600 text-white w-full py-3 rounded"
        >
          {salvando ? "Salvando..." : "Salvar e ir para DEPOIS"}
        </button>
      </div>
    </div>
  );
}
