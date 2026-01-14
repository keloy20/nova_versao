"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DepoisPage() {
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
  }, []);

  async function carregarOS() {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/tecnico/view/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao carregar OS");
      }

      setOs(data);
    } catch (err: any) {
      alert("Erro ao carregar OS: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const novas = Array.from(e.target.files);
    setFotos((prev) => [...prev, ...novas]);
  }

  function removerFoto(index: number) {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function salvarDepois() {
    setSalvando(true);

    try {
      const formData = new FormData();
      formData.append("relatorio", relatorio);
      formData.append("observacao", observacao);

      fotos.forEach((foto) => {
        formData.append("fotos", foto);
      });

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/tecnico/depois/${id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar DEPOIS");
      }

      alert("Serviço finalizado com sucesso!");

      // 🔥 VOLTA PRO DASHBOARD DO TÉCNICO
      router.push("/tecnico");

    } catch (err: any) {
      alert("Erro ao salvar DEPOIS: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!os) return <div className="p-6">OS não encontrada</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">

        <h1 className="text-2xl font-bold mb-4">DEPOIS – {os.osNumero}</h1>

        <div className="mb-4 text-sm">
          <p><b>Cliente:</b> {os.cliente}</p>
          {os.unidade && <p><b>Unidade:</b> {os.unidade}</p>}
          {os.endereco && <p><b>Endereço:</b> {os.endereco}</p>}
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Relatório final</label>
          <textarea
            value={relatorio}
            onChange={(e) => setRelatorio(e.target.value)}
            className="border p-2 rounded w-full min-h-[80px]"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Observações finais</label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="border p-2 rounded w-full min-h-[80px]"
          />
        </div>

        {/* FOTOS */}
        <div className="mb-4">
          <label className="block mb-2 font-medium">📷 Fotos finais</label>

          <label className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded cursor-pointer">
            Adicionar fotos
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={handleFotosChange}
            />
          </label>

          {fotos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              {fotos.map((foto, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(foto)}
                    className="rounded border object-cover h-32 w-full"
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
          )}
        </div>

        <button
          onClick={salvarDepois}
          disabled={salvando}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded w-full transition"
        >
          {salvando ? "Finalizando..." : "Finalizar serviço"}
        </button>

      </div>
    </div>
  );
}
