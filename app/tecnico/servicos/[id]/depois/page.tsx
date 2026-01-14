"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DepoisPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [relatorio, setRelatorio] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  async function salvarDepois() {
    setLoading(true);
    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("relatorio", relatorio);
    formData.append("observacao", observacao);
    fotos.forEach((f) => formData.append("fotos", f));

    const res = await fetch(`https://gerenciador-de-os.onrender.com/projects/tecnico/antes/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    if (!res.ok) {
      alert("Erro ao salvar DEPOIS");
      setLoading(false);
      return;
    }

    alert("Serviço finalizado!");
    router.push("/tecnico");
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black">
      <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold mb-4">DEPOIS</h1>

        <textarea
          value={relatorio}
          onChange={(e) => setRelatorio(e.target.value)}
          placeholder="Relatório final"
          className="w-full border p-2 rounded mb-3"
        />

        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Observações finais"
          className="w-full border p-2 rounded mb-3"
        />

        <label className="flex items-center gap-2 cursor-pointer mb-4">
          📷 <span>Adicionar fotos</span>
          <input type="file" multiple hidden onChange={(e) => setFotos(Array.from(e.target.files || []))} />
        </label>

        <button
          onClick={salvarDepois}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Finalizando..." : "Finalizar serviço"}
        </button>
      </div>
    </div>
  );
}
