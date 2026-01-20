"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://gerenciador-de-os.onrender.com";

export default function VisualizarOSPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [os, setOs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarOS();
  }, []);

  async function carregarOS() {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/projects/tecnico/view/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar OS");
      }

      setOs(data);
    } catch (err: any) {
      alert("Erro ao carregar OS: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-black">Carregando...</div>;
  }

  if (!os) {
    return <div className="p-6 text-black">OS não encontrada</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-6 space-y-4">

        {/* TOPO */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            OS {os.osNumero} — Concluída
          </h1>
          <button
            onClick={() => router.push("/tecnico")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Voltar
          </button>
        </div>

        {/* INFO */}
        <div className="space-y-1">
          <p><b>Cliente:</b> {os.cliente}</p>
          {os.marca && <p><b>Marca:</b> {os.marca}</p>}
          {os.unidade && <p><b>Unidade:</b> {os.unidade}</p>}
          {os.endereco && <p><b>Endereço:</b> {os.endereco}</p>}
        </div>

        {/* DATAS */}
        <p className="text-sm text-gray-600">
          Criado em: {new Date(os.createdAt).toLocaleDateString("pt-BR")} •
          Atualizado em: {new Date(os.updatedAt).toLocaleDateString("pt-BR")}
        </p>

        {/* DETALHAMENTO */}
        {os.detalhamento && (
          <div className="p-3 bg-yellow-50 border rounded">
            <b>Detalhamento:</b>
            <p>{os.detalhamento}</p>
          </div>
        )}

        {/* ANTES */}
        {os.antes && (
          <div className="border rounded p-4">
            <h2 className="font-bold mb-2">ANTES</h2>
            <p className="mb-2">
              <b>Relatório:</b> {os.antes.relatorio || "-"}
            </p>

            {os.antes.fotos?.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {os.antes.fotos.map((foto: string, i: number) => (
                  <img
                    key={i}
                    src={`data:image/jpeg;base64,${foto}`}
                    className="rounded border object-cover h-40 w-full"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* DEPOIS */}
        {os.depois && (
          <div className="border rounded p-4">
            <h2 className="font-bold mb-2">DEPOIS</h2>
            <p className="mb-2">
              <b>Relatório:</b> {os.depois.relatorio || "-"}
            </p>

            {os.depois.fotos?.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {os.depois.fotos.map((foto: string, i: number) => (
                  <img
                    key={i}
                    src={`data:image/jpeg;base64,${foto}`}
                    className="rounded border object-cover h-40 w-full"
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
