"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://gerenciador-de-os.onrender.com";

export default function VisualizarOSPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [os, setOs] = useState<any | null>(null);
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
      setOs(data);
    } catch {
      alert("Erro ao carregar OS");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!os) return null; // evita erro falso

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-6 space-y-4">

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            OS {os.osNumero} — Concluída
          </h1>
          <button
            onClick={() => router.push("/tecnico")}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Voltar
          </button>
        </div>

        <p><b>Cliente:</b> {os.cliente}</p>

        <p className="text-sm text-gray-600">
          Criado em: {new Date(os.createdAt).toLocaleDateString("pt-BR")} •
          Atualizado em: {new Date(os.updatedAt).toLocaleDateString("pt-BR")}
        </p>

        {os.antes && (
          <div className="border p-4 rounded">
            <h2 className="font-bold mb-2">ANTES</h2>
            <p>{os.antes.relatorio || "-"}</p>

            <div className="grid grid-cols-3 gap-3 mt-2">
              {os.antes.fotos?.map((f: string, i: number) => (
                <img
                  key={i}
                  src={`data:image/jpeg;base64,${f}`}
                  className="rounded h-32 object-cover"
                />
              ))}
            </div>
          </div>
        )}

        {os.depois && (
          <div className="border p-4 rounded">
            <h2 className="font-bold mb-2">DEPOIS</h2>
            <p>{os.depois.relatorio || "-"}</p>

            <div className="grid grid-cols-3 gap-3 mt-2">
              {os.depois.fotos?.map((f: string, i: number) => (
                <img
                  key={i}
                  src={`data:image/jpeg;base64,${f}`}
                  className="rounded h-32 object-cover"
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
