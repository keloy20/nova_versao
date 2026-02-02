"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://gerenciador-de-os.onrender.com";

export default function ServicoVisualizacaoPage() {
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

      // 🔁 REDIRECIONAMENTO AUTOMÁTICO
      if (data.status !== "concluido") {
        const step = localStorage.getItem(`os-step-${id}`);

        if (step === "depois") {
          router.replace(`/tecnico/servicos/${id}/depois`);
          return;
        }

        if (data.antes) {
          router.replace(`/tecnico/servicos/${id}/depois`);
          return;
        }

        router.replace(`/tecnico/servicos/${id}/antes`);
        return;
      }

    } catch {
      setOs(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!os) return <div className="p-6">OS não encontrada</div>;

  /* ================= VISUALIZAÇÃO (SÓ CONCLUÍDA) ================= */

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 space-y-6">

        <h1 className="text-2xl font-bold">
          OS {os.osNumero} — Concluída
        </h1>

        {/* ===== ANTES ===== */}
        <section>
          <h2 className="text-lg font-bold mb-2">ANTES</h2>

          <p className="font-semibold">Relatório inicial</p>
          <p className="whitespace-pre-line text-sm mb-2">
            {os.antes?.relatorio || "—"}
          </p>

          <p className="font-semibold">Observação inicial</p>
          <p className="whitespace-pre-line text-sm mb-4">
            {os.antes?.observacao || "—"}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {os.antes?.fotos?.map((f: string, i: number) => (
              <img
                key={i}
                src={`data:image/jpeg;base64,${f}`}
                className="h-32 w-full object-cover rounded"
              />
            ))}
          </div>
        </section>

        {/* ===== DEPOIS ===== */}
        <section>
          <h2 className="text-lg font-bold mb-2">DEPOIS</h2>

          <p className="font-semibold">Relatório final</p>
          <p className="whitespace-pre-line text-sm mb-2">
            {os.depois?.relatorio || "—"}
          </p>

          <p className="font-semibold">Observação final</p>
          <p className="whitespace-pre-line text-sm mb-4">
            {os.depois?.observacao || "—"}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {os.depois?.fotos?.map((f: string, i: number) => (
              <img
                key={i}
                src={`data:image/jpeg;base64,${f}`}
                className="h-32 w-full object-cover rounded"
              />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
