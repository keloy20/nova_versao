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

      // controle de etapa apenas se NÃO estiver concluída
      if (data.status === "aguardando_tecnico") {
        localStorage.setItem(`os-step-${id}`, "antes");
      }

      if (data.status === "em_andamento") {
        localStorage.setItem(`os-step-${id}`, "depois");
      }

      if (data.status === "concluido") {
        localStorage.removeItem(`os-step-${id}`);
      }
    } catch {
      setOs(null);
    } finally {
      setLoading(false);
    }
  }

  function irParaEtapa(etapa: "antes" | "depois") {
    router.push(`/tecnico/servicos/${id}/${etapa}`);
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!os) return <div className="p-6">OS não encontrada</div>;

  const isConcluida = os.status === "concluido";
  const podeIrDepois = os.status === "em_andamento";
  const isDASA = os.cliente?.toUpperCase() === "DASA";

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 space-y-6">

        {/* ================= CABEÇALHO ================= */}
        <div>
          <h1 className="text-2xl font-bold">
            OS {os.osNumero}
          </h1>

          <p className="text-sm text-gray-600">
            Status atual: <b>{os.status}</b>
          </p>
        </div>

        {/* ================= DADOS DO CLIENTE ================= */}
        <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
          <p className="font-semibold">Cliente</p>
          <p>{os.cliente}</p>

          {isDASA ? (
            <>
              {os.unidade && <p><b>Unidade:</b> {os.unidade}</p>}
              {os.marca && <p><b>Marca:</b> {os.marca}</p>}
            </>
          ) : (
            <>
              {(os.subcliente || os.subgrupo) && (
                <p>
                  <b>Subcliente:</b>{" "}
                  {os.subcliente || os.subgrupo}
                </p>
              )}
            </>
          )}

          {os.endereco && <p><b>Endereço:</b> {os.endereco}</p>}
          {os.telefone && <p><b>Telefone:</b> {os.telefone}</p>}
        </div>

        {/* ================= DESCRIÇÃO DO SERVIÇO ================= */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-1">
            Descrição do serviço
          </p>
          <p className="whitespace-pre-line text-sm">
            {os.detalhamento || "—"}
          </p>
        </div>

        {/* ================= VISUALIZAÇÃO FINAL (CONCLUÍDA) ================= */}
        {isConcluida && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-green-700">
              Serviço concluído
            </h2>

            {/* ===== ANTES ===== */}
            <div>
              <p className="font-semibold mb-1">ANTES</p>

              <p className="text-sm mb-2 whitespace-pre-line">
                {os.antes?.observacao || "—"}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {os.antes?.fotos?.map((foto: string, i: number) => (
                  <img
                    key={i}
                    src={`data:image/jpeg;base64,${foto}`}
                    className="h-32 w-full object-cover rounded"
                  />
                ))}
              </div>
            </div>

            {/* ===== DEPOIS ===== */}
            <div>
              <p className="font-semibold mb-1">DEPOIS</p>

              <p className="text-sm mb-2 whitespace-pre-line">
                {os.depois?.observacao || "—"}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {os.depois?.fotos?.map((foto: string, i: number) => (
                  <img
                    key={i}
                    src={`data:image/jpeg;base64,${foto}`}
                    className="h-32 w-full object-cover rounded"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= AÇÕES (NÃO CONCLUÍDA) ================= */}
        {!isConcluida && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => irParaEtapa("antes")}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded"
            >
              Ir para ANTES
            </button>

            <button
              onClick={() => irParaEtapa("depois")}
              disabled={!podeIrDepois}
              className={`py-3 rounded text-white ${
                podeIrDepois
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Ir para DEPOIS
            </button>

            {!podeIrDepois && (
              <p className="text-sm text-gray-500 text-center">
                ⚠️ Finalize o ANTES para liberar o DEPOIS
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
