"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://gerenciador-de-os.onrender.com";

export default function ServicoDepoisPage() {
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

      // 🔒 REGRA FINAL:
      // DEPOIS SÓ ABRE SE CONCLUÍDO
      if (data.status !== "concluido") {
        router.replace(`/tecnico/servicos/${id}/antes`);
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
    setFotos(Array.from(e.target.files));
  }

  function removerFoto(index: number) {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function salvarDepois() {
    setSalvando(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("relatorio", relatorio);
      formData.append("observacao", observacao);
      fotos.forEach((f) => formData.append("fotos", f));

      const res = await fetch(`${API_URL}/projects/tecnico/depois/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error();

      alert("OS finalizada com sucesso!");
      router.push("/tecnico");
    } catch {
      alert("Erro ao salvar DEPOIS");
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
          DEPOIS – {os.osNumero}
        </h1>

        <label className="font-medium mb-1 block">Relatório final</label>
        <textarea
          className="border p-2 rounded w-full mb-4"
          value={relatorio}
          onChange={(e) => setRelatorio(e.target.value)}
        />

        <label className="font-medium mb-1 block">Observações finais</label>
        <textarea
          className="border p-2 rounded w-full mb-4"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        <label className="font-medium mb-2 block">📷 Fotos</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFotosChange}
        />

        <button
          onClick={salvarDepois}
          disabled={salvando}
          className="mt-6 bg-green-600 hover:bg-green-700 text-white w-full py-3 rounded"
        >
          {salvando ? "Salvando..." : "Finalizar OS"}
        </button>
      </div>
    </div>
  );
}
