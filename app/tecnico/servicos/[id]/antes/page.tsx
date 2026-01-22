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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Erro ao buscar OS");
      }

      const data = await res.json();

      // 🔒 OS CONCLUÍDA → VISUALIZAÇÃO
      if (data.status === "concluido") {
        router.replace(`/tecnico/servicos/${id}/visualizar`);
        return;
      }

      // 🔁 ANTES JÁ FEITO → IR PARA DEPOIS
      if (data.antes && data.antes.fotos && data.antes.fotos.length > 0) {
        router.replace(`/tecnico/servicos/${id}/depois`);
        return;
      }

      setOs(data);
    } catch (err) {
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

      fotos.forEach((foto) => {
        formData.append("fotos", foto);
      });

      const res = await fetch(`${API_URL}/projects/tecnico/antes/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar ANTES");
      }

      router.push(`/tecnico/servicos/${id}/depois`);
    } catch (err) {
      alert("Erro ao salvar ANTES");
    } finally {
      setSalvando(false);
    }
  }

  // 🔹 IMPORTANTE: não renderiza erro falso
  if (loading) return <p className="p-6">Carregando...</p>;
  if (!os) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-2">
          ANTES – {os.osNumero}
        </h1>

        <p className="text-sm text-gray-600 mb-4">
          Criado em:{" "}
          {os.createdAt
            ? new Date(os.createdAt).toLocaleDateString("pt-BR")
            : "-"}
        </p>

        <div className="mb-4">
          <label className="block font-medium mb-1">Relatório</label>
          <textarea
            className="border p-2 rounded w-full min-h-[80px]"
            value={relatorio}
            onChange={(e) => setRelatorio(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block font-medium mb-1">Observação</label>
          <textarea
            className="border p-2 rounded w-full min-h-[80px]"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded cursor-pointer">
            📷 Adicionar fotos
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={handleFotos}
            />
          </label>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            {fotos.map((foto, index) => (
              <div key={index} className="relative">
                <img
                  src={URL.createObjectURL(foto)}
                  className="rounded border object-cover h-28 w-full"
                />
                <button
                  onClick={() => removerFoto(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 rounded"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={salvarAntes}
          disabled={salvando}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg w-full"
        >
          {salvando ? "Salvando..." : "Salvar e ir para DEPOIS →"}
        </button>
      </div>
    </div>
  );
}
