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

      // 🔒 SE JÁ CONCLUIU, NÃO MEXE MAIS
      if (data.status === "concluido") {
        router.replace(`/tecnico/servicos/${id}`);
        return;
      }

      setOs(data);
    } catch {
      setOs(null);
    } finally {
      setLoading(false);
    }
  }

  async function salvarAntes() {
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

    // ✅ AGORA SIM VAI PRO DEPOIS
    router.push(`/tecnico/servicos/${id}`);
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!os) return <div className="p-6">OS não encontrada</div>;

  return (
    <div className="p-6 bg-white text-black">
      <h1 className="text-xl font-bold mb-4">
        ANTES – {os.osNumero}
      </h1>

      <label>Relatório inicial</label>
      <textarea
        className="border w-full mb-3"
        value={relatorio}
        onChange={(e) => setRelatorio(e.target.value)}
      />

      <label>Observações</label>
      <textarea
        className="border w-full mb-3"
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
      />

      <label>📷 Fotos</label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFotos(Array.from(e.target.files || []))}
      />

      <button
        onClick={salvarAntes}
        className="mt-4 bg-green-600 text-white p-3 w-full"
      >
        Salvar ANTES e ir para DEPOIS
      </button>
    </div>
  );
}
