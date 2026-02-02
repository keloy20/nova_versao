"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://gerenciador-de-os.onrender.com";

export default function ServicoPage() {
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
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setOs(data);
    } catch {
      setOs(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!os) return <div className="p-6">OS não encontrada</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 space-y-6">

        {/* CABEÇALHO */}
        <div>
          <h1 className="text-2xl font-bold">OS {os.osNumero}</h1>
          <p className="text-sm text-gray-600">
            Status atual: <b>{os.status}</b>
          </p>
        </div>

        {/* DESCRIÇÃO DO ADM (PRINCIPAL) */}
        <div className="bg-blue-50 border rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-1">
            Descrição do serviço
          </p>
          <p className="whitespace-pre-line text-sm">
            {os.detalhamento || "—"}
          </p>
        </div>

        {/* BOTÕES */}
        <div className="flex gap-4">
          <button
            onClick={() =>
              router.push(`/tecnico/servicos/${id}/antes`)
            }
            className="flex-1 py-4 text-lg font-bold rounded-lg bg-blue-600 text-white"
          >
            ANTES
          </button>

          <button
            onClick={() =>
              router.push(`/tecnico/servicos/${id}/depois`)
            }
            className="flex-1 py-4 text-lg font-bold rounded-lg bg-green-600 text-white"
          >
            DEPOIS
          </button>
        </div>

        {/* ================= HISTÓRICO ================= */}

        {/* ANTES */}
        <div className="space-y-3 pt-4 border-t">
          <h2 className="text-lg font-bold">ANTES (registrado)</h2>

          <p className="font-semibold">Relatório inicial</p>
          <p className="text-sm whitespace-pre-line">
            {os.antes?.relatorio || "—"}
          </p>

          <p className="font-semibold">Observação inicial</p>
          <p className="text-sm whitespace-pre-line">
            {os.antes?.observacao || "—"}
          </p>

          {os.antes?.fotos?.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {os.antes.fotos.map((f: string, i: number) => (
                <img
                  key={i}
                  src={`data:image/jpeg;base64,${f}`}
                  className="h-32 w-full object-cover rounded"
                />
              ))}
            </div>
          )}
        </div>

        {/* DEPOIS */}
        <div className="space-y-3 pt-4 border-t">
          <h2 className="text-lg font-bold">DEPOIS (registrado)</h2>

          <p className="font-semibold">Relatório final</p>
          <p className="text-sm whitespace-pre-line">
            {os.depois?.relatorio || "—"}
          </p>

          <p className="font-semibold">Observação final</p>
          <p className="text-sm whitespace-pre-line">
            {os.depois?.observacao || "—"}
          </p>

          {os.depois?.fotos?.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {os.depois.fotos.map((f: string, i: number) => (
                <img
                  key={i}
                  src={`data:image/jpeg;base64,${f}`}
                  className="h-32 w-full object-cover rounded"
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
