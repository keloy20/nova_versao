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
      console.log("OS RECEBIDA:", data); // <-- DEBUG REAL
      setOs(data);

      if (data.status === "concluido") {
        localStorage.removeItem(`os-step-${id}`);
      }
    } catch {
      setOs(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!os) return <div className="p-6">OS não encontrada</div>;

  const isConcluida = os.status === "concluido";

  // 🔒 LEITURA SEGURA (aceita qualquer backend)
  const antesTexto =
    os.antes?.observacao ||
    os.antes?.relatorio ||
    os.antes?.texto ||
    "";

  const depoisTexto =
    os.depois?.observacao ||
    os.depois?.relatorio ||
    os.depois?.texto ||
    "";

  const antesFotos = Array.isArray(os.antes?.fotos)
    ? os.antes.fotos
    : [];

  const depoisFotos = Array.isArray(os.depois?.fotos)
    ? os.depois.fotos
    : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 space-y-6">

        <div>
          <h1 className="text-2xl font-bold">
            OS {os.osNumero}
          </h1>
          <p className="text-sm text-gray-600">
            Status atual: <b>{os.status}</b>
          </p>
        </div>

        <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
          <p className="font-semibold">Cliente</p>
          <p>{os.cliente}</p>
          {os.subcliente && <p><b>Subcliente:</b> {os.subcliente}</p>}
          {os.endereco && <p><b>Endereço:</b> {os.endereco}</p>}
          {os.telefone && <p><b>Telefone:</b> {os.telefone}</p>}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-1">
            Descrição do serviço
          </p>
          <p className="whitespace-pre-line text-sm">
            {os.detalhamento || "—"}
          </p>
        </div>

        {isConcluida && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-green-700">
              Serviço concluído
            </h2>

            {/* ANTES */}
            <div>
              <p className="font-semibold mb-1">ANTES</p>
              <p className="text-sm mb-2 whitespace-pre-line">
                {antesTexto || "—"}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {antesFotos.map((foto: string, i: number) => (
                  <img
                    key={i}
                    src={
                      foto.startsWith("data:")
                        ? foto
                        : `data:image/jpeg;base64,${foto}`
                    }
                    className="h-32 w-full object-cover rounded"
                  />
                ))}
              </div>
            </div>

            {/* DEPOIS */}
            <div>
              <p className="font-semibold mb-1">DEPOIS</p>
              <p className="text-sm mb-2 whitespace-pre-line">
                {depoisTexto || "—"}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {depoisFotos.map((foto: string, i: number) => (
                  <img
                    key={i}
                    src={
                      foto.startsWith("data:")
                        ? foto
                        : `data:image/jpeg;base64,${foto}`
                    }
                    className="h-32 w-full object-cover rounded"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
